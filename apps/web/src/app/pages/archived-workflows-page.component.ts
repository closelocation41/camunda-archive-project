import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';

export function normalizeArchivedResponse(response: unknown) {
  if (Array.isArray(response)) {
    return { data: response as Array<Record<string, unknown>>, total: response.length };
  }

  if (response && typeof response === 'object' && 'data' in response) {
    const payload = response as { data?: Array<Record<string, unknown>>; total?: number };
    return {
      data: Array.isArray(payload.data) ? payload.data : [],
      total: typeof payload.total === 'number' ? payload.total : 0,
    };
  }

  return { data: [], total: 0 };
}

export function buildWorkflowTree(rows: Array<Record<string, unknown>>) {
  const flattened: Array<Record<string, unknown>> = [];
  const childrenByParent = new Map<string, Array<Record<string, unknown>>>();

  rows.forEach((row) => {
    const parentId = parentProcessInstanceId(row);
    const key = parentId ? String(parentId) : '__root__';
    const list = childrenByParent.get(key) ?? [];
    list.push(row);
    childrenByParent.set(key, list);
  });

  const visit = (row: Record<string, unknown>, depth: number) => {
    flattened.push({ ...row, depth });
    const childRows = childrenByParent.get(String(row['proc_inst_id_'])) ?? [];
    childRows.forEach((child) => visit(child, depth + 1));
  };

  rows.filter((row) => !parentProcessInstanceId(row)).forEach((row) => visit(row, 0));
  return flattened;
}

function parentProcessInstanceId(row: Record<string, unknown>) {
  const raw = row['super_process_instance_id_'] ?? row['root_proc_inst_id_'] ?? row['parentProcessInstanceId'];
  return raw ? String(raw) : null;
}

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
  flattenedRows = signal<Array<Record<string, unknown>>>([]);
  message = signal('');
  loading = signal(false);
  search = '';
  state = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.selected.set(new Set());
    this.loading.set(true);
    try {
      const response = await firstValueFrom(this.api.archived(this.search, this.state, this.page(), this.pageSize));
      const normalized = normalizeArchivedResponse(response);
      this.rows.set(normalized.data);
      this.total.set(normalized.total);
      this.flattenedRows.set(buildWorkflowTree(normalized.data));
    } finally {
      this.loading.set(false);
    }
  }

  searchArchive() {
    this.page.set(1);
    void this.load();
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
    return this.flattenedRows().length > 0 && this.flattenedRows().every((row) => this.isRootRow(row) ? this.selected().has(this.id(row)) : true);
  }

  toggle(id: string, checked: boolean) {
    const next = new Set(this.selected());
    checked ? next.add(id) : next.delete(id);
    this.selected.set(next);
  }

  toggleAll(checked: boolean) {
    const roots = this.flattenedRows().filter((row) => this.isRootRow(row)).map((row) => this.id(row));
    this.selected.set(checked ? new Set(roots) : new Set());
  }

  isRootRow(row: Record<string, unknown>) {
    return !row['super_process_instance_id_'] && !row['root_proc_inst_id_'];
  }

  rowDepth(row: Record<string, unknown>) {
    return Number(row['depth'] ?? 0);
  }

  totalPages() {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  previousPage() {
    this.page.set(Math.max(1, this.page() - 1));
    void this.load();
  }

  nextPage() {
    this.page.set(Math.min(this.totalPages(), this.page() + 1));
    void this.load();
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
      next: async () => {
        this.message.set('Re-sync completed');
        await this.load();
      },
      error: () => this.message.set('Re-sync failed'),
    });
  }
}
