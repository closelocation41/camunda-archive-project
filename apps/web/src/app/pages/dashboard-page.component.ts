import { Component, OnInit, signal } from '@angular/core';
import { ApiService, DashboardSummary } from '../core/api.service';

@Component({
  standalone: true,
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
})
export class DashboardPageComponent implements OnInit {
  summary = signal<DashboardSummary | null>(null);

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.api.dashboard().subscribe((summary) => this.summary.set(summary));
  }

  bar(total: unknown) {
    const value = Number(total) || 1;
    return Math.min(100, Math.max(8, value * 8));
  }
}
