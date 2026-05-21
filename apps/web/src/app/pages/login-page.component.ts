import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-title">Account</h1>
    <section class="panel login">
      <label>Username <input [(ngModel)]="username" /></label>
      <label>Password <input [(ngModel)]="password" type="password" /></label>
      <button class="btn primary" (click)="login()">Sign in</button>
      @if (message()) {
        <p>{{ message() }}</p>
      }
    </section>
  `,
  styles: [
    `
      .login {
        max-width: 420px;
        display: grid;
        gap: 14px;
        padding: 18px;
      }

      label {
        display: grid;
        gap: 6px;
        color: var(--muted);
      }

      input {
        border: 1px solid var(--line);
        border-radius: 6px;
        padding: 10px 12px;
      }
    `,
  ],
})
export class LoginPageComponent {
  username = 'admin';
  password = 'admin';
  message = signal('');

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
  ) {}

  login() {
    this.api.login(this.username, this.password).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: () => this.message.set('Sign in failed'),
    });
  }
}
