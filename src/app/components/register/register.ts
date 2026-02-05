import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  noviKorisnik = {
    ime: '',
    prezime: '',
    email: '',
    lozinka: '',
    uloga: 1, // Pacijent
  };

  prikaziVerifikaciju: boolean = false;
  uneseniKod: string = '';
  currentYear = new Date().getFullYear();
  otpCode: string[] = ['', '', '', ''];

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  potvrdiRegistraciju() {
    this.authService.register(this.noviKorisnik).subscribe({
      next: (res) => {
        this.prikaziVerifikaciju = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert(err.error || 'Greška pri registraciji. Proverite polja.');
      },
    });
  }

  moveFocus(event: any, index: number) {
    const input = event.target as HTMLInputElement;
    const val = input.value;

    if (val && index < 3) {
      const nextInput = input.nextElementSibling as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }

    if (event.key === 'Backspace' && !val && index > 0) {
      const prevInput = input.previousElementSibling as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  }

  potvrdiKod() {
  const kod = this.otpCode.join('');

  if (kod.length < 4) {
    alert('Unesite ceo kod.');
    return;
  }

  const podaci = { Email: this.noviKorisnik.email, Kod: kod };

  this.http.post('https://localhost:7075/api/account/verify', podaci).subscribe({
    next: () => {
      alert('Čestitamo! Vaš nalog je sada aktivan.');
      this.router.navigate(['/login']);
    },
    error: (err) => alert(err.error || 'Pogrešan kod, pokušajte ponovo.')
  });
}
}
