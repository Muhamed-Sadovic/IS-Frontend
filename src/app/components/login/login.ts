import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth'; // Putanja do tvog auth.ts
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  korisnik = {
    email: '',
    lozinka: '',
  };
  currentYear = new Date().getFullYear();

  constructor(private authService: AuthService, private router: Router) {}

  prijaviSe() {
    console.log('Pokušaj prijave:', this.korisnik);

    this.authService.login(this.korisnik).subscribe({
      next: (res) => {
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        console.error(err);
        alert('Neispravan email ili lozinka.');
      },
    });
  }
}
