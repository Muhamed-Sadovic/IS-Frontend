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
  currentPage: number = 1;
  itemsPerPage: number = 10;
  appointmentsPage: number = 1;
  appointmentsPerPage: number = 10;

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
    Swal.fire({
      title: 'Da li ste sigurni?',
      text: 'Ova akcija će trajno obrisati korisnika i sve njegove termine!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33', // Crveno dugme za brisanje
      cancelButtonColor: '#6c757d', // Sivo za odustajanje
      confirmButtonText: '<i class="bi bi-trash3 me-1"></i> Da, obriši!',
      cancelButtonText: 'Odustani',
      reverseButtons: true, // Stavlja "Odustani" levo, a "Obriši" desno (bolji UX)
    }).then((result) => {
      // Ako je korisnik kliknuo "Da, obriši!"
      if (result.isConfirmed) {
        // Opciono: Prikaži loading dok se čeka odgovor sa servera
        Swal.fire({
          title: 'Brisanje u toku...',
          text: 'Molimo sačekajte.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        // Šaljemo zahtev na backend
        this.http.delete(`https://localhost:7075/api/user/${id}`).subscribe({
          next: () => {
            // Uklanjamo iz niza na frontendu
            this.users = this.users.filter((u) => u.id !== id);
            this.cdr.detectChanges();

            // Prikazujemo poruku o uspehu
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
        this.http.delete(`https://localhost:7075/api/termin/${id}`).subscribe({
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
    // 1. Prilagođavamo tekst pitanja zavisno od toga šta radimo (Prihvatamo ili Odbijamo)
    const isPrihvatanje = status === 'Prihvacen';
    const naslov = isPrihvatanje ? 'Potvrda termina' : 'Odbijanje termina';
    const tekst = isPrihvatanje
      ? 'Da li ste sigurni da želite da potvrdite termin? Pacijent će dobiti email obaveštenje.'
      : 'Da li ste sigurni da želite da odbijete termin? Pacijent će biti obavešten emailom.';
    const bojaDugmeta = isPrihvatanje ? '#198754' : '#d33'; // Zelena ili Crvena

    // 2. Pitamo za potvrdu
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
        // 3. Prikazujemo LOADING dok backend šalje email
        Swal.fire({
          title: 'Slanje obaveštenja...',
          text: 'Molimo sačekajte dok server šalje email pacijentu.',
          allowOutsideClick: false, // Ne dajemo da zatvori dok radi
          didOpen: () => {
            Swal.showLoading();
          },
        });

        // 4. Šaljemo zahtev
        this.http
          .put(`https://localhost:7075/api/termin/promeni-status/${id}`, `"${status}"`, {
            headers: { 'Content-Type': 'application/json' },
          })
          .subscribe({
            next: () => {
              // 5. Uspeh - Zatvaramo loading i prikazujemo uspeh
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
              // 6. Greška
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
    // Koristimo tačan naziv ViewChild-a: docModalElement
    const el = this.docModalElement.nativeElement;
    const modal = bootstrap.Modal.getOrCreateInstance(el);
    modal.show();
  }

  saveStomatolog() {
    // 1. VALIDACIJA: Provera da li su sva polja popunjena
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

    // 2. Prikaz loading-a
    Swal.fire({
      title: 'Kreiranje naloga...',
      text: 'Molimo sačekajte.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    this.http.post('https://localhost:7075/api/user/dodaj-stomatologa', this.noviDoc).subscribe({
      next: () => {
        this.isSaving = false;

        // Resetovanje forme
        this.noviDoc = { ime: '', prezime: '', email: '', lozinka: '' };

        // Zatvaranje Bootstrap modala
        const modalInstance = bootstrap.Modal.getInstance(this.docModalElement.nativeElement);
        if (modalInstance) {
          modalInstance.hide();
        }

        // Osvežavanje liste korisnika ako smo na tom tabu
        if (this.adminTab === 'users') this.loadUsers();

        // 3. USPEH
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

        // 4. GREŠKA
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

    // 2. Potvrda akcije (Confirmation Dialog)
    Swal.fire({
      title: 'Završetak pregleda',
      text: 'Da li ste sigurni da želite da sačuvate nalaz i razdužite utrošeni materijal?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754', // Zelena za potvrdu
      cancelButtonColor: '#6c757d', // Siva za odustajanje
      confirmButtonText: '<i class="bi bi-save me-1"></i> Da, završi',
      cancelButtonText: 'Odustani',
    }).then((result) => {
      if (result.isConfirmed) {
        // 3. Prikazujemo Loading
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

        this.http
          .put(
            `https://localhost:7075/api/stomatolog/zavrsi-pregled/${this.selectedTermin.id}`,
            body,
          )
          .subscribe({
            next: () => {
              // 4. Uspeh
              Swal.fire({
                icon: 'success',
                title: 'Pregled završen!',
                text: 'Podaci su sačuvani, a materijal je uspešno razdužen.',
                timer: 2000,
                showConfirmButton: false,
              });

              // Osvežavanje podataka
              this.loadDoctorData();
              this.loadInventar(); // Veoma bitno da se vidi novo stanje u magacinu

              // Zatvaranje Bootstrap modala
              if (this.modalInstance) this.modalInstance.hide();

              // Opciono: Očistiti formu
              this.pregledData = { dijagnoza: '', terapija: '' };
              this.listaPotrosnje = [];
            },
            error: (err) => {
              // 5. Greška
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
    // 1. VALIDACIJA: Provera da li je unet naziv
    if (!this.noviMaterijal.naziv || this.noviMaterijal.naziv.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Nedostaje naziv',
        text: 'Molimo vas unesite naziv novog materijala.',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }

    // 2. Prikaz loading-a dok se čuva
    Swal.fire({
      title: 'Dodavanje u inventar...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    this.http.post('https://localhost:7075/api/inventar/dodaj', this.noviMaterijal).subscribe({
      next: (res: any) => {
        // Ažuriranje liste na ekranu
        this.inventar.push(res);

        // Resetovanje forme
        this.noviMaterijal = { naziv: '', kolicina: 0, opis: '' };
        this.cdr.detectChanges();

        // 3. USPEH (Timer od 1.5 sekundi, da ne mora da klikće OK)
        Swal.fire({
          icon: 'success',
          title: 'Uspešno dodato!',
          text: 'Novi materijal je sada u listi.',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        // 4. GREŠKA
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
        t.status?.toLowerCase().includes(s),
    );
  }
  get paginatedAppointments() {
    const startIndex = (this.appointmentsPage - 1) * this.appointmentsPerPage;
    return this.filteredAppointments.slice(startIndex, startIndex + this.appointmentsPerPage);
  }

  // 3. UKUPNO STRANICA ZA TERMINE (NOVO)
  get totalAppPages() {
    return Math.ceil(this.filteredAppointments.length / this.appointmentsPerPage);
  }

  // 4. NIZ ZA DUGMIĆE (NOVO)
  get appPagesArray() {
    return Array(this.totalAppPages)
      .fill(0)
      .map((x, i) => i + 1);
  }

  // 5. PROMENA STRANICE (NOVO)
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

  // 3. NOVO: UKUPAN BROJ STRANICA
  get totalPages() {
    return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
  }

  // 4. NOVO: NIZ ZA DUGMIĆE [1, 2, 3...]
  get pagesArray() {
    return Array(this.totalPages)
      .fill(0)
      .map((x, i) => i + 1);
  }

  // 5. NOVO: PROMENA STRANICE
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
    // 1. KONFIRMACIJA - Lep prikaz iznosa
    Swal.fire({
      title: 'Plaćanje računa',
      html: `Iznos za uplatu: <b>${iznos} RSD</b>.<br>Da li želite da izvršite transakciju?`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#198754', // Zelena (boja novca)
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="bi bi-credit-card-2-front"></i> Plati karticom',
      cancelButtonText: 'Odustani',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        this.isProcessing = true;

        // 2. PROCESIRANJE (Simulacija banke)
        // Prikazujemo ovaj prozor dok teče onih tvojih 3 sekunde
        Swal.fire({
          title: 'Procesiranje uplate...',
          html: 'Povezivanje sa procesorom kartica.<br><b>Molimo ne zatvarajte prozor.</b>',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        setTimeout(() => {
          this.http.post(`https://localhost:7075/api/racun/plati/${terminId}`, {}).subscribe({
            next: () => {
              this.isProcessing = false;

              // 3. USPEH
              Swal.fire({
                icon: 'success',
                title: 'Transakcija uspešna!',
                text: 'Vaša uplata je proknjižena i račun je izmiren.',
                timer: 3000, // Malo duže da stignu da pročitaju
                showConfirmButton: false,
              });

              this.loadMyAppointments();
            },
            error: (err) => {
              this.isProcessing = false;

              // 4. GREŠKA
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
        }, 3000); // Tvojih 3 sekunde čekanja
      }
    });
  }
}
