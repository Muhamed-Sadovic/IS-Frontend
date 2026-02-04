import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface MeResponse {
  id: number;
  ime: string;
  prezime: string;
  email: string;
  uloga: 'Admin' | 'Stomatolog' | 'Pacijent' | string;
}

export interface UpdateMeRequest {
  ime: string;
  prezime: string;
}

export interface ChangePasswordRequest {
  staraLozinka: string;
  novaLozinka: string;
  potvrdaNove: string;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  // stavi tvoj backend url
  private readonly baseUrl = '/api/account';

  constructor(private http: HttpClient) {}

  getMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.baseUrl}/me`);
  }

  updateMe(dto: UpdateMeRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/me`, dto, { withCredentials: true });
  }

  changePassword(dto: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/password`, dto, { withCredentials: true });
  }
}
