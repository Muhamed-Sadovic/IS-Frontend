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
  @ViewChild('docModal') docModalElement!: ElementRef;
  @ViewChild('pregledModal') pregledModalElement!: ElementRef;

  private modalInstance: any;
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

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
  listaUsluga: any[] = [];

  // NOVO: Dodat uslugaId
  noviTermin = { stomatologId: null, uslugaId: null, datumVreme: '', napomena: '' };

  minDatum: string = '';
  maxDatum: string = '';
  slobodniTermini: string[] = [];
  izabranoVreme: string = '';
  izabranDatum: string = '';

  allAppointments: any[] = []; // Svi termini za admina
  myAppointments: any[] = [];

  listaPotrosnje: any[] = []; // Privremena lista
  izabranMaterijalId: number | null = null;
  kolicinaZaPotrosnju: number = 1;

  isProcessing = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  appointmentsPage: number = 1;
  appointmentsPerPage: number = 10;
  today: Date = new Date();

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
        this.loadMyAppointments();
      }
    }, 300);
  }

  loadMyAppointments() {
    this.http.get<any[]>('/api/termin/moji-termini').subscribe({
      next: (res) => {
        this.myAppointments = res;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  otkaziMojTermin(id: number) {
    Swal.fire({
      title: 'Otkazivanje termina',
      text: 'Da li ste sigurni da želite da otkažete ovaj termin?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="bi bi-trash3 me-1"></i> Da, otkaži',
      cancelButtonText: 'Odustani',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`/api/termin/moj-termin/${id}`).subscribe({
          next: () => {
            Swal.fire({
              title: 'Otkazano!',
              text: 'Vaš termin je uspešno otkazan.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
            });
            this.loadMyAppointments();
          },
          error: (err) => {
            console.error('Greška pri otkazivanju:', err);
            Swal.fire('Greška!', 'Došlo je do greške prilikom otkazivanja.', 'error');
          },
        });
      }
    });
  }

  // =================================================================
  // UČITAVANJE PODATAKA (GET METODE)
  // =================================================================

  loadDashboardData() {
    this.loading = true;
    this.http.get('/api/dashboard').subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => (this.loading = false),
    });
  }

  ucitajStomatologe() {
    this.http.get<any[]>('/api/user/stomatolozi').subscribe({
      next: (res) => {
        this.stomatolozi = res;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  ucitajUsluge() {
    this.http.get<any[]>('/api/usluga').subscribe({
      next: (res) => {
        this.listaUsluga = res;
        this.cdr.detectChanges();
      },
    });
  }

  ucitajSveTermineZaAdmina() {
    this.http.get<any[]>('/api/termin/pregled-svih').subscribe({
      next: (res) => {
        this.allAppointments = res;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  loadDoctorData() {
    this.http.get<any[]>('/api/termin/danasnji-termini').subscribe((res) => {
      this.doctorAppointments = res;
      this.cdr.detectChanges();
    });
  }

  loadUsers() {
    this.adminTab = 'users';
    this.http.get<any[]>('/api/user').subscribe((res) => {
      this.users = res;
      this.cdr.detectChanges();
    });
  }

  loadInventar() {
    this.adminTab = 'inventar';
    this.http.get<any[]>('/api/inventar').subscribe((res) => {
      this.inventar = res;
      this.cdr.detectChanges();
    });
  }

  // =================================================================
  // ADMIN AKCIJE (KORISNICI I TERMINI)
  // =================================================================

  deleteUser(id: number) {
    Swal.fire({
      title: 'Da li ste sigurni?',
      text: 'Ova akcija će trajno obrisati korisnika i sve njegove termine!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="bi bi-trash3 me-1"></i> Da, obriši!',
      cancelButtonText: 'Odustani',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Brisanje u toku...',
          text: 'Molimo sačekajte.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });
        this.http.delete(`/api/user/${id}`).subscribe({
          next: () => {
            this.users = this.users.filter((u) => u.id !== id);
            this.cdr.detectChanges();
            Swal.fire({
              icon: 'success',
              title: 'Obrisano!',
              text: 'Korisnik je uspešno uklonjen iz sistema.',
              confirmButtonColor: '#0d6efd',
              timer: 2000,
            });
          },
          error: (err) => {
            console.error(err);
            Swal.fire({
              icon: 'error',
              title: 'Greška pri brisanju',
              text: err.error?.message || 'Neuspešno brisanje. Proverite vezu sa serverom.',
              confirmButtonColor: '#d33',
            });
          },
        });
      }
    });
  }

  deleteAppointment(id: number) {
    Swal.fire({
      title: 'Brisanje termina',
      text: 'Da li ste sigurni da želite da obrišete ovaj termin?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Obriši',
      cancelButtonText: 'Odustani',
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`/api/termin/${id}`).subscribe({
          next: () => {
            this.allAppointments = this.allAppointments.filter((t: any) => t.id !== id);
            this.cdr.detectChanges();

            Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true,
            }).fire({
              icon: 'success',
              title: 'Termin uspešno obrisan',
            });
          },
          error: (err) => {
            Swal.fire('Greška', err.error || 'Neuspešno brisanje.', 'error');
          },
        });
      }
    });
  }

  odgovoriNaTermin(id: number, status: string) {
    const isPrihvatanje = status === 'Prihvacen';
    const naslov = isPrihvatanje ? 'Potvrda termina' : 'Odbijanje termina';
    const tekst = isPrihvatanje
      ? 'Da li ste sigurni da želite da potvrdite termin? Pacijent će dobiti email obaveštenje.'
      : 'Da li ste sigurni da želite da odbijete termin? Pacijent će biti obavešten emailom.';
    const bojaDugmeta = isPrihvatanje ? '#198754' : '#d33';
    Swal.fire({
      title: naslov,
      text: tekst,
      icon: isPrihvatanje ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: bojaDugmeta,
      cancelButtonColor: '#6c757d',
      confirmButtonText: isPrihvatanje ? 'Da, potvrdi' : 'Da, odbij',
      cancelButtonText: 'Odustani',
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Slanje obaveštenja...',
          text: 'Molimo sačekajte dok server šalje email pacijentu.',
          allowOutsideClick: false, // Ne dajemo da zatvori dok radi
          didOpen: () => {
            Swal.showLoading();
          },
        });

        this.http
          .put(`/api/termin/promeni-status/${id}`, `"${status}"`, {
            headers: { 'Content-Type': 'application/json' },
          })
          .subscribe({
            next: () => {
              Swal.fire({
                icon: 'success',
                title: 'Uspešno!',
                text: 'Status je ažuriran i email je poslat.',
                timer: 2000,
                showConfirmButton: false,
              });

              this.ucitajSveTermineZaAdmina();
            },
            error: (err) => {
              console.error(err);
              Swal.fire({
                icon: 'error',
                title: 'Greška',
                text: err.error?.message || 'Došlo je do greške prilikom slanja.',
              });
            },
          });
      }
    });
  }

  // =================================================================
  // MODAL ZA DOKTORA (ADMIN)
  // =================================================================

  openDocModal() {
    const el = this.docModalElement.nativeElement;
    const modal = bootstrap.Modal.getOrCreateInstance(el);
    modal.show();
  }

  saveStomatolog() {
    if (
      !this.noviDoc.ime ||
      !this.noviDoc.prezime ||
      !this.noviDoc.email ||
      !this.noviDoc.lozinka
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Nedostaju podaci',
        text: 'Molimo popunite sva polja (Ime, Prezime, Email, Lozinka).',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }

    this.isSaving = true;
    Swal.fire({
      title: 'Kreiranje naloga...',
      text: 'Molimo sačekajte.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    this.http.post('/api/user/dodaj-stomatologa', this.noviDoc).subscribe({
      next: () => {
        this.isSaving = false;

        this.noviDoc = { ime: '', prezime: '', email: '', lozinka: '' };

        // Zatvaranje Bootstrap modala
        const modalInstance = bootstrap.Modal.getInstance(this.docModalElement.nativeElement);
        if (modalInstance) {
          modalInstance.hide();
        }

        // Osvežavanje liste korisnika ako smo na tom tabu
        if (this.adminTab === 'users') this.loadUsers();
        Swal.fire({
          icon: 'success',
          title: 'Uspešno!',
          text: 'Novi stomatolog je dodat u sistem.',
          timer: 2000,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        this.isSaving = false;
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Greška pri kreiranju',
          text: err.error?.message || err.error || 'Nije uspelo dodavanje stomatologa.',
          confirmButtonColor: '#d33',
        });
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

    // 1. Nađi materijal u glavnom inventaru (da vidimo koliko ga stvarno ima)
    const materijal = this.inventar.find((i) => i.id == this.izabranMaterijalId);
    if (!materijal) return; // Sigurnosna provera u slučaju da ne nađe materijal

    // 2. Proveri da li već imamo taj materijal u listi (korpi)
    const postojeci = this.listaPotrosnje.find((p) => p.inventarId == this.izabranMaterijalId);

    // 3. Izračunaj koliko ukupno doktor pokušava da skine sa stanja
    const trenutnoUKorpi = postojeci ? postojeci.kolicina : 0;
    const ukupnoZaPotrosnju = trenutnoUKorpi + this.kolicinaZaPotrosnju;

    // === 4. GLAVNA ZAŠTITA ===
    if (ukupnoZaPotrosnju > materijal.kolicina) {
      Swal.fire({
        icon: 'error',
        title: 'Nedovoljno na stanju!',
        text: `Na stanju ima samo ${materijal.kolicina} kom. materijala "${materijal.naziv}". Vi pokušavate da skinete ukupno ${ukupnoZaPotrosnju}.`,
        confirmButtonColor: '#d33',
      });
      return; // PREKID! Blokiramo ga i ne idemo dalje.
    }

    // === 5. TVOJA LOGIKA KOJA SE IZVRŠAVA SAMO AKO IMA DOVOLJNO MATERIJALA ===
    if (postojeci) {
      postojeci.kolicina += this.kolicinaZaPotrosnju;
    } else {
      this.listaPotrosnje.push({
        inventarId: this.izabranMaterijalId,
        naziv: materijal.naziv, // Sigurno imamo naziv jer smo prošli proveru
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
    // 1. Brza validacija pre otvaranja modala
    if (!this.pregledData.dijagnoza || !this.pregledData.terapija) {
      Swal.fire({
        icon: 'warning',
        title: 'Nedostaju podaci',
        text: 'Molimo unesite dijagnozu i terapiju pre čuvanja.',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }
    Swal.fire({
      title: 'Završetak pregleda',
      text: 'Da li ste sigurni da želite da sačuvate nalaz i razdužite utrošeni materijal?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="bi bi-save me-1"></i> Da, završi',
      cancelButtonText: 'Odustani',
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Čuvanje podataka...',
          text: 'Ažuriranje zdravstvenog kartona i magacina.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        const body = {
          Dijagnoza: this.pregledData.dijagnoza,
          Terapija: this.pregledData.terapija,
          PotroseniMaterijal: this.listaPotrosnje,
        };

        this.http.put(`/api/stomatolog/zavrsi-pregled/${this.selectedTermin.id}`, body).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Pregled završen!',
              text: 'Podaci su sačuvani, a materijal je uspešno razdužen.',
              timer: 2000,
              showConfirmButton: false,
            });
            this.loadDoctorData();
            this.loadInventar();

            // Zatvaranje Bootstrap modala
            if (this.modalInstance) this.modalInstance.hide();
            this.pregledData = { dijagnoza: '', terapija: '' };
            this.listaPotrosnje = [];
          },
          error: (err) => {
            console.error(err);
            Swal.fire({
              icon: 'error',
              title: 'Greška',
              text: err.error?.message || 'Došlo je do greške prilikom čuvanja pregleda.',
              confirmButtonColor: '#d33',
            });
          },
        });
      }
    });
  }

  // =================================================================
  // ZAKAZIVANJE (PACIJENT)
  // =================================================================

  pripremiDatumVreme() {
    if (this.izabranDatum && this.izabranoVreme) {
      this.noviTermin.datumVreme = `${this.izabranDatum}T${this.izabranoVreme}:00`;
    } else {
      this.noviTermin.datumVreme = '';
    }
  }

  ucitajSlobodneTermine() {
    this.slobodniTermini = [
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
    ];
    this.izabranoVreme = '';
  }

  zakazi() {
    this.pripremiDatumVreme();
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
    this.isProcessing = true; // Blokiranje dugmeta da ne klikne dvaput

    this.http.post('/api/termin/zakazi', this.noviTermin).subscribe({
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
        this.loadMyAppointments();
        this.ucitajSlobodneTermine();

        // 6. RESET FORME
        this.izabranoVreme = '';
        this.noviTermin = {
          stomatologId: this.noviTermin.stomatologId,
          uslugaId: this.noviTermin.uslugaId,
          datumVreme: '',
          napomena: '',
        };
      },
      error: (err) => {
        console.error('Greška pri zakazivanju:', err);
        this.isProcessing = false;
        Swal.fire({
          icon: 'error',
          title: 'Greška',
          text: err.error || 'Došlo je do greške na serveru.',
        });
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
      .put(`/api/inventar/azuriraj-kolicinu/${id}?novaKolicina=${nova}`, {})
      .subscribe(() => {
        stavka.kolicina = nova;
        this.cdr.detectChanges();
      });
  }

  saveNoviMaterijal() {
    if (!this.noviMaterijal.naziv || this.noviMaterijal.naziv.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Nedostaje naziv',
        text: 'Molimo vas unesite naziv novog materijala.',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }
    Swal.fire({
      title: 'Dodavanje u inventar...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    this.http.post('/api/inventar/dodaj', this.noviMaterijal).subscribe({
      next: (res: any) => {
        this.inventar.push(res);
        this.noviMaterijal = { naziv: '', kolicina: 0, opis: '' };
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Uspešno dodato!',
          text: 'Novi materijal je sada u listi.',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Greška',
          text: err.error?.message || 'Nije uspelo dodavanje materijala.',
          confirmButtonColor: '#d33',
        });
      },
    });
  }

  generisiTermine() {
    const termini = [];
    for (let sat = 9; sat <= 16; sat++) {
      termini.push(`${sat.toString().padStart(2, '0')}:00`);
      termini.push(`${sat.toString().padStart(2, '0')}:30`);
    }
    this.slobodniTermini = termini;
  }

  postaviGraniceDatuma() {
    // 1. Računamo SUTRAŠNJI datum (za minDatum)
    const sutra = new Date();
    sutra.setDate(sutra.getDate() + 1);

    // Ručno sklapamo YYYY-MM-DD (padStart dodaje nulu ako je jednocifren broj, npr. '05')
    const minGodina = sutra.getFullYear();
    const minMesec = String(sutra.getMonth() + 1).padStart(2, '0');
    const minDan = String(sutra.getDate()).padStart(2, '0');
    this.minDatum = `${minGodina}-${minMesec}-${minDan}`;

    // 2. Računamo datum za MESEC DANA unapred (za maxDatum)
    const maxDan = new Date(sutra);
    maxDan.setDate(sutra.getDate() + 7); // Možeš staviti 7 za nedelju dana

    const maxGodina = maxDan.getFullYear();
    const maxMesec = String(maxDan.getMonth() + 1).padStart(2, '0');
    const maxDanStr = String(maxDan.getDate()).padStart(2, '0');
    this.maxDatum = `${maxGodina}-${maxMesec}-${maxDanStr}`;

    // Ispis u konzoli da proverimo da li je format savršen (npr. "2026-03-01")
    console.log('Dozvoljeno od:', this.minDatum, 'do:', this.maxDatum);
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

  // Filter za pretragu
  get filteredAppointments() {
    if (!this.allAppointments || this.allAppointments.length === 0) return [];
    if (!this.appointmentSearch) return this.allAppointments;
    const s = this.appointmentSearch.toLowerCase();
    return this.allAppointments.filter(
      (t: any) =>
        t.pacijentIme?.toLowerCase().includes(s) ||
        t.stomatologIme?.toLowerCase().includes(s) ||
        t.status?.toLowerCase().includes(s),
    );
  }
  get paginatedAppointments() {
    const startIndex = (this.appointmentsPage - 1) * this.appointmentsPerPage;
    return this.filteredAppointments.slice(startIndex, startIndex + this.appointmentsPerPage);
  }

  //za stranice od 1 pa na vise
  get totalAppPages() {
    return Math.ceil(this.filteredAppointments.length / this.appointmentsPerPage);
  }
  get appPagesArray() {
    return Array(this.totalAppPages)
      .fill(0)
      .map((x, i) => i + 1);
  }
  changeAppPage(page: number) {
    if (page >= 1 && page <= this.totalAppPages) {
      this.appointmentsPage = page;
    }
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
  get paginatedUsers() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, startIndex + this.itemsPerPage);
  }
  get totalPages() {
    return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
  }
  get pagesArray() {
    return Array(this.totalPages)
      .fill(0)
      .map((x, i) => i + 1);
  }
  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
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
    Swal.fire({
      title: 'Plaćanje računa',
      html: `Iznos za uplatu: <b>${iznos} RSD</b>.<br>Da li želite da izvršite transakciju?`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="bi bi-credit-card-2-front"></i> Plati karticom',
      cancelButtonText: 'Odustani',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        this.isProcessing = true;
        Swal.fire({
          title: 'Procesiranje uplate...',
          html: 'Povezivanje sa procesorom kartica.<br><b>Molimo ne zatvarajte prozor.</b>',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        setTimeout(() => {
          this.http.post(`/api/racun/plati/${terminId}`, {}).subscribe({
            next: () => {
              this.isProcessing = false;
              Swal.fire({
                icon: 'success',
                title: 'Transakcija uspešna!',
                text: 'Vaša uplata je proknjižena i račun je izmiren.',
                timer: 3000,
                showConfirmButton: false,
              });

              this.loadMyAppointments();
            },
            error: (err) => {
              this.isProcessing = false;
              console.error(err);
              Swal.fire({
                icon: 'error',
                title: 'Transakcija odbijena',
                text:
                  err.error?.message ||
                  'Došlo je do greške prilikom naplate. Proverite stanje na računu.',
                confirmButtonColor: '#d33',
              });
            },
          });
        }, 3000);
      }
    });
  }
  getKriticniInventarCount(): number {
    if (!this.data || !this.data.inventar) return 0;
    return this.data.inventar.filter((i: any) => i.kolicina < 20).length;
  }

  getTerminiNaCekanjuCount(): number {
    if (!this.filteredAppointments) return 0;
    return this.filteredAppointments.filter((t) => t.status === 'NaCekanju').length;
  }
  getOdbijeniTerminiCount(): number {
    if (!this.filteredAppointments) return 0;
    return this.filteredAppointments.filter((t) => t.status === 'Odbijen' || t.status === 'Otkazan')
      .length;
  }

  getProcenatUspesnih(): number {
    if (!this.filteredAppointments || this.filteredAppointments.length === 0) return 0;
    const uspesni = this.filteredAppointments.filter(
      (t) => t.status === 'Prihvacen' || t.status === 'Zavrsen',
    ).length;
    return Math.round((uspesni / this.filteredAppointments.length) * 100);
  }
  prikaziIzvestaj(termin: any) {
    console.log('Ovo mi je stiglo sa servera za ovaj termin:', termin);
    Swal.fire({
      title: 'Medicinski izveštaj',
      html: `
        <div class="text-start mt-3">
          <p class="mb-1 text-muted small text-uppercase fw-bold">Detalji pregleda</p>
          <div class="bg-light p-3 rounded-3 mb-3 border">
            <p class="mb-1"><strong>Datum:</strong> ${new Date(termin.datumVreme).toLocaleDateString('sr-RS')}</p>
            <p class="mb-1"><strong>Stomatolog:</strong> Dr ${termin.stomatologIme}</p>
            <p class="mb-0"><strong>Usluga:</strong> ${termin.tretman}</p>
          </div>
          
          <p class="mb-1 text-muted small text-uppercase fw-bold">Nalaz lekara</p>
          <div class="bg-primary-subtle border-start border-primary border-4 p-3 rounded-end mb-3">
            <p class="mb-1"><strong>Dijagnoza:</strong> ${termin.dijagnoza || 'Nije uneta posebna dijagnoza.'}</p>
            <p class="mb-0"><strong>Terapija:</strong> ${termin.terapija || 'Redovan tretman završen.'}</p>
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Zatvori',
      confirmButtonColor: '#0d6efd',
    });
  }

  stampajRacun(termin: any) {
    const racun = termin.racun;
    
    // KLJUČNA PROMENA: Sada proveravamo i tvoju 'jePlacen' varijablu koja se pali na klik dugmeta Plati!
    const jePlacen = (racun && (racun.statusPlacanja === 0 || racun.statusPlacanja === 'Placeno')) || termin.jePlacen === true; 
    
    const statusTekst = jePlacen ? 'PLAĆENO' : 'NEPLAĆENO (PREDRAČUN)';
    const statusBoja = jePlacen ? 'green' : 'red';
    const nazivDokumenta = jePlacen ? 'Račun' : 'Predračun';
    
    const iznosZaNaplatu = racun ? racun.iznos : (termin.cena || 0);

    let datumUplateHtml = '';
    if (jePlacen) {
        // Ako tek platiš, racun.datumIzdavanja možda još nije ažuriran u memoriji, pa uzimamo današnji datum
        const datumIzdavanja = (racun && racun.datumIzdavanja) ? new Date(racun.datumIzdavanja).toLocaleDateString('sr-RS') : new Date().toLocaleDateString('sr-RS');
        const nacinPlacanjaTekst = (racun && racun.nacinPlacanja === 1) ? 'Kartica' : 'Gotovina';
        
        datumUplateHtml = `
            <strong>Datum uplate:</strong> ${datumIzdavanja}<br>
            <strong>Način plaćanja:</strong> ${nacinPlacanjaTekst}<br>
        `;
    }

    const racunHtml = `
      <html>
        <head>
          <title>${nazivDokumenta} - ${termin.id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #ddd; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #0d6efd; margin-bottom: 5px; }
            .info { margin-bottom: 40px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; }
            th { background-color: #f8f9fa; }
            .total { text-align: right; font-size: 20px; font-weight: bold; margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🦷 DentalCentar</div>
            <div>Vaš osmeh je naša briga</div>
          </div>
          
          <div class="info">
            <div>
              <strong>Pacijent:</strong> ${termin.pacijentIme || 'Nepoznat pacijent'}<br>
              <strong>Email:</strong> ${termin.pacijentEmail || '/'}
            </div>
            <div style="text-align: right;">
              <strong>Broj dokumenta:</strong> #RC-${racun ? racun.id : termin.id}-${new Date().getFullYear()}<br>
              ${datumUplateHtml}
              <strong>Status:</strong> <span style="color: ${statusBoja}; font-weight: bold;">${statusTekst}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Opis usluge</th>
                <th>Doktor</th>
                <th>Datum pregleda</th>
                <th style="text-align: right;">Iznos</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${termin.tretman || 'Stomatološka usluga'}</td>
                <td>Dr ${termin.stomatologIme || '/'}</td>
                <td>${new Date(termin.datumVreme).toLocaleDateString('sr-RS')}</td>
                <td style="text-align: right;">${iznosZaNaplatu} RSD</td>
              </tr>
            </tbody>
          </table>

          <div class="total">
            Ukupno za uplatu: ${iznosZaNaplatu} RSD
          </div>

          <div class="footer">
            Hvala Vam na poverenju!<br>
            Ovaj <strong>${nazivDokumenta.toLowerCase()}</strong> je elektronski generisan.
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(racunHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } else {
      Swal.fire('Greška', 'Vaš browser je blokirao iskačući prozor za štampu.', 'error');
    }
}
}
