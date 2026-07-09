import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
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
