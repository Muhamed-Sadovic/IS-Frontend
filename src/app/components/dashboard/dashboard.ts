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
  // --- VIEWCHILD REFERENCE (Da rešimo problem sa nazivima) ---
  @ViewChild('docModal') docModalElement!: ElementRef;
  @ViewChild('pregledModal') pregledModalElement!: ElementRef;

  private modalInstance: any; // Za čuvanje instance pregled modala
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  // --- PODACI ---
  data: any = null;
  users: any[] = [];
  loading = true;
  searchTerm: string = '';
  roleFilter: string = 'Sve';

  // --- STOMATOLOG PODACI ---
  doctorAppointments: any[] = [];
  selectedTermin: any = null;
  pregledData = { dijagnoza: '', terapija: '' };

  // --- ADMIN TABOVI ---
  adminTab: 'stats' | 'users' | 'appointments' | 'inventar' = 'stats';
  appointmentSearch: string = '';

  // --- NOVI DOKTOR ---
  noviDoc = { ime: '', prezime: '', email: '', lozinka: '' };
  isSaving = false;

  // --- INVENTAR ---
  inventar: any[] = [];
  noviMaterijal = { naziv: '', kolicina: 0, opis: '' };

  // --- ZAKAZIVANJE (PACIJENT) ---
  stomatolozi: any[] = [];
  listaUsluga: any[] = []; // NOVO: Lista usluga iz baze

  // NOVO: Dodat uslugaId
  noviTermin = { stomatologId: null, uslugaId: null, datumVreme: '', napomena: '' };

  minDatum: string = '';
  maxDatum: string = '';
  slobodniTermini: string[] = [];
  izabranoVreme: string = '';
  izabranDatum: string = '';

  allAppointments: any[] = []; // Svi termini za admina
  myAppointments: any[] = [];

  listaPotrosnje: any[] = []; // Privremena lista (korpa)
  izabranMaterijalId: number | null = null;
  kolicinaZaPotrosnju: number = 1;

  // =================================================================
  // LIFECYCLE HOOKS
  // =================================================================

  ngOnInit() {
    this.loadDashboardData();
    this.ucitajStomatologe();
    this.ucitajUsluge(); // Učitavamo usluge odmah
    this.postaviGraniceDatuma();
    this.generisiTermine();

    // Pametno učitavanje zavisno od uloge
    setTimeout(() => {
      if (this.data?.uloga === 'Admin') {
        this.ucitajSveTermineZaAdmina();
      } else if (this.data?.uloga === 'Stomatolog') {
        this.loadDoctorData();
      } else if (this.data?.uloga === 'Pacijent') {
        this.loadMyAppointments(); // <--- DODAJ OVO
      }
    }, 300);
  }

  // 3. Dodaj novu funkciju za učitavanje
  loadMyAppointments() {
    this.http.get<any[]>('https://localhost:7075/api/termin/moji-termini').subscribe({
      next: (res) => {
        this.myAppointments = res;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  otkaziMojTermin(id: number) {
    if (confirm('Da li želite da otkažete ovaj termin?')) {
      this.http.delete(`https://localhost:7075/api/termin/${id}`).subscribe(() => {
        this.loadMyAppointments(); // Osveži listu
      });
    }
  }

  // =================================================================
  // UČITAVANJE PODATAKA (GET METODE)
  // =================================================================

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

  ucitajStomatologe() {
    this.http.get<any[]>('https://localhost:7075/api/user/stomatolozi').subscribe({
      next: (res) => {
        this.stomatolozi = res;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  // NOVO: Funkcija za učitavanje usluga
  ucitajUsluge() {
    this.http.get<any[]>('https://localhost:7075/api/usluga').subscribe({
      next: (res) => {
        this.listaUsluga = res;
        this.cdr.detectChanges();
      },
    });
  }

  ucitajSveTermineZaAdmina() {
    this.http.get<any[]>('https://localhost:7075/api/termin/pregled-svih').subscribe({
      next: (res) => {
        this.allAppointments = res;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  loadDoctorData() {
    this.http.get<any[]>('https://localhost:7075/api/termin/danasnji-termini').subscribe((res) => {
      this.doctorAppointments = res;
      this.cdr.detectChanges();
    });
  }

  // POPRAVLJENO: Funkcija koja ti je falila
  loadUsers() {
    this.adminTab = 'users';
    this.http.get<any[]>('https://localhost:7075/api/user').subscribe((res) => {
      this.users = res;
      this.cdr.detectChanges();
    });
  }

  loadInventar() {
    this.adminTab = 'inventar';
    this.http.get<any[]>('https://localhost:7075/api/inventar').subscribe((res) => {
      this.inventar = res;
      this.cdr.detectChanges();
    });
  }

  // =================================================================
  // ADMIN AKCIJE (KORISNICI I TERMINI)
  // =================================================================

  deleteUser(id: number) {
    if (confirm('Da li ste sigurni da želite da obrišete ovog korisnika?')) {
      this.http.delete(`https://localhost:7075/api/user/${id}`).subscribe(() => {
        this.users = this.users.filter((u) => u.id !== id);
        this.cdr.detectChanges();
      });
    }
  }

  deleteAppointment(id: number) {
    if (confirm('Obriši ovaj termin?')) {
      this.http.delete(`https://localhost:7075/api/termin/${id}`).subscribe({
        next: () => {
          // Ažuriramo listu na ekranu
          this.allAppointments = this.allAppointments.filter((t: any) => t.id !== id);
          this.cdr.detectChanges();
        },
        error: (err) => alert('Greška: ' + err.error),
      });
    }
  }

  odgovoriNaTermin(id: number, status: string) {
    this.http
      .put(`https://localhost:7075/api/termin/promeni-status/${id}`, `"${status}"`, {
        headers: { 'Content-Type': 'application/json' },
      })
      .subscribe({
        next: () => {
          alert('Status ažuriran!');
          this.ucitajSveTermineZaAdmina();
        },
        error: (err) => alert('Greška: ' + err.error),
      });
  }

  // =================================================================
  // MODAL ZA DOKTORA (ADMIN)
  // =================================================================

  openDocModal() {
    // Koristimo tačan naziv ViewChild-a: docModalElement
    const el = this.docModalElement.nativeElement;
    const modal = bootstrap.Modal.getOrCreateInstance(el);
    modal.show();
  }

  saveStomatolog() {
    this.isSaving = true;
    this.http.post('https://localhost:7075/api/user/dodaj-stomatologa', this.noviDoc).subscribe({
      next: () => {
        this.isSaving = false;
        this.noviDoc = { ime: '', prezime: '', email: '', lozinka: '' };

        // Zatvaranje: Koristimo docModalElement
        bootstrap.Modal.getInstance(this.docModalElement.nativeElement)?.hide();

        alert('Stomatolog uspešno dodat!');
        if (this.adminTab === 'users') this.loadUsers();
      },
      error: (err) => {
        this.isSaving = false;
        alert(err.error || 'Greška pri dodavanju.');
      },
    });
  }

  // =================================================================
  // MODAL ZA PREGLED (STOMATOLOG)
  // =================================================================

  openPregledModal(termin: any) {
    this.selectedTermin = termin;
    this.pregledData = { dijagnoza: '', terapija: '' };

    this.listaPotrosnje = [];
    this.izabranMaterijalId = null;
    this.kolicinaZaPotrosnju = 1;

    if (this.inventar.length === 0) {
      this.loadInventar();
    }

    this.cdr.detectChanges();

    // Sigurnosni timeout zbog *ngIf renderovanja
    setTimeout(() => {
      const modalEl = document.getElementById('pregledModal');
      if (modalEl) {
        modalEl.removeAttribute('aria-hidden'); // Fix za accessibility warning
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (!modalInstance) {
          modalInstance = new bootstrap.Modal(modalEl, {
            backdrop: true,
            keyboard: true,
            focus: true,
          });
        }
        this.modalInstance = modalInstance;
        modalInstance.show();
      }
    }, 50);
  }

  dodajUPotrosnju() {
    if (!this.izabranMaterijalId || this.kolicinaZaPotrosnju <= 0) return;

    // Nađi naziv materijala radi prikaza
    const materijal = this.inventar.find((i) => i.id == this.izabranMaterijalId);

    // Proveri da li već imamo taj materijal u listi, ako da, samo povećaj broj
    const postojeci = this.listaPotrosnje.find((p) => p.inventarId == this.izabranMaterijalId);

    if (postojeci) {
      postojeci.kolicina += this.kolicinaZaPotrosnju;
    } else {
      this.listaPotrosnje.push({
        inventarId: this.izabranMaterijalId,
        naziv: materijal ? materijal.naziv : 'Nepoznato',
        kolicina: this.kolicinaZaPotrosnju,
      });
    }

    // Reset polja
    this.izabranMaterijalId = null;
    this.kolicinaZaPotrosnju = 1;
  }

  obrisiIzPotrosnje(index: number) {
    this.listaPotrosnje.splice(index, 1);
  }

  savePregled() {
    const body = {
      Dijagnoza: this.pregledData.dijagnoza,
      Terapija: this.pregledData.terapija,
      // ŠALJEMO I LISTU MATERIJALA
      PotroseniMaterijal: this.listaPotrosnje,
    };

    this.http
      .put(`https://localhost:7075/api/stomatolog/zavrsi-pregled/${this.selectedTermin.id}`, body)
      .subscribe({
        next: () => {
          alert('Uspešno završen pregled i razdužen materijal!');
          this.loadDoctorData();
          // Osveži inventar jer se stanje promenilo
          this.loadInventar();
          if (this.modalInstance) this.modalInstance.hide();
        },
        error: (err) => alert('Greška: ' + err.error),
      });
  }

  // =================================================================
  // ZAKAZIVANJE (PACIJENT)
  // =================================================================

  pripremiDatumVreme() {
    if (this.izabranDatum && this.izabranoVreme) {
      this.noviTermin.datumVreme = `${this.izabranDatum}T${this.izabranoVreme}:00`;
    }
  }

  zakazi() {
    this.pripremiDatumVreme();

    // Provera da li su sva polja popunjena (UKLJUČUJUĆI USLUGU)
    if (!this.noviTermin.stomatologId || !this.noviTermin.datumVreme || !this.noviTermin.uslugaId) {
      alert('Molimo izaberite doktora, uslugu, datum i vreme.');
      return;
    }

    this.http.post('https://localhost:7075/api/termin/zakazi', this.noviTermin).subscribe({
      next: (res: any) => {
        alert('Uspešno ste poslali zahtev. Status: NA ČEKANJU.');
        // Reset polja
        this.izabranDatum = '';
        this.izabranoVreme = '';
        this.noviTermin = { stomatologId: null, uslugaId: null, datumVreme: '', napomena: '' };
      },
      error: (err) => alert(err.error),
    });
  }

  // =================================================================
  // INVENTAR & POMOĆNE FUNKCIJE
  // =================================================================

  updateKolicina(id: number, promena: number) {
    const stavka = this.inventar.find((i) => i.id === id);
    if (!stavka) return;
    const nova = stavka.kolicina + promena;
    if (nova < 0) return;

    this.http
      .put(`https://localhost:7075/api/inventar/azuriraj-kolicinu/${id}?novaKolicina=${nova}`, {})
      .subscribe(() => {
        stavka.kolicina = nova;
        this.cdr.detectChanges();
      });
  }

  saveNoviMaterijal() {
    if (!this.noviMaterijal.naziv || this.noviMaterijal.naziv.trim() === '') {
      alert('Unesite naziv materijala.');
      return;
    }
    this.http.post('https://localhost:7075/api/inventar/dodaj', this.noviMaterijal).subscribe({
      next: (res: any) => {
        this.inventar.push(res);
        this.noviMaterijal = { naziv: '', kolicina: 0, opis: '' };
        this.cdr.detectChanges();
        alert('Dodato!');
      },
      error: (err) => alert(err.error),
    });
  }

  // --- Helpers ---
  generisiTermine() {
    const termini = [];
    for (let sat = 9; sat <= 16; sat++) {
      termini.push(`${sat.toString().padStart(2, '0')}:00`);
      termini.push(`${sat.toString().padStart(2, '0')}:30`);
    }
    this.slobodniTermini = termini;
  }

  postaviGraniceDatuma() {
    const sad = new Date();
    const zaSedamDana = new Date();
    zaSedamDana.setDate(sad.getDate() + 7);
    this.minDatum = sad.toISOString().split('.')[0].slice(0, 16);
    this.maxDatum = zaSedamDana.toISOString().split('.')[0].slice(0, 16);
  }

  formatirajDatumZaInput(date: Date): string {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return (
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      'T' +
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes())
    );
  }

  // Filteri za pretragu
  get filteredAppointments() {
    if (!this.allAppointments || this.allAppointments.length === 0) return [];
    if (!this.appointmentSearch) return this.allAppointments;
    const s = this.appointmentSearch.toLowerCase();
    return this.allAppointments.filter(
      (t: any) =>
        t.pacijentIme?.toLowerCase().includes(s) ||
        t.stomatologIme?.toLowerCase().includes(s) ||
        t.status?.toLowerCase().includes(s)
    );
  }

  get filteredUsers() {
    if (!this.users) return [];
    return this.users.filter((u) => {
      const matchesSearch =
        !this.searchTerm ||
        (u.ime + ' ' + u.prezime + ' ' + u.email)
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase());
      const matchesRole = this.roleFilter === 'Sve' || u.uloga === this.roleFilter;
      return matchesSearch && matchesRole;
    });
  }

  getRoleClass(uloga: string): string {
    switch (uloga?.toLowerCase()) {
      case 'admin':
        return 'border-admin';
      case 'stomatolog':
        return 'border-doctor';
      case 'pacijent':
        return 'border-patient';
      default:
        return 'border-light';
    }
  }
  
  platiRacun(terminId: number, iznos: number) {
    if (confirm(`Da li želite da platite račun u iznosu od ${iznos} RSD?`)) {
      // Gađamo novi endpoint u RacunController-u
      this.http.post(`https://localhost:7075/api/racun/plati/${terminId}`, {}).subscribe({
        next: () => {
          alert('Uplata uspešna! Hvala vam.');
          this.loadMyAppointments(); // Osveži listu da dugme pozeleni
        },
        error: (err) => alert('Greška pri plaćanju: ' + err.error),
      });
    }
  }
}
