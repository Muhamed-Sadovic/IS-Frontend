import { Component,inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // OVO DODAJ
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import * as bootstrap from "bootstrap"

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  standalone: true
})
export class Header implements AfterViewInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoggedIn() {
    return this.authService.isLoggedIn();
  }

  // Ovo "budno" prati Bootstrap elemente nakon što se učitaju
  ngAfterViewInit() {
    const dropdownElementList = document.querySelectorAll('.dropdown-toggle');
    dropdownElementList.forEach(dropdownToggleEl => {
      new bootstrap.Dropdown(dropdownToggleEl);
    });
  }

  logout() {
    this.authService.logout();
    // Bolje je koristiti router umesto window.location da se aplikacija ne bi resetovala skroz
    this.router.navigate(['/login']);
  }
}
