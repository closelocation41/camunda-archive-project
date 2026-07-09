import { DatePipe, JsonPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, SchedulerJob } from '../core/api.service';

@Component({
  standalone: true,
    imports: [DatePipe, FormsModule, JsonPipe],
      templateUrl: './operations-page.component.html',
        styleUrls: ['./operations-page.component.scss'],
        })
        
export class OperationsPageComponent implements OnInit, OnDestroy {
  jobs = signal<SchedulerJob[]>([]);
  selectedJob = signal<(SchedulerJob & { items: Array<Record<string, unknown>>; logs: Array<Record<string, unknown>> }) | null>(null);
  selectedJobItems = signal<Array<Record<string, unknown>>>([]);
  selectedJobLogs = signal<Array<Record<string, unknown>>>([]);
  result = signal<unknown>(null);
  eligibleWorkflowCount = signal<number | null>(null);
  autoRefreshEnabled = signal(false);
  page = signal(1);
  limit = signal(5);
  totalPages = signal(1);
  private refreshTimer?: ReturnType<typeof setInterval>;
  statusCounts = computed(() =>
    this.jobs().reduce<Record<string, number>>((counts, job) => {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
      return counts;
    }, {}),
  );

  form = {
    jobType: 'ARCHIVE_COMPLETED' as SchedulerJob['jobType'],
    workflowType: 'COMPLETED_TO_ARCHIVE' as SchedulerJob['workflowType'],
    rule: 'CURRENT' as SchedulerJob['rule'],
    jobName: 'Nightly completed workflow archive',
    scheduledStartTime: this.toLocalInputValue(new Date()),
    selectedWorkflowCount: 25,
    processingMode: 'SEQUENTIAL' as SchedulerJob['processingMode'],
  };

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      const jobId = params.get('jobId');
      if (jobId) {
        this.selectJob(jobId, false);
      } else if (!this.selectedJob()) {
        this.selectFirstJob();
      }
    });
    this.load();
    this.refreshEligibleCount();
    this.api.schedulerWorkflowStatus().subscribe((result) => this.result.set(result));
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  load() {
    this.api.schedulerJobs(this.page(), this.limit()).subscribe((response) => {
      const payload = Array.isArray(response) ? response : response.data;
      const total = Array.isArray(response) ? payload.length : response.total;
      this.jobs.set(payload);
      this.totalPages.set(Math.max(1, Math.ceil(total / this.limit())));
      if (!this.selectedJob() && payload[0]) {
        this.selectJob(payload[0].id, false);
      }
    });
  }

  createJob() {
    this.api
      .createSchedulerJob({
        ...this.form,
        scheduledStartTime: new Date(this.form.scheduledStartTime).toISOString(),
      })
      .subscribe((result) => {
        this.result.set(result);
        this.jobs.update((current) => [result as SchedulerJob, ...current]);
        this.load();
        this.refreshEligibleCount();
      });
  }

  refreshEligibleCount() {
    this.api.schedulerPreviewCount(this.form.jobType, this.form.workflowType, this.form.rule).subscribe((response) => {
      this.eligibleWorkflowCount.set(response.eligibleWorkflowCount);
      this.form.selectedWorkflowCount = Math.min(this.form.selectedWorkflowCount, response.eligibleWorkflowCount);
    });
  }

  canCreateJob() {
    const eligible = this.eligibleWorkflowCount();
    return eligible === null || this.form.selectedWorkflowCount <= eligible;
  }

  toggleAutoRefresh() {
    this.autoRefreshEnabled.set(!this.autoRefreshEnabled());
    if (this.autoRefreshEnabled()) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  changePage(nextPage: number) {
    this.page.set(Math.max(1, nextPage));
    this.load();
  }

  selectJob(id: string, navigate = true) {
    this.api.schedulerJob(id).subscribe((job) => {
      this.selectedJob.set(job);
      this.selectedJobItems.set((job.items ?? []) as Array<Record<string, unknown>>);
      this.selectedJobLogs.set((job.logs ?? []) as Array<Record<string, unknown>>);
      if (navigate) {
        this.router.navigate([], { queryParams: { jobId: id }, queryParamsHandling: 'merge' });
      }
    });
  }

  private selectFirstJob() {
    const first = this.jobs()[0];
    if (first) {
      this.selectJob(first.id, false);
    }
  }

  private startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => this.refreshSelectedJob(), 1000);
  }

  private stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  private refreshSelectedJob() {
    const selected = this.selectedJob();
    if (selected?.id) {
      this.api.schedulerJob(selected.id).subscribe((job) => {
        this.selectedJob.set(job);
        this.selectedJobItems.set((job.items ?? []) as Array<Record<string, unknown>>);
        this.selectedJobLogs.set((job.logs ?? []) as Array<Record<string, unknown>>);
      });
    }
  }

  run(kind: 'completed' | 'failed' | 'suspended') {
    this.api.runArchive(kind).subscribe((result) => this.result.set(result));
  }

  runAll() {
    this.api.runSchedulers().subscribe((result) => this.result.set(result));
  }

  runJob(job: SchedulerJob) {
    this.api.runSchedulerJob(job.id).subscribe((result) => {
      this.result.set(result);
      this.load();
      this.selectJob(job.id, false);
    });
  }

  retryJob(job: SchedulerJob) {
    this.api.retrySchedulerJob(job.id).subscribe((result) => {
      this.result.set(result);
      this.load();
      this.selectJob(job.id, false);
    });
  }

  cancelJob(job: SchedulerJob) {
    this.api.cancelSchedulerJob(job.id).subscribe((result) => {
      this.result.set(result);
      this.load();
      this.selectJob(job.id, false);
    });
  }

  deleteJob(job: SchedulerJob) {
    if (!confirm(`Delete scheduler job "${job.jobName}"?`)) {
      return;
    }
    this.api.deleteSchedulerJob(job.id).subscribe((result) => {
      this.result.set(result);
      this.load();
    });
  }

  countByStatus(status: SchedulerJob['status']) {
    return this.statusCounts()[status] ?? 0;
  }

  progress(job: SchedulerJob) {
    if (job.percentageCompleted !== undefined) {
      return Number(job.percentageCompleted);
    }
    const total = job.selectedWorkflowCount || job.completedCount + job.failedCount + job.inProgressCount + job.pendingCount;
    return total ? Math.round(((job.completedCount + job.failedCount) / total) * 100) : 0;
  }

  label(jobType: SchedulerJob['jobType']) {
    return jobType.replace('ARCHIVE_', '');
  }

  private toLocalInputValue(date: Date) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}
