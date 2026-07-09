import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './archived-workflows-page.component.html',
  styleUrls: ['./archived-workflows-page.component.scss'],
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
