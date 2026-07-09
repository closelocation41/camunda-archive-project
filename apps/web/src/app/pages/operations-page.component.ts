import { DatePipe, JsonPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, SchedulerJob } from '../core/api.service';

@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, JsonPipe],
  template: `
    <div class="page-head">
      <div>
        <h1 class="page-title">Job Scheduler</h1>
        <p>Camunda 7 archive workflow orchestration</p>
      </div>
      <button class="btn primary" (click)="runAll()">Run Schedulers</button>
    </div>

    <section class="scheduler-grid">
      <form class="panel job-form" (ngSubmit)="createJob()">
        <div class="form-head">
          <strong>Schedule Archive Job</strong>
          <span class="badge">{{ form.processingMode }}</span>
        </div>

        <label>
          Job type
          <select name="jobType" [(ngModel)]="form.jobType" (change)="refreshEligibleCount()">
            <option value="ARCHIVE_COMPLETED">Completed workflow archive</option>
            <option value="ARCHIVE_FAILED">Failed workflow archive</option>
            <option value="ARCHIVE_SUSPENDED">Suspended workflow archive</option>
          </select>
        </label>

        <div class="form-row">
          <label>
            Workflow type
            <select name="workflowType" [(ngModel)]="form.workflowType" (change)="refreshEligibleCount()">
              <option value="COMPLETED_TO_ARCHIVE">Archive workflow to archive DB</option>
              <option value="ARCHIVE_TO_COMPLETE">Restore archived workflow to Camunda</option>
            </select>
          </label>
          <label>
            Rule
            <select name="rule" [(ngModel)]="form.rule" (change)="refreshEligibleCount()">
              <option value="CURRENT">Current</option>
              <option value="LAST_7_DAYS">Last 7 days</option>
              <option value="LAST_30_DAYS">Last 30 days</option>
              <option value="ALL">All</option>
            </select>
          </label>
        </div>

        <label>
          Job name
          <input name="jobName" [(ngModel)]="form.jobName" placeholder="Nightly completed archive" />
        </label>

        <div class="form-row">
          <label>
            Scheduler
            <input name="scheduledStartTime" type="datetime-local" [(ngModel)]="form.scheduledStartTime" />
          </label>
          <label>
            Status details count
            <input name="selectedWorkflowCount" type="number" min="1" [max]="eligibleWorkflowCount() ?? 500" [(ngModel)]="form.selectedWorkflowCount" />
            @if (eligibleWorkflowCount() !== null) {
              <small class="hint" [class.danger]="!canCreateJob()">Eligible workflows for this rule: {{ eligibleWorkflowCount() }}</small>
            }
          </label>
        </div>

        <div class="segmented" role="group" aria-label="Processing mode">
          <button type="button" [class.active]="form.processingMode === 'SEQUENTIAL'" (click)="form.processingMode = 'SEQUENTIAL'">Sequential</button>
          <button type="button" [class.active]="form.processingMode === 'PARALLEL'" (click)="form.processingMode = 'PARALLEL'">Parallel</button>
        </div>

        <button class="btn primary wide" type="submit" [disabled]="!canCreateJob()">Create Job</button>
      </form>

      <section class="panel details-panel">
        <div class="section-head">
          <strong>Selected Job Details</strong>
          <div class="toolbar">
            <button class="btn toggle-btn" type="button" [class.active]="autoRefreshEnabled()" (click)="toggleAutoRefresh()">
              {{ autoRefreshEnabled() ? 'Auto-refresh on' : 'Auto-refresh off' }}
            </button>
            <span class="badge" [class.live]="autoRefreshEnabled()">{{ autoRefreshEnabled() ? 'Live' : 'Paused' }}</span>
          </div>
        </div>

        @if (selectedJob(); as job) {
          <div class="details-shell">
            <div class="details-overview">
              <div class="detail-stat">
                <span>Job</span>
                <strong>{{ job.jobName }}</strong>
              </div>
              <div class="detail-stat">
                <span>Status</span>
                <strong class="status-value" [class.ok]="job.status === 'COMPLETED'" [class.warn]="job.status === 'PARTIAL'" [class.danger]="job.status === 'FAILED'">{{ job.status }}</strong>
              </div>
              <div class="detail-stat">
                <span>Workflow</span>
                <strong>{{ job.workflowType || 'COMPLETED_TO_ARCHIVE' }}</strong>
              </div>
              <div class="detail-stat">
                <span>Rule</span>
                <strong>{{ job.rule || 'CURRENT' }}</strong>
              </div>
            </div>

            <div class="progress-card">
              <div class="progress-meta">
                <span>Progress</span>
                <strong>{{ progress(job) }}%</strong>
              </div>
              <div class="meter large"><span [style.width.%]="progress(job)"></span></div>
              <div class="counts large">
                <span>{{ job.completedCount || 0 }} completed</span>
                <span>{{ job.failedCount || 0 }} failed</span>
                <span>{{ job.inProgressCount || 0 }} running</span>
                <span>{{ job.pendingCount || 0 }} pending</span>
              </div>
            </div>

            <div class="log-card">
              <div class="card-header">
                <strong>Recent logs</strong>
                <span>{{ selectedJobLogs().length }} entries</span>
              </div>
              <div class="list-scroll">
                <ul>
                  @for (log of selectedJobLogs(); track log['attemptNumber']) {
                    <li class="list-item">
                      <div class="list-title">{{ log['status'] }} · attempt {{ log['attemptNumber'] }}</div>
                      <div class="list-subtitle">{{ log['errorMessage'] || 'No errors reported.' }}</div>
                    </li>
                  } @empty {
                    <li class="empty-state">No logs yet.</li>
                  }
                </ul>
              </div>
            </div>

            <div class="log-card">
              <div class="card-header">
                <strong>Workflow items</strong>
                <span>{{ selectedJobItems().length }} items</span>
              </div>
              <div class="list-scroll">
                <ul>
                  @for (item of selectedJobItems(); track item['processInstanceId']) {
                    <li class="list-item">
                      <div class="list-title">{{ item['processInstanceId'] }}</div>
                      <div class="list-subtitle">{{ item['status'] }} · retries {{ item['retryCount'] }}</div>
                    </li>
                  } @empty {
                    <li class="empty-state">No workflow items yet.</li>
                  }
                </ul>
              </div>
            </div>
          </div>
        } @else {
          <div class="empty-state large">Select a job to view live progress and logs.</div>
        }
      </section>
    </section>

    <section class="stats">
      <article class="panel"><span>Scheduled</span><strong>{{ countByStatus('SCHEDULED') }}</strong></article>
      <article class="panel"><span>Running</span><strong>{{ countByStatus('RUNNING') }}</strong></article>
      <article class="panel"><span>Completed</span><strong>{{ countByStatus('COMPLETED') }}</strong></article>
      <article class="panel"><span>Failed</span><strong>{{ countByStatus('FAILED') }}</strong></article>
      <article class="panel"><span>Canceled</span><strong>{{ countByStatus('CANCELED') }}</strong></article>
    </section>

    <section class="panel jobs">
      <div class="section-head">
        <strong>Scheduler Jobs</strong>
        <button class="btn" (click)="load()">Refresh</button>
      </div>
      <div class="table-wrap">
        <table class="table">
          <tr>
            <th>Job type</th>
            <th>Job name</th>
            <th>Scheduler</th>
            <th>Mode</th>
            <th>Status details count</th>
            <th>Status</th>
            <th></th>
          </tr>
          @for (job of jobs(); track job.id) {
            <tr (click)="selectJob(job.id)" class="job-row">
              <td><span class="type-chip">{{ label(job.jobType) }}</span></td>
              <td>
                <strong>{{ job.jobName }}</strong>
                @if (job.lastErrorMessage) {
                  <small>{{ job.lastErrorMessage }}</small>
                }
              </td>
              <td>{{ job.scheduledStartTime | date: 'medium' }}</td>
              <td>{{ job.processingMode }}</td>
              <td>
                <div class="counts">
                  <span>{{ job.completedCount || 0 }} done</span>
                  <span>{{ job.inProgressCount || 0 }} active</span>
                  <span>{{ job.failedCount || 0 }} failed</span>
                  <span>{{ job.pendingCount || 0 }} pending</span>
                </div>
                <div class="meter"><span [style.width.%]="progress(job)"></span></div>
              </td>
              <td><span class="badge" [class.warn]="job.status === 'PARTIAL'" [class.danger]="job.status === 'FAILED'" [class.ok]="job.status === 'COMPLETED'">{{ job.status }}</span></td>
              <td class="actions" (click)="$event.stopPropagation()">
                <button class="icon-action run-action" type="button" aria-label="Run job" title="Run job" data-tooltip="Run" (click)="runJob(job)">
                  <span aria-hidden="true">&#9654;</span>
                </button>
                <button class="icon-action retry-action" type="button" aria-label="Retry job" title="Retry job" data-tooltip="Retry" (click)="retryJob(job)">
                  <span aria-hidden="true">&#8635;</span>
                </button>
                @if (job.status === 'RUNNING' || job.status === 'SCHEDULED') {
                  <button class="icon-action cancel-action" type="button" aria-label="Cancel job" title="Cancel job" data-tooltip="Cancel" (click)="cancelJob(job)">
                    <span aria-hidden="true">&#10005;</span>
                  </button>
                }
                <button class="icon-action delete-action" type="button" aria-label="Delete job" title="Delete job" data-tooltip="Delete" (click)="deleteJob(job)">
                  <span aria-hidden="true">&#128465;</span>
                </button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="empty">No scheduler jobs yet.</td></tr>
          }
        </table>
      </div>
      <div class="pager">
        <button class="btn" [disabled]="page() <= 1" (click)="changePage(page() - 1)">Previous</button>
        <span>Page {{ page() }} / {{ totalPages() }}</span>
        <button class="btn" [disabled]="page() >= totalPages()" (click)="changePage(page() + 1)">Next</button>
      </div>
    </section>

    <section class="panel output">
      <strong>Last Operation</strong>
      <pre>{{ result() | json }}</pre>
    </section>
  `,
  styles: [
    `
      .page-head,
      .section-head,
      .form-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .page-head {
        margin-bottom: 16px;
      }

      .page-head p {
        margin: 4px 0 0;
        color: var(--muted);
      }

      .scheduler-grid {
        display: grid;
        grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
        gap: 18px;
        margin-bottom: 18px;
      }

      .job-form,
      .flow-card,
      .jobs,
      .output {
        padding: 16px;
      }

      .panel {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: #ffffff;
        box-shadow: 0 10px 30px rgba(16, 36, 43, 0.06);
      }

      .job-form {
        display: grid;
        gap: 14px;
        align-content: start;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 7px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 700;
        min-width: 0;
      }

      input,
      select {
        width: 100%;
        min-height: 44px;
        box-sizing: border-box;
        border: 1px solid var(--line);
        border-radius: 6px;
        padding: 10px 11px;
        color: var(--text);
        background: #ffffff;
      }

      .form-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        align-items: start;
      }

      .segmented {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        border: 1px solid var(--line);
        border-radius: 6px;
        overflow: hidden;
      }

      .segmented button {
        border: 0;
        padding: 10px;
        background: #ffffff;
        cursor: pointer;
      }

      .segmented button.active {
        background: var(--accent-strong);
        color: #ffffff;
      }

      .wide {
        justify-content: center;
      }

      .flow-card {
        display: grid;
        align-content: space-between;
        gap: 20px;
        background: linear-gradient(135deg, #ffffff 0%, #eef8f6 48%, #fff7ed 100%);
      }

      .flow-title {
        display: grid;
        grid-template-columns: auto 1fr auto 1fr auto 1fr auto;
        align-items: center;
        gap: 10px;
      }

      .flow-node {
        min-height: 44px;
        display: grid;
        place-items: center;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 8px 10px;
        background: #ffffff;
        font-weight: 800;
        white-space: nowrap;
      }

      .flow-node.active {
        background: var(--accent);
        border-color: var(--accent);
        color: #ffffff;
      }

      .flow-line {
        height: 2px;
        background: #8ab8b6;
      }

      .flow-detail strong,
      .flow-detail span {
        display: block;
      }

      .flow-detail span {
        margin-top: 6px;
        color: var(--muted);
      }

      .quick-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(5, minmax(140px, 1fr));
        gap: 14px;
        margin-bottom: 18px;
      }

      .stats article {
        padding: 14px;
      }

      .stats span {
        color: var(--muted);
      }

      .stats strong {
        display: block;
        margin-top: 6px;
        font-size: 28px;
      }

      .jobs {
        margin-bottom: 18px;
      }

      .job-row {
        cursor: pointer;
      }

      .job-row:hover {
        background: #f7fbfb;
      }

      .pager {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
        color: var(--muted);
      }

      .details-panel {
        display: flex;
        flex-direction: column;
        gap: 14px;
        background: linear-gradient(135deg, #f8fdff 0%, #fefcf8 100%);
        border: none;
        box-shadow: none;
        padding: 18px;
      }

      .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .toggle-btn {
        border: 1px solid var(--line);
        background: #ffffff;
      }

      .toggle-btn.active {
        background: var(--accent-strong);
        color: #ffffff;
        border-color: var(--accent-strong);
      }

      .badge.live {
        background: #ecfdf3;
        color: var(--ok);
      }

      .details-shell {
        display: grid;
        gap: 12px;
      }

      .details-overview {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .detail-stat {
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.76);
        border: 1px solid rgba(14, 49, 57, 0.08);
      }

      .detail-stat span {
        display: block;
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 4px;
      }

      .detail-stat strong {
        display: block;
        font-size: 14px;
      }

      .status-value.ok {
        color: var(--ok);
      }

      .status-value.warn {
        color: var(--warn);
      }

      .status-value.danger {
        color: var(--danger);
      }

      .progress-card,
      .log-card {
        padding: 12px;
        border-radius: 12px;
        background: #ffffff;
        border: 1px solid rgba(14, 49, 57, 0.08);
      }

      .progress-meta,
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        gap: 8px;
      }

      .progress-meta span,
      .card-header span {
        color: var(--muted);
        font-size: 12px;
      }

      .meter.large {
        height: 10px;
        margin-top: 4px;
      }

      .counts.large {
        margin-top: 10px;
        font-size: 13px;
      }

      .list-scroll {
        max-height: 220px;
        overflow: auto;
        padding-right: 4px;
      }

      .list-scroll ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .list-item {
        padding: 8px 0;
        border-bottom: 1px solid rgba(14, 49, 57, 0.08);
      }

      .list-item:last-child {
        border-bottom: none;
      }

      .list-title {
        font-weight: 700;
        margin-bottom: 3px;
      }

      .list-subtitle {
        color: var(--muted);
        font-size: 12px;
      }

      .type-chip {
        display: inline-flex;
        border-radius: 6px;
        padding: 5px 8px;
        background: #edf4ff;
        color: #1849a9;
        font-size: 12px;
        font-weight: 800;
      }

      td small {
        display: block;
        margin-top: 4px;
        color: var(--danger);
      }

      .counts {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        color: var(--muted);
        font-size: 12px;
      }

      .meter {
        height: 7px;
        margin-top: 8px;
        border-radius: 999px;
        background: #edf2f7;
        overflow: hidden;
      }

      .meter span {
        display: block;
        height: 100%;
        background: var(--accent);
      }

      .badge.ok {
        background: #ecfdf3;
        color: var(--ok);
      }

      .badge.warn {
        background: #fffaeb;
        color: var(--warn);
      }

      .badge.danger {
        background: #fef3f2;
        color: var(--danger);
      }

      .actions {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
        align-items: center;
      }

      .icon-action {
        position: relative;
        width: 34px;
        height: 34px;
        display: inline-grid;
        place-items: center;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: #ffffff;
        color: var(--text);
        cursor: pointer;
        transition:
          transform 150ms ease,
          box-shadow 150ms ease,
          border-color 150ms ease,
          background 150ms ease;
      }

      .icon-action span {
        line-height: 1;
        font-size: 15px;
        font-weight: 900;
      }

      .icon-action:hover,
      .icon-action:focus-visible {
        transform: translateY(-1px);
        box-shadow: 0 8px 18px rgba(16, 36, 43, 0.12);
        outline: none;
      }

      .icon-action::after {
        content: attr(data-tooltip);
        position: absolute;
        left: 50%;
        bottom: calc(100% + 8px);
        transform: translateX(-50%) translateY(4px);
        opacity: 0;
        pointer-events: none;
        border-radius: 5px;
        padding: 4px 7px;
        background: #10242b;
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
        transition:
          opacity 150ms ease,
          transform 150ms ease;
      }

      .icon-action::before {
        content: '';
        position: absolute;
        left: 50%;
        bottom: calc(100% + 3px);
        transform: translateX(-50%) translateY(4px);
        opacity: 0;
        border: 5px solid transparent;
        border-top-color: #10242b;
        pointer-events: none;
        transition:
          opacity 150ms ease,
          transform 150ms ease;
      }

      .icon-action:hover::after,
      .icon-action:hover::before,
      .icon-action:focus-visible::after,
      .icon-action:focus-visible::before {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      .run-action {
        border-color: #9bd4cf;
        color: var(--accent);
        background: #edf8f6;
      }

      .retry-action {
        border-color: #b9c7ff;
        color: #1849a9;
        background: #edf4ff;
      }

      .cancel-action {
        border-color: #fedf89;
        color: var(--warn);
        background: #fffaeb;
      }

      .delete-action {
        border-color: #fecdca;
        color: var(--danger);
        background: #fef3f2;
      }

      .hint {
        display: block;
        color: var(--muted);
        font-size: 12px;
        font-weight: 600;
      }

      .hint.danger {
        color: var(--danger);
      }

      .empty {
        color: var(--muted);
        text-align: center;
      }

      .empty-state {
        color: var(--muted);
        text-align: center;
        padding: 16px 8px;
      }

      .empty-state.large {
        padding: 28px 12px;
        font-size: 15px;
      }

      pre {
        white-space: pre-wrap;
      }

      @media (max-width: 1100px) {
        .scheduler-grid,
        .stats {
          grid-template-columns: 1fr;
        }

        .details-overview {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .flow-title {
          grid-template-columns: 1fr;
        }

        .flow-line {
          display: none;
        }
      }

      @media (max-width: 680px) {
        .page-head,
        .form-row {
          grid-template-columns: 1fr;
        }

        .page-head,
        .section-head,
        .form-head {
          align-items: stretch;
          flex-direction: column;
        }
      }
    `,
  ],
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
