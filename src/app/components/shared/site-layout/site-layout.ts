import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from '../footer/footer';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-site-layout',
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './site-layout.html',
})
export class SiteLayout {}
