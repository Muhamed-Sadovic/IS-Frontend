import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth'; // PAZI NA PUTANJU OVDE
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html', // Proveri ime fajla
})
export class Register {
  noviKorisnik = {
    ime: '',
    prezime: '',
    email: '',
    lozinka: '',
    uloga: 1, // Podrazumevano Pacijent
  };

  constructor(private authService: AuthService, private router: Router) {}

  potvrdiRegistraciju() {
    this.authService.register(this.noviKorisnik).subscribe({
      next: (res) => {
        alert('Uspešna registracija! Sada se možete ulogovati.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        alert('Greška pri registraciji. Proverite polja.');
      },
    });
  }
}
