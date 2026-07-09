import { Component, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, JsonPipe],
  templateUrl: './restore-page.component.html',
  styleUrls: ['./restore-page.component.scss'],
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
