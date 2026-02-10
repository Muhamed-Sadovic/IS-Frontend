import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; // <--- OVO TI FALI

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './error-page.html',
  styleUrl: './error-page.scss',
})
export class ErrorPage {

}
