import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  private authService = inject(AuthService);
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef // Ubaci ovo
  ) {}
  ngOnInit(): void {
    this.http.get<any[]>('https://localhost:7075/api/usluga').subscribe({
      next: (res) => {
        console.log('Cenovnik stigao:', res); // Proveri u F12 konzoli da li ovo ispisuje podatke
        this.usluge = res;
        this.cdr.detectChanges(); // Forsiraj osvežavanje HTML-a
      },
      error: (err) => console.error('Problem sa cenovnikom', err),
    });
  }

  // 2. Definisi funkciju koju HTML traži
  isLoggedIn() {
    return this.authService.isLoggedIn();
  }
}
