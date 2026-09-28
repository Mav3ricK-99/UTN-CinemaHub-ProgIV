import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const VERSION_BACKOFFICE = '1.0.0';

@Component({
  selector: 'app-footer-backoffice',
  imports: [RouterLink],
  templateUrl: './footer-backoffice.html',
})
export class FooterBackoffice {
  protected readonly anioActual = new Date().getFullYear();
  protected readonly version = VERSION_BACKOFFICE;
}
