import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token');

    if (token) {
      return true;
    } else {
      // Korisnik NIJE ulogovan
      // Možeš ga poslati na Login ili na Error stranicu
      // Opcija A: Idi na Login
      // this.router.navigate(['/login']);
      
      // Opcija B (po tvom prethodnom zahtevu): Idi na Error
      this.router.navigate(['/error']);
      
      return false;
    }
  }
}