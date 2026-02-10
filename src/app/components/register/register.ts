import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  noviKorisnik = {
    ime: '',
    prezime: '',
    email: '',
    lozinka: '',
    uloga: 1,
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
    if (
      !this.noviKorisnik.ime ||
      !this.noviKorisnik.prezime ||
      !this.noviKorisnik.email ||
      !this.noviKorisnik.lozinka
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Greška',
        text: 'Sva polja su obavezna!',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }
    if (!this.noviKorisnik.email.includes('@')) {
      Swal.fire({
        icon: 'error',
        title: 'Neispravan Email',
        text: 'Molimo vas unesite validnu email adresu.',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }
    if (this.noviKorisnik.lozinka.length < 6) {
      Swal.fire({
        icon: 'info',
        title: 'Slaba lozinka',
        text: 'Lozinka mora imati bar 6 karaktera.',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }

    this.authService.register(this.noviKorisnik).subscribe({
      next: (res) => {
        Swal.fire({
          icon: 'success',
          title: 'Uspešno!',
          text: 'Kod za verifikaciju je poslat na vaš email.',
          timer: 2000,
          showConfirmButton: false,
        });
        this.prikaziVerifikaciju = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        if (err.error === 'Korisnik sa ovim emailom već postoji.') {
          Swal.fire({
            icon: 'error',
            title: 'Email postoji',
            text: 'Već postoji nalog sa ovom email adresom! Probajte da se ulogujete.',
            confirmButtonColor: '#0d6efd',
            footer: '<a href="/login">Idi na prijavu</a>',
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Greška',
            text: 'Došlo je do greške prilikom registracije. Pokušajte ponovo.',
            confirmButtonColor: '#d33',
          });
        }
      },
    });
  }

  moveFocus(event: any, index: number) {
    const input = event.target;
    const value = input.value;

    if (value.length === 1 && index < 3) {
      const nextInput = document.getElementsByName('otp' + (index + 1))[0] as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }

    if (event.key === 'Backspace' && index > 0 && value.length === 0) {
      const prevInput = document.getElementsByName('otp' + (index - 1))[0] as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  }

  potvrdiKod() {
    const kod = this.otpCode.join('');

    if (kod.length < 4) {
      Swal.fire({
        icon: 'warning',
        title: 'Nepotpun kod',
        text: 'Molimo vas unesite sve 4 cifre koje ste dobili na email.',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }

    const podaci = { Email: this.noviKorisnik.email, Kod: kod };

    this.http.post('https://localhost:7075/api/account/verify', podaci).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Čestitamo!',
          text: 'Vaš nalog je sada aktivan.',
          confirmButtonText: 'Idi na prijavu',
          confirmButtonColor: '#0d6efd',
          allowOutsideClick: false,
        }).then((result) => {
          if (result.isConfirmed) {
            this.router.navigate(['/login']);
          }
        });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Greška',
          text: err.error || 'Pogrešan kod, pokušajte ponovo.',
          confirmButtonColor: '#d33',
        });
        this.otpCode = ['', '', '', ''];
      },
    });
  }
}
