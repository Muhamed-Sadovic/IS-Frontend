import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AccountService, MeResponse } from '../../services/account';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, NgIf],
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

  profileSuccess = '';
  profileError = '';

  passSuccess = '';
  passError = '';

  constructor(private account: AccountService) {}

  ngOnInit(): void {
    console.log('PROFILE: ngOnInit radi');
    this.loadMe();
  }

  loadMe() {
    console.log('PROFILE: loadMe pozvan');
    this.loading = true;
    this.account.getMe().subscribe({
      next: (data) => {
        
        console.log('PROFILE: me stigao', data);
        this.me = data;
        this.profileForm = {
          ime: data.ime ?? '',
          prezime: data.prezime ?? '',
        };
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.log('PROFILE: greska', err);
        this.profileError = 'Ne mogu da učitam profil. Proveri da li si prijavljen.';
      },
    });
  }

  resetProfile() {
    if (!this.me) return;
    this.profileForm = {
      ime: this.me.ime ?? '',
      prezime: this.me.prezime ?? '',
    };
    this.profileSuccess = '';
    this.profileError = '';
  }

  saveProfile() {
    this.savingProfile = true;
    this.profileSuccess = '';
    this.profileError = '';

    this.account.updateMe(this.profileForm).subscribe({
      next: () => {
        this.savingProfile = false;
        this.profileSuccess = 'Podaci su sačuvani.';
        this.loadMe();
      },
      error: (err) => {
        this.savingProfile = false;
        this.profileError = err?.error ?? 'Greška pri čuvanju.';
      },
    });
  }

  changePassword() {
    this.savingPass = true;
    this.passSuccess = '';
    this.passError = '';

    if (this.passForm.novaLozinka !== this.passForm.potvrdaNove) {
      this.savingPass = false;
      this.passError = 'Nova lozinka i potvrda se ne poklapaju.';
      return;
    }

    this.account.changePassword(this.passForm).subscribe({
      next: () => {
        this.savingPass = false;
        this.passSuccess = 'Lozinka je promenjena.';
        this.passForm = { staraLozinka: '', novaLozinka: '', potvrdaNove: '' };
      },
      error: (err) => {
        this.savingPass = false;
        this.passError = err?.error ?? 'Greška pri promeni lozinke.';
      },
    });
  }
}
