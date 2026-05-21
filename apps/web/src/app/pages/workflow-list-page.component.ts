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
        @for (row of rows(); track row['id']) {
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
              @if (row['archived']) {
                <button class="btn" (click)="resyncOne(id(row))">Re-sync</button>
              } @else {
                <button class="btn primary" (click)="archiveOne(row)">Archive</button>
              }
            </td>
          </tr>
        }
      </table>
    </section>
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
    `,
  ],
})
export class WorkflowListPageComponent implements OnInit {
  rows = signal<Array<Record<string, unknown>>>([]);
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
