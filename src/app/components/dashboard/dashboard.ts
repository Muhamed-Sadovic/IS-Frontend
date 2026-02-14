import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import * as bootstrap from 'bootstrap';
import Swal from 'sweetalert2';

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

  isProcessing = false;

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
    console.log('Priprema datuma:', this.izabranDatum, this.izabranoVreme); // DEBUG

    if (this.izabranDatum && this.izabranoVreme) {
      // Pravimo format: "2024-02-15T14:30:00"
      this.noviTermin.datumVreme = `${this.izabranDatum}T${this.izabranoVreme}:00`;
      console.log('Generisan datumVreme:', this.noviTermin.datumVreme); // DEBUG
    } else {
      this.noviTermin.datumVreme = '';
    }
  }

  ucitajSlobodneTermine() {
    console.log('--- POKUŠAJ UČITAVANJA ---');
    console.log('Doktor ID:', this.noviTermin.stomatologId);
    console.log('Datum:', this.izabranDatum);
    if (!this.noviTermin.stomatologId || !this.izabranDatum) {
      console.warn('STOP: Fale podaci (doktor ili datum je null/prazan).');
      return;
    }
    console.log('Podaci OK, šaljem zahtev na server...');
    const url = `https://localhost:7075/api/termin/slobodni-termini?stomatologId=${this.noviTermin.stomatologId}&datum=${this.izabranDatum}`;

    this.http.get<string[]>(url).subscribe({
      next: (termini) => {
        console.log('Izabran datum:', this.izabranDatum);
        console.log('Stigli slobodni termini sa servera:', termini);
        this.slobodniTermini = termini;
        if (this.izabranoVreme && !this.slobodniTermini.includes(this.izabranoVreme)) {
          this.izabranoVreme = '';
          Swal.fire('Ups!', 'Izabrani termin je upravo zauzet.', 'warning');
        }
      },
      error: (err) => {
        console.error('Greška pri učitavanju termina:', err);
      },
    });
  }

  zakazi() {
    this.pripremiDatumVreme();

    // 2. DEBUG: Ispiši u konzolu šta tačno šaljemo
    console.log('Šaljem objekat:', this.noviTermin);

    // 3. VALIDACIJA
    if (!this.noviTermin.stomatologId) {
      Swal.fire('Greška', 'Niste izabrali stomatologa!', 'warning');
      return;
    }
    if (!this.noviTermin.uslugaId) {
      Swal.fire('Greška', 'Niste izabrali uslugu!', 'warning');
      return;
    }
    if (!this.noviTermin.datumVreme) {
      Swal.fire('Greška', 'Niste izabrali datum i vreme!', 'warning');
      return;
    }

    // 4. SLANJE NA BACKEND
    this.isProcessing = true; // Blokiraj dugme da ne klikne dvaput

    this.http.post('https://localhost:7075/api/termin/zakazi', this.noviTermin).subscribe({
      next: (res: any) => {
        console.log('Uspešno zakazano:', res);
        this.isProcessing = false;

        Swal.fire({
          icon: 'success',
          title: 'Uspešno!',
          text: 'Termin je zakazan i čeka potvrdu.',
          timer: 3000,
          showConfirmButton: false,
        });

        // 5. OSVEŽAVANJE PODATAKA
        this.loadMyAppointments(); // Osveži moju tabelu
        this.ucitajSlobodneTermine(); // Osveži listu termina (da skloniš zauzeti)

        // 6. RESET FORME
        this.izabranoVreme = '';
        this.noviTermin = {
          stomatologId: this.noviTermin.stomatologId, // Ostavljamo doktora
          uslugaId: this.noviTermin.uslugaId, // Ostavljamo uslugu
          datumVreme: '',
          napomena: '',
        };
      },
      error: (err) => {
        console.error('Greška pri zakazivanju:', err);
        this.isProcessing = false;

        // Prikaz greške sa servera
        Swal.fire({
          icon: 'error',
          title: 'Greška',
          text: err.error || 'Došlo je do greške na serveru.',
        });

        // Ako je greška "Termin zauzet", osveži listu
        if (err.status === 400) {
          this.ucitajSlobodneTermine();
          this.izabranoVreme = '';
        }
      },
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
    if (confirm(`Da li želite da platite račun u iznosu od ${iznos} RSD karticom?`)) {
      this.isProcessing = true;
      setTimeout(() => {
        this.http.post(`https://localhost:7075/api/racun/plati/${terminId}`, {}).subscribe({
          next: () => {
            this.isProcessing = false;
            alert('Transakcija uspešna! Vaša uplata je proknjižena.');
            this.loadMyAppointments();
          },
          error: (err) => {
            this.isProcessing = false;
            alert('Greška pri transakciji: ' + err.error);
          },
        });
      }, 3000);
    }
  }
}
