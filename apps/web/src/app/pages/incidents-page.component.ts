import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  templateUrl: './incidents-page.component.html',
  styleUrls: ['./incidents-page.component.scss'],
})
export class IncidentsPageComponent implements OnInit {
  rows = signal<Array<Record<string, unknown>>>([]);

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.api.incidents().subscribe((rows) => this.rows.set(rows));
  }
}
