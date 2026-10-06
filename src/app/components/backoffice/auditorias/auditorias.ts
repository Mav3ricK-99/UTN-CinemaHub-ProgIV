import { DatePipe } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { TableModule } from 'primeng/table';

import { AuditoriaService } from '../../../services/auditoria.service';

@Component({
  selector: 'app-auditorias',
  imports: [DatePipe, TableModule],
  templateUrl: './auditorias.html',
})
export class Auditorias {
  private readonly auditoriaService = inject(AuditoriaService);

  protected readonly auditorias = resource({ loader: () => this.auditoriaService.obtenerAuditorias() });
}
