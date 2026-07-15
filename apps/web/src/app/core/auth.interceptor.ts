import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, firstValueFrom, from, map, of, switchMap } from 'rxjs';

let authBootstrapPromise: Promise<string | null> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }

  if (req.url.includes('/auth/login')) {
    return next(req);
  }

  const http = inject(HttpClient);
  return from(getOrCreateDemoToken(http)).pipe(
    switchMap((resolvedToken) => {
      if (!resolvedToken) {
        return next(req);
      }
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${resolvedToken}` } }));
    }),
  );
};

async function getOrCreateDemoToken(http: HttpClient): Promise<string | null> {
  if (authBootstrapPromise) {
    return authBootstrapPromise;
  }

  authBootstrapPromise = firstValueFrom(
    http.post<{ accessToken: string; user: { username: string; roles: string[] } }>('/api/auth/login', { username: 'viewer', password: 'viewer' }).pipe(
      map((response) => {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('user', JSON.stringify(response.user));
        return response.accessToken;
      }),
      catchError(() => of(null)),
    ),
  );

  return authBootstrapPromise;
}
