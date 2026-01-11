import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  ime: string | null = '';
  uloga: string | null = '';

  ngOnInit() {
    // Uzimamo podatke koje smo sačuvali u login.ts
    this.ime = localStorage.getItem('korisnik'); // Ime korisnika
    this.uloga = localStorage.getItem('uloga');    // Npr. "Admin", "Stomatolog" ili "Pacijent"
  }

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }
}