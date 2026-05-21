import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  template: `
    <h1 class="page-title">Incident Monitoring</h1>
    <section class="panel table-wrap">
      <table class="table">
        <tr><th>Incident</th><th>Process</th><th>Activity</th><th>Type</th><th>Message</th><th>Time</th></tr>
        @for (row of rows(); track row['id']) {
          <tr>
            <td>{{ row['id'] }}</td>
            <td>{{ row['processInstanceId'] }}</td>
            <td>{{ row['activityId'] || row['failedActivityId'] }}</td>
            <td><span class="badge">{{ row['incidentType'] }}</span></td>
            <td>{{ row['incidentMessage'] }}</td>
            <td>{{ row['incidentTimestamp'] }}</td>
          </tr>
        }
      </table>
    </section>
  `,
})
export class IncidentsPageComponent implements OnInit {
  rows = signal<Array<Record<string, unknown>>>([]);

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.api.incidents().subscribe((rows) => this.rows.set(rows));
  }
}
