import { Component, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, JsonPipe],
  template: `
    <h1 class="page-title">Restore Workflow Page</h1>
    <section class="panel form">
      <label>Original process instance ID <input [(ngModel)]="processInstanceId" /></label>
      <label>Restore reason <textarea [(ngModel)]="reason"></textarea></label>
      <label class="check"><input type="checkbox" [(ngModel)]="includeChildren" /> Restore child workflows</label>
      <button class="btn primary" (click)="restore()">Restore</button>
      @if (result(); as value) {
        <pre>{{ value | json }}</pre>
      }
    </section>
  `,
  styles: [
    `
      .form {
        max-width: 760px;
        display: grid;
        gap: 14px;
        padding: 18px;
      }

      label {
        display: grid;
        gap: 6px;
        color: var(--muted);
      }

      .check {
        display: flex;
        align-items: center;
      }

      input,
      textarea {
        border: 1px solid var(--line);
        border-radius: 6px;
        padding: 10px 12px;
      }

      textarea {
        min-height: 110px;
      }
    `,
  ],
})
export class RestorePageComponent {
  processInstanceId = '';
  reason = '';
  includeChildren = true;
  result = signal<Record<string, unknown> | null>(null);

  constructor(private readonly api: ApiService) {}

  restore() {
    this.api.restore(this.processInstanceId, this.reason, this.includeChildren).subscribe((result) => this.result.set(result));
  }
}
