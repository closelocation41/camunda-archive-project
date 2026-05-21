import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  template: `
    <h1 class="page-title">Workflow Timeline Viewer</h1>
    @if (bundle(); as data) {
      <section class="detail-grid">
        <article class="panel block">
          <h2>BPMN Execution</h2>
          <pre>{{ bpmn()?.['bpmnXml'] || 'BPMN XML unavailable for this archived process definition.' }}</pre>
        </article>
        <article class="panel block">
          <h2>Parent-Child Workflow Viewer</h2>
          <p><strong>Root:</strong> {{ process(data)?.['root_proc_inst_id_'] || '-' }}</p>
          <p><strong>Parent:</strong> {{ process(data)?.['super_process_instance_id_'] || '-' }}</p>
          <p><strong>Definition:</strong> {{ process(data)?.['proc_def_key_'] || '-' }}</p>
        </article>
      </section>
      <section class="panel block">
        <h2>Execution Timeline</h2>
        <div class="timeline">
          @for (activity of activities(data); track activity['id_']) {
            <div [class.failed]="isFailed(activity)">
              <span></span>
              <strong>{{ activity['act_name_'] || activity['act_id_'] }}</strong>
              <small>{{ activity['act_type_'] }} · {{ activity['start_time_'] }} → {{ activity['end_time_'] || 'open' }}</small>
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      .detail-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
        gap: 18px;
        margin-bottom: 18px;
      }

      .block {
        padding: 16px;
      }

      h2 {
        margin: 0 0 12px;
        font-size: 16px;
      }

      pre {
        max-height: 420px;
        overflow: auto;
        white-space: pre-wrap;
        font-size: 12px;
        background: #f1f5f9;
        padding: 12px;
        border-radius: 6px;
      }

      .timeline {
        display: grid;
        gap: 12px;
      }

      .timeline div {
        display: grid;
        grid-template-columns: 14px 1fr;
        column-gap: 10px;
      }

      .timeline span {
        width: 12px;
        height: 12px;
        margin-top: 4px;
        border-radius: 50%;
        background: var(--ok);
      }

      .timeline .failed span {
        background: var(--danger);
      }

      .timeline small {
        grid-column: 2;
        color: var(--muted);
      }

      @media (max-width: 1000px) {
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class WorkflowDetailPageComponent implements OnInit {
  bundle = signal<Record<string, unknown> | null>(null);
  bpmn = signal<Record<string, unknown> | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.archivedDetail(id).subscribe((bundle) => this.bundle.set(bundle));
    this.api.bpmnExecution(id).subscribe((bundle) => this.bpmn.set(bundle));
  }

  process(data: Record<string, unknown>) {
    return data['process'] as Record<string, unknown> | undefined;
  }

  activities(data: Record<string, unknown>) {
    return (data['activities'] as Array<Record<string, unknown>> | undefined) ?? [];
  }

  isFailed(activity: Record<string, unknown>) {
    const failed = (this.bpmn()?.['failedActivities'] as unknown[] | undefined) ?? [];
    return failed.includes(activity['act_id_']);
  }
}
