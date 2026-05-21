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
      <button class="btn primary" (click)="searchArchive()">Search</button>
      <label class="select-all">
        <input type="checkbox" [checked]="allSelected()" (change)="toggleAll($any($event.target).checked)" />
        Select all
      </label>
      <button class="btn" [disabled]="selectedCount() === 0" (click)="resyncSelected()">Re-sync selected</button>
      <span>{{ selectedCount() }} selected</span>
      @if (message()) {
        <strong>{{ message() }}</strong>
      }
    </div>
    <section class="panel table-wrap">
      <table class="table">
        <tr><th></th><th>Instance</th><th>Definition</th><th>Business Key</th><th>Started</th><th>Ended</th><th>Hierarchy</th><th>Action</th></tr>
        @for (row of rows(); track row['proc_inst_id_']) {
          <tr>
            <td>
              <input type="checkbox" [checked]="isSelected(id(row))" (change)="toggle(id(row), $any($event.target).checked)" />
            </td>
            <td><a [routerLink]="['/workflow', row['proc_inst_id_']]">{{ row['proc_inst_id_'] }}</a></td>
            <td>{{ row['proc_def_key_'] }}</td>
            <td>{{ row['business_key_'] || '-' }}</td>
            <td>{{ row['start_time_'] }}</td>
            <td>{{ row['end_time_'] || '-' }}</td>
            <td>{{ row['super_process_instance_id_'] || row['root_proc_inst_id_'] || '-' }}</td>
            <td><button class="btn" (click)="resync(row)">Re-sync</button></td>
          </tr>
        }
      </table>
    </section>
    <div class="pagination">
      <button class="btn" [disabled]="page() === 1" (click)="previousPage()">Previous</button>
      <span>Page {{ page() }} of {{ totalPages() }}</span>
      <button class="btn" [disabled]="page() === totalPages()" (click)="nextPage()">Next</button>
    </div>
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

      .select-all {
        display: inline-flex;
        gap: 8px;
        align-items: center;
      }

      .btn[disabled] {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .pagination {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: flex-end;
        margin-top: 14px;
      }
    `,
  ],
})
export class ArchivedWorkflowsPageComponent implements OnInit {
  readonly pageSize = 10;
  rows = signal<Array<Record<string, unknown>>>([]);
  selected = signal<Set<string>>(new Set());
  total = signal(0);
  page = signal(1);
  message = signal('');
  search = '';
  state = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.selected.set(new Set());
    this.api.archived(this.search, this.state, this.page(), this.pageSize).subscribe((response) => {
      this.rows.set(response.data);
      this.total.set(response.total);
    });
  }

  searchArchive() {
    this.page.set(1);
    this.load();
  }

  id(row: Record<string, unknown>) {
    return String(row['proc_inst_id_']);
  }

  isSelected(id: string) {
    return this.selected().has(id);
  }

  selectedCount() {
    return this.selected().size;
  }

  allSelected() {
    return this.rows().length > 0 && this.rows().every((row) => this.selected().has(this.id(row)));
  }

  toggle(id: string, checked: boolean) {
    const next = new Set(this.selected());
    checked ? next.add(id) : next.delete(id);
    this.selected.set(next);
  }

  toggleAll(checked: boolean) {
    this.selected.set(checked ? new Set(this.rows().map((row) => this.id(row))) : new Set());
  }

  totalPages() {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  previousPage() {
    this.page.set(Math.max(1, this.page() - 1));
    this.load();
  }

  nextPage() {
    this.page.set(Math.min(this.totalPages(), this.page() + 1));
    this.load();
  }

  resync(row: Record<string, unknown>) {
    this.resyncIds([this.id(row)]);
  }

  resyncSelected() {
    this.resyncIds([...this.selected()]);
  }

  private resyncIds(processInstanceIds: string[]) {
    if (!processInstanceIds.length) {
      return;
    }
    this.message.set('Re-syncing...');
    this.api.restoreBatch(processInstanceIds, 'Operator requested re-sync from archived workflow list', true).subscribe({
      next: () => {
        this.message.set('Re-sync completed');
        this.load();
      },
      error: () => this.message.set('Re-sync failed'),
    });
  }
}
