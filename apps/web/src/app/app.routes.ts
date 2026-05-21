import { Routes } from '@angular/router';
import { DashboardPageComponent } from './pages/dashboard-page.component';
import { WorkflowListPageComponent } from './pages/workflow-list-page.component';
import { ArchivedWorkflowsPageComponent } from './pages/archived-workflows-page.component';
import { WorkflowDetailPageComponent } from './pages/workflow-detail-page.component';
import { RestorePageComponent } from './pages/restore-page.component';
import { IncidentsPageComponent } from './pages/incidents-page.component';
import { OperationsPageComponent } from './pages/operations-page.component';
import { LoginPageComponent } from './pages/login-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginPageComponent },
  { path: 'dashboard', component: DashboardPageComponent },
  { path: 'workflows/running', component: WorkflowListPageComponent, data: { kind: 'running', title: 'Running Workflows' } },
  { path: 'workflows/completed', component: WorkflowListPageComponent, data: { kind: 'completed', title: 'Completed Workflows' } },
  { path: 'workflows/failed', component: WorkflowListPageComponent, data: { kind: 'failed', title: 'Failed Workflows' } },
  { path: 'archive', component: ArchivedWorkflowsPageComponent },
  { path: 'workflow/:id', component: WorkflowDetailPageComponent },
  { path: 'restore', component: RestorePageComponent },
  { path: 'incidents', component: IncidentsPageComponent },
  { path: 'operations', component: OperationsPageComponent },
];
