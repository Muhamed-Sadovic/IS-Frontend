import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // OVO DODAJ
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  isLoggedIn(): boolean {
    return localStorage.getItem('korisnikId') !== null;
  }

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }
}
