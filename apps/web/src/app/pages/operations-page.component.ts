import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [JsonPipe],
  template: `
    <h1 class="page-title">Archive Statistics & Cleanup Monitoring</h1>
    <div class="toolbar">
      <button class="btn" (click)="run('completed')">Archive Completed</button>
      <button class="btn" (click)="run('failed')">Archive Failed</button>
      <button class="btn" (click)="run('suspended')">Archive Suspended</button>
      <button class="btn primary" (click)="runAll()">Run Schedulers</button>
    </div>
    <section class="panel output">
      <pre>{{ result() | json }}</pre>
    </section>
  `,
  styles: [
    `
      .output {
        padding: 16px;
      }

      pre {
        white-space: pre-wrap;
      }
    `,
  ],
})
export class OperationsPageComponent {
  result = signal<Record<string, unknown> | null>(null);

  constructor(private readonly api: ApiService) {}

  run(kind: 'completed' | 'failed' | 'suspended') {
    this.api.runArchive(kind).subscribe((result) => this.result.set(result));
  }

  runAll() {
    this.api.runSchedulers().subscribe((result) => this.result.set(result));
  }
}
