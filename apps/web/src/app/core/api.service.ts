import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

export interface DashboardSummary {
  counts: { active: number; completed: number; failed: number; archived: number };
  topFailedWorkflows: Array<Record<string, unknown>>;
  workflowTrends: Array<Record<string, unknown>>;
  cleanupStatistics: Array<Record<string, unknown>>;
}

export interface SchedulerJob {
  id: string;
  jobType: 'ARCHIVE_COMPLETED' | 'ARCHIVE_FAILED' | 'ARCHIVE_SUSPENDED';
  workflowType?: 'COMPLETED_TO_ARCHIVE' | 'ARCHIVE_TO_COMPLETE';
  rule?: 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL';
  jobName: string;
  scheduledStartTime: string;
  selectedWorkflowCount: number;
  processingMode: 'SEQUENTIAL' | 'PARALLEL';
  status: 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL' | 'CANCELED';
  completedCount: number;
  failedCount: number;
  inProgressCount: number;
  pendingCount: number;
  retryCount: number;
  eligibleWorkflowCount?: number;
  lastErrorMessage?: string;
  percentageCompleted?: number;
}

export interface SchedulerJobsResponse {
  data: SchedulerJob[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = '/api';
  readonly user = signal<{ username: string; roles: string[] } | null>(this.readUser());

  constructor(private readonly http: HttpClient) {}

  login(username: string, password: string) {
    return this.http.post<{ accessToken: string; user: { username: string; roles: string[] } }>(`${this.baseUrl}/auth/login`, { username, password }).pipe(
      tap((response) => {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.user.set(response.user);
      }),
    );
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    this.user.set(null);
  }

  dashboard(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.baseUrl}/analytics/dashboard`);
  }

  workflows(kind: 'running' | 'completed' | 'failed') {
    return this.http.get<Array<Record<string, unknown>>>(`${this.baseUrl}/workflows/${kind}`);
  }

  archived(search = '', state = '', page = 1, limit = 10) {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) {
      params = params.set('search', search);
    }
    if (state) {
      params = params.set('state', state);
    }
    return this.http.get<{ data: Array<Record<string, unknown>>; total: number }>(`${this.baseUrl}/archive/workflows`, { params });
  }

  archivedDetail(id: string) {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/archive/workflows/${id}`);
  }

  incidents() {
    return this.http.get<Array<Record<string, unknown>>>(`${this.baseUrl}/incidents`);
  }

  bpmnExecution(id: string) {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/bpmn-viewer/${id}/execution`);
  }

  restore(processInstanceId: string, reason: string, includeChildren: boolean) {
    return this.http.post<Record<string, unknown>>(`${this.baseUrl}/restore/workflow`, { processInstanceId, reason, includeChildren });
  }

  restoreBatch(processInstanceIds: string[], reason: string, includeChildren: boolean) {
    return this.http.post<Record<string, unknown>>(`${this.baseUrl}/restore/workflows`, { processInstanceIds, reason, includeChildren });
  }

  runArchive(kind: 'completed' | 'failed' | 'suspended') {
    return this.http.post<Record<string, unknown>>(`${this.baseUrl}/archive/run/${kind}`, {});
  }

  archiveSelected(mode: 'COMPLETED' | 'FAILED', processInstanceIds: string[]) {
    return this.http.post<Record<string, unknown>>(`${this.baseUrl}/archive/run/selected`, { mode, processInstanceIds });
  }

  runSchedulers() {
    return this.http.post<Record<string, unknown>>(`${this.baseUrl}/scheduler/run-all`, {});
  }

  schedulerJobs(page = 1, limit = 5) {
    return this.http.get<SchedulerJobsResponse | SchedulerJob[]>(`${this.baseUrl}/scheduler/jobs`, { params: { page, limit } });
  }

  schedulerJob(id: string) {
    return this.http.get<SchedulerJob & { items: Array<Record<string, unknown>>; logs: Array<Record<string, unknown>> }>(`${this.baseUrl}/scheduler/jobs/${id}`);
  }

  createSchedulerJob(payload: {
    jobType: SchedulerJob['jobType'];
    workflowType?: SchedulerJob['workflowType'];
    rule?: SchedulerJob['rule'];
    jobName: string;
    scheduledStartTime: string;
    selectedWorkflowCount: number;
    processingMode: SchedulerJob['processingMode'];
  }) {
    return this.http.post<SchedulerJob>(`${this.baseUrl}/scheduler/jobs`, payload);
  }

  runSchedulerJob(id: string) {
    return this.http.post<Record<string, unknown>>(`${this.baseUrl}/scheduler/jobs/${id}/run`, {});
  }

  retrySchedulerJob(id: string) {
    return this.http.post<Record<string, unknown>>(`${this.baseUrl}/scheduler/jobs/${id}/retry`, {});
  }

  cancelSchedulerJob(id: string) {
    return this.http.post<Record<string, unknown>>(`${this.baseUrl}/scheduler/jobs/${id}/cancel`, {});
  }

  deleteSchedulerJob(id: string) {
    return this.http.delete<Record<string, unknown>>(`${this.baseUrl}/scheduler/jobs/${id}`);
  }

  schedulerPreviewCount(jobType: SchedulerJob['jobType'], workflowType: SchedulerJob['workflowType'], rule: SchedulerJob['rule']) {
    const params = new HttpParams()
      .set('jobType', jobType)
      .set('workflowType', workflowType ?? 'COMPLETED_TO_ARCHIVE')
      .set('rule', rule ?? 'CURRENT');
    return this.http.get<{ eligibleWorkflowCount: number }>(`${this.baseUrl}/scheduler/preview-count`, { params });
  }

  schedulerWorkflowStatus() {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/scheduler/workflow-status`);
  }

  private readUser() {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as { username: string; roles: string[] }) : null;
  }
}
