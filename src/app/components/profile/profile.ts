import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AccountService, MeResponse } from '../../services/account';
import * as bootstrap from 'bootstrap';

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

  profileSuccess = '';
  profileError = '';

  passSuccess = '';
  passError = '';

  constructor(private account: AccountService, private cdr: ChangeDetectorRef) {}

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
        this.profileError = 'Ne mogu da učitam profil.';
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
    this.profileSuccess = '';
    this.profileError = '';
  }

  showSuccessModal() {
    const modalElem = document.getElementById('successModal');
    if (modalElem) {
      const modal = new bootstrap.Modal(modalElem);
      modal.show();
    }
  }

  saveProfile() {
    this.savingProfile = true;
    this.profileSuccess = '';
    this.profileError = '';

    this.account.updateMe(this.profileForm).subscribe({
      next: () => {
        this.savingProfile = false;
        this.showSuccessModal();
        this.loadMe();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingProfile = false;
        this.profileError = err?.error ?? 'Greška pri čuvanju.';
        this.cdr.detectChanges();
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
        this.showSuccessModal();
        this.passForm = { staraLozinka: '', novaLozinka: '', potvrdaNove: '' };
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingPass = false;
        this.passError = err?.error ?? 'Greška pri promeni lozinke.';
        this.cdr.detectChanges();
      },
    });
  }
}
