import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  templateUrl: './workflow-list-page.component.html',
  styleUrls: ['./workflow-list-page.component.scss'],
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
