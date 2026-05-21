import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1 class="page-title">{{ title() }}</h1>
    <section class="panel table-wrap">
      <table class="table">
        <tr><th>Instance</th><th>Definition</th><th>Business Key</th><th>Start</th><th>End</th><th>Status</th></tr>
        @for (row of rows(); track row['id']) {
          <tr>
            <td><a [routerLink]="['/workflow', row['id']]">{{ row['id'] }}</a></td>
            <td>{{ row['processDefinitionKey'] || row['processDefinitionId'] }}</td>
            <td>{{ row['businessKey'] || '-' }}</td>
            <td>{{ row['startTime'] }}</td>
            <td>{{ row['endTime'] || '-' }}</td>
            <td><span class="badge">{{ row['state'] || kind() }}</span></td>
          </tr>
        }
      </table>
    </section>
  `,
})
export class WorkflowListPageComponent implements OnInit {
  rows = signal<Array<Record<string, unknown>>>([]);
  title = signal('Workflows');
  kind = signal<'running' | 'completed' | 'failed'>('running');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService,
  ) {}

  ngOnInit() {
    this.route.data.subscribe((data) => {
      this.title.set(String(data['title']));
      this.kind.set(data['kind'] as 'running' | 'completed' | 'failed');
      this.api.workflows(this.kind()).subscribe((rows) => this.rows.set(rows));
    });
  }
}
