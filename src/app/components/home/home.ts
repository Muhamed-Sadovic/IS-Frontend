import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  usluge: any[] = [];
  korisnickaUloga: string = '';
  private authService = inject(AuthService);
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private scroller: ViewportScroller
  ) {}

  ngOnInit(): void {
    this.ucitajUloguIzTokena();
    this.http.get<any[]>('https://localhost:7075/api/usluga').subscribe({
      next: (res) => {
        this.usluge = res;
        this.cdr.detectChanges();

        this.route.fragment.subscribe((fragment) => {
          if (fragment) {
            setTimeout(() => {
              this.scroller.scrollToAnchor(fragment);
            }, 100);
          }
        });
      },
      error: (err) => console.error('Problem sa cenovnikom', err),
    });
  }

  isLoggedIn() {
    return this.authService.isLoggedIn();
  }
  ucitajUloguIzTokena() {
    if (!this.isLoggedIn()) {
      this.korisnickaUloga = '';
      return;
    }

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payloadPart = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadPart));
        this.korisnickaUloga =
          decodedPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
          decodedPayload['role'] ||
          '';
        console.log('Uloga korisnika je:', this.korisnickaUloga);
      } catch (e) {
        console.error('Greška pri čitanju tokena', e);
      }
    }
  }
}
