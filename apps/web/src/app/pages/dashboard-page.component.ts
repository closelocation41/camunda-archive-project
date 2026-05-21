import { Component, OnInit, signal } from '@angular/core';
import { ApiService, DashboardSummary } from '../core/api.service';

@Component({
  standalone: true,
  template: `
    <h1 class="page-title">Dashboard</h1>
    @if (summary(); as data) {
      <section class="stats">
        <article class="panel"><span>Active</span><strong>{{ data.counts.active }}</strong></article>
        <article class="panel"><span>Completed</span><strong>{{ data.counts.completed }}</strong></article>
        <article class="panel"><span>Failed</span><strong>{{ data.counts.failed }}</strong></article>
        <article class="panel"><span>Archived</span><strong>{{ data.counts.archived }}</strong></article>
      </section>
      <section class="grid">
        <article class="panel block">
          <h2>Top Failed Workflows</h2>
          <div class="table-wrap">
            <table class="table">
              <tr><th>Definition</th><th>Failures</th></tr>
              @for (row of data.topFailedWorkflows; track row['proc_def_key_']) {
                <tr><td>{{ row['proc_def_key_'] }}</td><td>{{ row['failures'] }}</td></tr>
              }
            </table>
          </div>
        </article>
        <article class="panel block">
          <h2>Workflow Trends</h2>
          <div class="trend">
            @for (row of data.workflowTrends; track row['bucket']) {
              <span [style.height.%]="bar(row['total'])" [title]="row['bucket'] + ': ' + row['total']"></span>
            }
          </div>
        </article>
      </section>
    }
  `,
  styles: [
    `
      .stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(160px, 1fr));
        gap: 14px;
        margin-bottom: 18px;
      }

      .stats article {
        padding: 16px;
      }

      .stats span {
        color: var(--muted);
      }

      .stats strong {
        display: block;
        margin-top: 8px;
        font-size: 30px;
      }

      .grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 18px;
      }

      .block {
        padding: 16px;
      }

      h2 {
        margin: 0 0 12px;
        font-size: 16px;
      }

      .trend {
        height: 260px;
        display: flex;
        align-items: end;
        gap: 6px;
        padding-top: 20px;
      }

      .trend span {
        flex: 1;
        min-height: 8px;
        background: var(--accent);
        border-radius: 4px 4px 0 0;
      }

      @media (max-width: 1000px) {
        .stats,
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardPageComponent implements OnInit {
  summary = signal<DashboardSummary | null>(null);

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.api.dashboard().subscribe((summary) => this.summary.set(summary));
  }

  bar(total: unknown) {
    const value = Number(total) || 1;
    return Math.min(100, Math.max(8, value * 8));
  }
}
