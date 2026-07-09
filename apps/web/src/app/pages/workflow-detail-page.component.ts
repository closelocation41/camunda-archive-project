import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  templateUrl: './workflow-detail-page.component.html',
  styleUrls: ['./workflow-detail-page.component.scss'],
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
