import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Proveri port u VS 2022, ako nije 7075, izmeni ga ovde
  private apiUrl = 'https://localhost:7075/api/Account';

  constructor(private http: HttpClient) { }

  login(podaci: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, podaci);
  }

  register(podaci: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, podaci);
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/svi-korisnici`);
  }
}