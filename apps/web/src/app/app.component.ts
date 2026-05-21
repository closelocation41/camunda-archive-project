import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from './core/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <span class="mark">CA</span>
          <div>
            <strong>Camunda Archive</strong>
            <small>Workflow Operations</small>
          </div>
        </div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/workflows/running" routerLinkActive="active">Running Workflows</a>
          <a routerLink="/workflows/completed" routerLinkActive="active">Completed Workflows</a>
          <a routerLink="/workflows/failed" routerLinkActive="active">Failed Workflows</a>
          <a routerLink="/archive" routerLinkActive="active">Archived Workflows</a>
          <a routerLink="/incidents" routerLinkActive="active">Incident Monitoring</a>
          <a routerLink="/restore" routerLinkActive="active">Restore Workflow</a>
          <a routerLink="/operations" routerLinkActive="active">Cleanup Monitoring</a>
          <details class="nav-dropdown">
            <summary>Documents</summary>
            <a href="/assets/docs/README.md" target="_blank" rel="noreferrer">README</a>
            <a href="/assets/docs/ARCHITECTURE.md" target="_blank" rel="noreferrer">Architecture</a>
            <a href="/assets/docs/API.md" target="_blank" rel="noreferrer">API Guide</a>
            <a href="/assets/docs/OPERATIONS.md" target="_blank" rel="noreferrer">Operations</a>
            <a href="/assets/docs/RESTORE_DESIGN.md" target="_blank" rel="noreferrer">Re-sync Design</a>
            <a href="http://localhost:3000/api/docs" target="_blank" rel="noreferrer">Swagger UI</a>
            <a href="http://localhost:3000/api/docs-json" target="_blank" rel="noreferrer">Swagger JSON</a>
          </details>
          <span class="nav-label">External Tools</span>
          <a href="http://localhost:8080" target="_blank" rel="noreferrer">Camunda UI</a>
          <a href="http://localhost:3001" target="_blank" rel="noreferrer">Grafana</a>
          <a href="http://localhost:9090" target="_blank" rel="noreferrer">Prometheus</a>
          <a href="http://localhost:8081/?pgsql=archive-db&username=archive&db=camunda_archive" target="_blank" rel="noreferrer">
            Archive Database
          </a>
          <a href="http://localhost:8081/?pgsql=camunda-db&username=camunda&db=camunda" target="_blank" rel="noreferrer">
            Camunda Database
          </a>
        </nav>
      </aside>
      <main class="content">
        <header>
          <div>
            <strong>{{ api.user()?.username || 'Not signed in' }}</strong>
            <span>{{ api.user()?.roles?.join(', ') || 'Login required' }}</span>
          </div>
          <a class="btn" routerLink="/login">Account</a>
        </header>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 280px minmax(0, 1fr);
      }

      .sidebar {
        background: #10242b;
        color: #f7fbfc;
        padding: 24px 18px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 28px;
      }

      .mark {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        background: #1f7a76;
        border-radius: 8px;
        font-weight: 800;
      }

      small,
      header span {
        display: block;
        color: #9fb5bd;
        font-size: 12px;
      }

      nav {
        display: grid;
        gap: 6px;
      }

      .nav-label {
        margin: 18px 12px 4px;
        color: #8fb0ba;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      nav a {
        padding: 10px 12px;
        border-radius: 6px;
        color: #dbe8ec;
      }

      .nav-dropdown {
        display: grid;
        gap: 6px;
      }

      .nav-dropdown summary {
        padding: 10px 12px;
        border-radius: 6px;
        color: #dbe8ec;
        cursor: pointer;
      }

      .nav-dropdown summary:hover,
      .nav-dropdown[open] summary {
        background: #1c3941;
        color: #ffffff;
      }

      .nav-dropdown a {
        margin-left: 14px;
        padding-block: 8px;
        font-size: 14px;
      }

      nav a.active,
      nav a:hover {
        background: #1c3941;
        color: #ffffff;
      }

      .content {
        min-width: 0;
        padding: 22px;
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      @media (max-width: 900px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .sidebar {
          position: static;
        }

        nav {
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        }
      }
    `,
  ],
})
export class AppComponent {
  constructor(public readonly api: ApiService) {}
}
