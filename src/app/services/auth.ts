import { HttpClient } from '@angular/common/http';
import { Injectable, signal, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/account';
  private http = inject(HttpClient);
  private router = inject(Router);

  // Signal koji prati da li je korisnik ulogovan
  isLoggedIn = signal<boolean>(!!localStorage.getItem('token'));

  // Metoda koju pozivaš iz login komponente
  login(podaci: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, podaci).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          this.isLoggedIn.set(true); // <--- OVO osvežava Header odmah!
        }
      })
    );
  }

  // Metoda za odjavu
  logout() {
    localStorage.removeItem('token');
    this.isLoggedIn.set(false); // <--- OVO vraća Login/Register u Header
    this.router.navigate(['/login']);
  }

  register(podaci: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, podaci);
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/svi-korisnici`);
  }
}