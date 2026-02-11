import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AccountService, MeResponse } from '../../services/account';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class ProfileComponent implements OnInit {
  
  me: MeResponse | null = null;
  loading = true;
  savingProfile = false;
  savingPass = false;
  profileForm = { ime: '', prezime: '' };
  passForm = { staraLozinka: '', novaLozinka: '', potvrdaNove: '' };

  constructor(
    private account: AccountService, 
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMe();
  }

  loadMe() {
    this.loading = true;
    this.account.getMe().subscribe({
      next: (data) => {
        this.me = data;
        this.profileForm.ime = data.ime ?? '';
        this.profileForm.prezime = data.prezime ?? '';       
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('PROFILE: greska', err);
        this.loading = false;
            Swal.fire({
            icon: 'error',
            title: 'Greška',
            text: 'Neuspešno učitavanje profila.',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        
        this.cdr.detectChanges();
      },
    });
  }

  resetProfile() {
    if (!this.me) return;
      this.profileForm = {
      ime: this.me.ime ?? '',
      prezime: this.me.prezime ?? '',
    };
    
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    });
    Toast.fire({
      icon: 'info',
      title: 'Izmene poništene'
    });
  }

  saveProfile() {
    this.savingProfile = true;
    this.account.updateMe(this.profileForm).subscribe({
      next: () => {
        this.savingProfile = false;
        
        Swal.fire({
            icon: 'success',
            title: 'Uspešno!',
            text: 'Vaši lični podaci su ažurirani.',
            confirmButtonColor: '#0d6efd',
            timer: 2000
        });

        this.loadMe();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingProfile = false;
        Swal.fire({
            icon: 'error',
            title: 'Greška',
            text: err.error?.message || 'Došlo je do greške prilikom čuvanja.',
            confirmButtonColor: '#d33'
        });
        
        this.cdr.detectChanges();
      },
    });
  }

  changePassword() {
    if (this.passForm.novaLozinka !== this.passForm.potvrdaNove) {
      Swal.fire({
        icon: 'warning',
        title: 'Nepoklapanje',
        text: 'Nova lozinka i potvrda se ne poklapaju!',
        confirmButtonColor: '#0d6efd'
      });
      return;
    }

    this.savingPass = true;
    this.account.changePassword(this.passForm).subscribe({
      next: () => {
        this.savingPass = false;
        
        Swal.fire({
            icon: 'success',
            title: 'Lozinka promenjena',
            text: 'Uspešno ste promenili lozinku.',
            confirmButtonColor: '#0d6efd'
        });

        this.passForm = { staraLozinka: '', novaLozinka: '', potvrdaNove: '' };
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingPass = false;
        
        Swal.fire({
            icon: 'error',
            title: 'Greška',
            text: err.error?.message || 'Proverite da li je stara lozinka tačna.',
            confirmButtonColor: '#d33'
        });
        
        this.cdr.detectChanges();
      },
    });
  }
}