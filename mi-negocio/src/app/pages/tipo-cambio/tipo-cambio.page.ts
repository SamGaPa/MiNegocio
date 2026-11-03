import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonInput, IonItem, IonList, IonNote, IonTitle, IonToolbar } from '@ionic/angular';
import { TipoCambioUsdMxn } from '../../models/tipo-cambio.model';
import { TipoCambioService } from '../../services/tipo-cambio.service';

const MAXIMO_USD = 1_000_000;
const importeUsdValido: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value;
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0 || valor > MAXIMO_USD || Math.abs(valor * 100 - Math.round(valor * 100)) > 1e-8) {
    return { importeInvalido: true };
  }
  return null;
};

type EstadoConsulta = 'inicial' | 'cargando' | 'exito' | 'error';
interface Conversion { importeUsd: number; importeMxn: number; tasa: TipoCambioUsdMxn; }

@Component({
  selector: 'app-tipo-cambio', standalone: true, templateUrl: './tipo-cambio.page.html', styleUrls: ['./tipo-cambio.page.scss'],
  imports: [ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonList, IonItem, IonInput, IonNote, IonButton],
})
export class TipoCambioPage {
  private readonly servicio = inject(TipoCambioService);
  private readonly fb = inject(FormBuilder);
  readonly formulario = this.fb.group({ importeUsd: [null as number | null, importeUsdValido] });
  readonly estado = signal<EstadoConsulta>('inicial');
  readonly conversion = signal<Conversion | null>(null);
  readonly mensajeError = signal('');
  readonly formatoUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  readonly formatoMxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  readonly maximoUsd = MAXIMO_USD;

  limpiarResultado(): void {
    if (this.conversion()) { this.conversion.set(null); this.estado.set('inicial'); }
    this.mensajeError.set('');
  }

  async consultarYConvertir(): Promise<void> {
    if (this.estado() === 'cargando') return;
    this.limpiarResultado();
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); return; }
    const importeUsd = this.formulario.controls.importeUsd.value;
    if (importeUsd === null) return;
    this.estado.set('cargando');
    try {
      const tasa = await this.servicio.consultarUsdMxn();
      this.conversion.set({ importeUsd, importeMxn: Math.round(importeUsd * tasa.rate * 100) / 100, tasa });
      this.estado.set('exito');
    } catch (error) {
      this.estado.set('error');
      this.mensajeError.set(mensajeComprensible(error));
    }
  }

  campoInvalido(): boolean { const control = this.formulario.controls.importeUsd; return control.invalid && (control.touched || control.dirty); }
  formatearUsd(valor: number): string { return this.formatoUsd.format(valor); }
  formatearMxn(valor: number): string { return this.formatoMxn.format(valor); }
}

function mensajeComprensible(error: unknown): string {
  if (error instanceof Error && error.message.includes('tasa')) return error.message;
  if (error instanceof Error && error.message.includes('par USD/MXN')) return error.message;
  if (error instanceof Error && error.name === 'TimeoutError') return 'La consulta tardó demasiado. Verifica tu conexión e inténtalo de nuevo.';
  return 'No fue posible consultar la tasa de cambio. Verifica tu conexión e inténtalo de nuevo.';
}
