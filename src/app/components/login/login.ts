import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  korisnik = {
    email: '',
    lozinka: '',
  };
  currentYear = new Date().getFullYear();

  constructor(private authService: AuthService, private router: Router) {}

  prijaviSe() {
    if (!this.korisnik.email || !this.korisnik.lozinka) {
      Swal.fire({
        icon: 'warning',
        title: 'Nedostaju podaci',
        text: 'Molimo vas unesite email i lozinku.',
        confirmButtonColor: '#0d6efd'
      });
      return;
    }

    this.authService.login(this.korisnik).subscribe({
      next: (res) => {
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });

        Toast.fire({
          icon: 'success',
          title: 'Uspešna prijava!'
        });
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        console.error(err);
        
        Swal.fire({
          icon: 'error',
          title: 'Neuspešna prijava',
          text: 'Neispravan email ili lozinka.',
          confirmButtonColor: '#d33',
          footer: '<a href="/forgot-password">Zaboravili ste lozinku?</a>'
        });
      },
    });
  }
}
