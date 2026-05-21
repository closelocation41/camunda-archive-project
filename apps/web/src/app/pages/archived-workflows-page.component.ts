import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <h1 class="page-title">Archived Workflows</h1>
    <div class="toolbar">
      <input [(ngModel)]="search" placeholder="Search instance, business key, definition" />
      <select [(ngModel)]="state">
        <option value="">All states</option>
        <option value="COMPLETED">Completed</option>
        <option value="FAILED">Failed</option>
        <option value="SUSPENDED">Suspended</option>
      </select>
      <button class="btn primary" (click)="load()">Search</button>
    </div>
    <section class="panel table-wrap">
      <table class="table">
        <tr><th>Instance</th><th>Definition</th><th>Business Key</th><th>Started</th><th>Ended</th><th>Hierarchy</th></tr>
        @for (row of rows(); track row['proc_inst_id_']) {
          <tr>
            <td><a [routerLink]="['/workflow', row['proc_inst_id_']]">{{ row['proc_inst_id_'] }}</a></td>
            <td>{{ row['proc_def_key_'] }}</td>
            <td>{{ row['business_key_'] || '-' }}</td>
            <td>{{ row['start_time_'] }}</td>
            <td>{{ row['end_time_'] || '-' }}</td>
            <td>{{ row['super_process_instance_id_'] || row['root_proc_inst_id_'] || '-' }}</td>
          </tr>
        }
      </table>
    </section>
  `,
  styles: [
    `
      input,
      select {
        border: 1px solid var(--line);
        border-radius: 6px;
        padding: 10px 12px;
      }

      input {
        min-width: min(440px, 100%);
      }
    `,
  ],
})
export class ArchivedWorkflowsPageComponent implements OnInit {
  rows = signal<Array<Record<string, unknown>>>([]);
  search = '';
  state = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.archived(this.search, this.state).subscribe((response) => this.rows.set(response.data));
  }
}
