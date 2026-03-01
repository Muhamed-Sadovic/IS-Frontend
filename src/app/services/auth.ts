import { HttpClient } from '@angular/common/http';
import { Injectable, signal, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = '/api/account';
  private http = inject(HttpClient);
  private router = inject(Router);

  isLoggedIn = signal<boolean>(!!localStorage.getItem('token'));

  login(podaci: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, podaci).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          this.isLoggedIn.set(true);
        }
      }),
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }

  register(podaci: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, podaci);
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/svi-korisnici`);
  }
}
