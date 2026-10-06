import { CurrencyPipe } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ComboService } from '../../../services/combo.service';

@Component({
  selector: 'app-combos',
  imports: [CurrencyPipe, RouterLink, TableModule, TagModule],
  templateUrl: './combos.html',
})
export class Combos {
  private readonly comboService = inject(ComboService);

  protected readonly combos = resource({ loader: () => this.comboService.obtenerCombos() });
}
