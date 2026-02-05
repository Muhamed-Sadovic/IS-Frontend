import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import * as bootstrap from 'bootstrap';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  data: any = null;
  users: any[] = [];
  loading = true;
  searchTerm: string = '';
  roleFilter: string = 'Sve';

  doctorAppointments: any[] = [];
  selectedTermin: any = null;
  pregledData = { dijagnoza: '', terapija: '' };

  adminTab: 'stats' | 'users' | 'appointments' | 'inventar' = 'stats';
  appointmentSearch: string = '';

  // Model za novog stomatologa
  noviDoc = { ime: '', prezime: '', email: '', lozinka: '' };
  isSaving = false;
  inventar: any[] = [];
  noviMaterijal = { naziv: '', kolicina: 0, opis: '' };

  ngOnInit() {
    this.loadDashboardData();
  }
  get filteredAppointments() {
    if (!this.data?.listaSvihTermina) return [];
    if (!this.appointmentSearch) return this.data.listaSvihTermina;

    const s = this.appointmentSearch.toLowerCase();
    return this.data.listaSvihTermina.filter(
      (t: any) =>
        t.pacijentIme.toLowerCase().includes(s) ||
        t.stomatologIme.toLowerCase().includes(s) ||
        t.status.toLowerCase().includes(s)
    );
  }

  get filteredUsers() {
    let filtered = this.users;

    if (this.roleFilter !== 'Sve') {
      filtered = filtered.filter((u) => u.uloga === this.roleFilter);
    }

    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.ime.toLowerCase().includes(s) ||
          u.prezime.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s)
      );
    }
    return filtered;
  }

  loadDashboardData() {
    this.loading = true;
    this.http.get('https://localhost:7075/api/dashboard').subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => (this.loading = false),
    });
  }

  loadUsers() {
    this.adminTab = 'users';
    this.http.get<any[]>('https://localhost:7075/api/user').subscribe((res) => {
      this.users = res;
      this.cdr.detectChanges();
    });
  }

  deleteUser(id: number) {
    if (confirm('Da li ste sigurni da želite da obrišete ovog korisnika?')) {
      this.http.delete(`https://localhost:7075/api/user/${id}`).subscribe(() => {
        this.users = this.users.filter((u) => u.id !== id);
        this.cdr.detectChanges();
      });
    }
  }

  @ViewChild('docModal') modalElement!: ElementRef;

  openDocModal() {
    let modal = bootstrap.Modal.getInstance(this.modalElement.nativeElement);
    if (!modal) {
      modal = new bootstrap.Modal(this.modalElement.nativeElement);
    }

    modal.show();
  }

  saveStomatolog() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.isSaving = true;
    this.http.post('https://localhost:7075/api/user/dodaj-stomatologa', this.noviDoc).subscribe({
      next: () => {
        this.isSaving = false;
        this.noviDoc = { ime: '', prezime: '', email: '', lozinka: '' };

        // ZATVARANJE KORISTEĆI VIEWCHILD (Mnogo čistije)
        const modal = bootstrap.Modal.getInstance(this.modalElement.nativeElement);
        modal?.hide();

        alert('Stomatolog uspešno dodat!');
        if (this.adminTab === 'users') this.loadUsers();
      },
      error: (err) => {
        this.isSaving = false;
        alert(err.error || 'Greška pri dodavanju.');
      },
    });
  }
  loadDoctorData() {
    this.http
      .get<any[]>('https://localhost:7075/api/stomatolog/danasnji-termini')
      .subscribe((res) => {
        this.doctorAppointments = res;
        this.cdr.detectChanges();
      });
  }

  openPregledModal(termin: any) {
    this.selectedTermin = termin;
    const modal = new bootstrap.Modal(document.getElementById('pregledModal')!);
    modal.show();
  }

  savePregled() {
    this.http
      .put(
        `https://localhost:7075/api/stomatolog/zavrsi-pregled/${this.selectedTermin.id}`,
        this.pregledData
      )
      .subscribe(() => {
        alert('Uspešno završen pregled!');
        this.loadDoctorData(); // Osveži listu
        bootstrap.Modal.getInstance(document.getElementById('pregledModal')!)?.hide();
      });
  }
  deleteAppointment(id: number) {
    if (confirm('Da li ste sigurni da želite da obrišete ovaj termin iz sistema?')) {
      // Proveri da li tvoj endpoint na backendu odgovara putanji (možda je /api/termini ili /api/appointment)
      this.http.delete(`http://localhost:5000/api/termin/${id}`).subscribe({
        next: () => {
          // Kada se obriše na serveru, izbacujemo ga iz lokalne liste da nestane sa ekrana
          this.data.listaSvihTermina = this.data.listaSvihTermina.filter((t: any) => t.id !== id);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Greška pri brisanju termina:', err);
          alert('Došlo je do greške. Proverite da li termin postoji ili da li imate dozvolu.');
        },
      });
    }
  }
  loadInventar() {
    this.adminTab = 'inventar';
    this.http.get<any[]>('https://localhost:7075/api/inventar').subscribe((res) => {
      this.inventar = res;
      this.cdr.detectChanges();
    });
  }

  // 2. Brzo ažuriranje količine (direktno iz tabele)
  updateKolicina(id: number, promena: number) {
    const stavka = this.inventar.find((i) => i.id === id);
    if (!stavka) return;

    // 1. ZAPAMTI STARU VREDNOST (za slučaj greške)
    const staraKolicina = stavka.kolicina;
    const nova = staraKolicina + promena;
    if (nova < 0) return;

    // 2. PROMENI ODMAH NA EKRANU (Korisnik vidi promenu ISTOG TRENUTKA)
    stavka.kolicina = nova;
    this.inventar = [...this.inventar];

    // 3. POŠALJI SERVERU U POZADINI
    this.http
      .put(`https://localhost:7075/api/inventar/azuriraj-kolicinu/${id}?novaKolicina=${nova}`, {})
      .subscribe({
        next: () => {
          console.log('Server usklađen.');
          // Ovde ne radimo ništa jer smo već promenili na ekranu
        },
        error: (err) => {
          // 4. AKO SERVER JAVI GREŠKU, VRATI NA STARO
          console.error('Greška:', err);
          stavka.kolicina = staraKolicina;
          this.inventar = [...this.inventar];
          alert('Došlo je do greške, vraćam na staro stanje.');
        },
      });
  }

  saveNoviMaterijal() {
    // 1. Provera praznog polja (da ne dodaš nešto bez imena)
    if (!this.noviMaterijal.naziv || this.noviMaterijal.naziv.trim() === '') {
      alert('Morate uneti naziv materijala.');
      return;
    }

    const postoji = this.inventar.some(
      (item) => item.naziv.trim().toLowerCase() === this.noviMaterijal.naziv.trim().toLowerCase()
    );

    if (postoji) {
      alert('Greška: Materijal sa ovim nazivom već postoji u inventaru!');
      return;
    }

    this.http.post('https://localhost:7075/api/inventar/dodaj', this.noviMaterijal).subscribe({
      next: (noviItem: any) => {
        const mapiraniItem = {
          id: noviItem.id || noviItem.Id,
          naziv: noviItem.naziv || noviItem.Naziv,
          kolicina: noviItem.kolicina || noviItem.Kolicina,
          opis: noviItem.opis || noviItem.Opis,
        };
        this.inventar = [...this.inventar, mapiraniItem];
        if (this.data) {
          const trenutniInventar = this.data.inventar || [];
          this.data.inventar = [...trenutniInventar, mapiraniItem];
        }
        this.noviMaterijal = { naziv: '', kolicina: 0, opis: '' };
        this.cdr.detectChanges();
        alert('Uspešno dodato!');
      },
      error: (err) => alert(err.error || 'Greška pri dodavanju materijala.'),
    });
  }
}
