import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1 class="page-title">{{ title() }}</h1>
    @if (isArchivableList()) {
      <div class="toolbar actions">
        <label class="select-all">
          <input type="checkbox" [checked]="allSelected()" (change)="toggleAll($any($event.target).checked)" />
          Select all
        </label>
        <button class="btn primary" [disabled]="archiveTargets().length === 0" (click)="archiveSelected()">
          Archive selected
        </button>
        <button class="btn" [disabled]="resyncTargets().length === 0" (click)="resyncSelected()">
          Re-sync selected
        </button>
        <span>{{ selectedCount() }} selected</span>
        @if (message()) {
          <strong>{{ message() }}</strong>
        }
      </div>
    }
    <section class="panel table-wrap">
      <table class="table">
        <tr>
          @if (isArchivableList()) {
            <th></th>
          }
          <th>Instance</th>
          <th>Definition</th>
          <th>Business Key</th>
          <th>Start</th>
          <th>End</th>
          <th>Archive</th>
          <th>Action</th>
        </tr>
        @for (row of visibleRows(); track row['id']) {
          <tr>
            @if (isArchivableList()) {
              <td>
                <input type="checkbox" [checked]="isSelected(id(row))" (change)="toggle(id(row), $any($event.target).checked)" />
              </td>
            }
            <td><a [routerLink]="['/workflow', row['id']]">{{ row['id'] }}</a></td>
            <td>{{ row['processDefinitionKey'] || row['processDefinitionId'] }}</td>
            <td>{{ row['businessKey'] || '-' }}</td>
            <td>{{ row['startTime'] }}</td>
            <td>{{ row['endTime'] || '-' }}</td>
            <td>
              @if (row['archived']) {
                <span class="badge archived">Archived</span>
              } @else {
                <span class="badge pending">Not archived</span>
              }
            </td>
            <td class="row-actions">
              <a class="btn" [routerLink]="['/workflow', row['id']]">Open</a>
              @if (isArchivableList()) {
                @if (row['archived']) {
                  <button class="btn" (click)="resyncOne(id(row))">Re-sync</button>
                } @else {
                  <button class="btn primary" (click)="archiveOne(row)">Archive</button>
                }
              }
            </td>
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
      .actions {
        padding: 12px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
      }

      .select-all {
        display: inline-flex;
        gap: 8px;
        align-items: center;
      }

      .row-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .btn[disabled] {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .badge.archived {
        background: #e6f4f1;
        color: var(--ok);
      }

      .badge.pending {
        background: #fff4e5;
        color: var(--warn);
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
export class WorkflowListPageComponent implements OnInit {
  readonly pageSize = 10;
  rows = signal<Array<Record<string, unknown>>>([]);
  page = signal(1);
  title = signal('Workflows');
  kind = signal<'running' | 'completed' | 'failed'>('running');
  selected = signal<Set<string>>(new Set());
  message = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService,
  ) {}

  ngOnInit() {
    this.route.data.subscribe((data) => {
      this.title.set(String(data['title']));
      this.kind.set(data['kind'] as 'running' | 'completed' | 'failed');
      this.load();
    });
  }

  load() {
    this.selected.set(new Set());
    this.page.set(1);
    this.api.workflows(this.kind()).subscribe((rows) => this.rows.set(rows));
  }

  id(row: Record<string, unknown>) {
    return String(row['id']);
  }

  isArchivableList() {
    return this.kind() === 'completed' || this.kind() === 'failed';
  }

  isSelected(id: string) {
    return this.selected().has(id);
  }

  selectedCount() {
    return this.selected().size;
  }

  allSelected() {
    return this.visibleRows().length > 0 && this.visibleRows().every((row) => this.selected().has(this.id(row)));
  }

  toggle(id: string, checked: boolean) {
    const next = new Set(this.selected());
    checked ? next.add(id) : next.delete(id);
    this.selected.set(next);
  }

  toggleAll(checked: boolean) {
    const next = new Set(this.selected());
    for (const row of this.visibleRows()) {
      checked ? next.add(this.id(row)) : next.delete(this.id(row));
    }
    this.selected.set(next);
  }

  visibleRows() {
    const start = (this.page() - 1) * this.pageSize;
    return this.rows().slice(start, start + this.pageSize);
  }

  totalPages() {
    return Math.max(1, Math.ceil(this.rows().length / this.pageSize));
  }

  previousPage() {
    this.page.set(Math.max(1, this.page() - 1));
  }

  nextPage() {
    this.page.set(Math.min(this.totalPages(), this.page() + 1));
  }

  archiveTargets() {
    return this.rows()
      .filter((row) => this.selected().has(this.id(row)) && !row['archived'])
      .map((row) => this.id(row));
  }

  resyncTargets() {
    return this.rows()
      .filter((row) => this.selected().has(this.id(row)) && row['archived'])
      .map((row) => this.id(row));
  }

  archiveOne(row: Record<string, unknown>) {
    this.archiveIds([this.id(row)]);
  }

  archiveSelected() {
    this.archiveIds(this.archiveTargets());
  }

  resyncOne(processInstanceId: string) {
    this.resyncIds([processInstanceId]);
  }

  resyncSelected() {
    this.resyncIds(this.resyncTargets());
  }

  private archiveIds(ids: string[]) {
    if (!ids.length) {
      return;
    }
    const mode = this.kind() === 'failed' ? 'FAILED' : 'COMPLETED';
    this.message.set('Archiving...');
    this.api.archiveSelected(mode, ids).subscribe({
      next: () => {
        this.message.set('Archive completed');
        this.load();
      },
      error: () => this.message.set('Archive failed'),
    });
  }

  private resyncIds(ids: string[]) {
    if (!ids.length) {
      return;
    }
    this.message.set('Re-syncing...');
    this.api.restoreBatch(ids, 'Operator requested re-sync from workflow list', true).subscribe({
      next: () => {
        this.message.set('Re-sync started');
        this.load();
      },
      error: () => this.message.set('Re-sync failed'),
    });
  }
}
