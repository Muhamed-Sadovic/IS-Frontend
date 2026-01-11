import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-table.html',
  styleUrl: './user-table.scss',
})
export class UserTable implements OnInit {
  korisnici: any[] = [];
  ucitavanje: boolean = true;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.getAllUsers().subscribe({
      next: (data) => {
        this.korisnici = data;
        this.ucitavanje = false;
      },
      error: (err) => {
        console.error('Greška pri učitavanju korisnika:', err);
        this.ucitavanje = false;
      },
    });
  }

  obrisiKorisnika(id: number) {
    if (confirm('Da li ste sigurni da želite da obrišete ovog korisnika?')) {
      // Ovde ćemo kasnije dodati poziv servisu za brisanje
      console.log('Brisanje korisnika sa ID:', id);
    }
  }
}
