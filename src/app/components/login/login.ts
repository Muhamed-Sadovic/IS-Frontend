import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth'; // Putanja do tvog auth.ts
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html'
})
export class Login {
  korisnik = {
    email: '',
    lozinka: ''
  };

  constructor(private authService: AuthService, private router: Router) {}

  prijaviSe() {
    console.log('Pokušaj prijave:', this.korisnik);
    
    this.authService.login(this.korisnik).subscribe({
      next: (res) => {
        console.log('Uspešan login! Odgovor sa servera:', res);
        
        // 1. Sačuvajmo token ili ID korisnika u memoriju browsera (da znamo ko je ulogovan)
        localStorage.setItem('korisnikId', res.id); 
        localStorage.setItem('uloga', res.uloga);

        alert('Dobrodošli nazad!');
        
        // 2. Prebaci korisnika na Dashboard (napravićemo ga u sledećem koraku)
        this.router.navigate(['/dashboard']); 
      },
      error: (err) => {
        console.error('Greška pri prijavi:', err);
        alert('Neispravni podaci ili nalog ne postoji!');
      }
    });
  }
}