import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

export interface DashboardSummary {
  counts: { active: number; completed: number; failed: number; archived: number };
  topFailedWorkflows: Array<Record<string, unknown>>;
  workflowTrends: Array<Record<string, unknown>>;
  cleanupStatistics: Array<Record<string, unknown>>;
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

  archived(search = '', state = '') {
    let params = new HttpParams().set('page', 1).set('limit', 100);
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

  private readUser() {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as { username: string; roles: string[] }) : null;
  }
}
