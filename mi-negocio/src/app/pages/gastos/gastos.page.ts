import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AlertController, IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonInput, IonItem, IonList, IonNote, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/angular';
import { validarFechaLocal } from '../../domain/validaciones';
import { Gasto } from '../../models/gasto.model';
import { NegocioService } from '../../services/negocio.service';

const textoObligatorio: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  typeof c.value === 'string' && c.value.trim() ? null : { requerido: true };
const fechaValida: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  try { validarFechaLocal(c.value); return null; } catch { return { fechaInvalida: true }; }
};
const importeValido: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = c.value;
  return typeof v === 'number' && v > 0 && Math.abs(v * 100 - Math.round(v * 100)) < 1e-8 ? null : { importeInvalido: true };
};

@Component({
  selector: 'app-gastos', standalone: true, templateUrl: './gastos.page.html', styleUrls: ['./gastos.page.scss'],
  imports: [ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonList, IonItem, IonInput, IonNote, IonButton, IonSelect, IonSelectOption],
})
export class GastosPage {
  private readonly negocio = inject(NegocioService);
  private readonly fb = inject(FormBuilder);
  private readonly alertController = inject(AlertController);
  private readonly hoy = new Date();
  readonly fechaHoy = fechaLocal(this.hoy);
  readonly meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' }, { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' }, { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' }, { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' }, { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
  ];
  readonly mesSeleccionado = signal(this.hoy.getMonth() + 1);
  readonly anioSeleccionado = signal(this.hoy.getFullYear());
  readonly gastos = this.negocio.gastos;
  readonly gastosDelPeriodo = computed(() => {
    const prefijo = `${this.anioSeleccionado()}-${String(this.mesSeleccionado()).padStart(2, '0')}`;
    return this.gastos().filter((g) => g.fecha.startsWith(prefijo)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  });
  readonly totalDelPeriodo = computed(() => Math.round(this.gastosDelPeriodo().reduce((t, g) => t + g.importe, 0) * 100) / 100);
  readonly aniosDisponibles = computed(() => [...new Set([this.hoy.getFullYear(), ...this.gastos().map((g) => Number(g.fecha.slice(0, 4)))])].sort((a, b) => b - a));
  readonly formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  readonly formulario = this.fb.group({ fecha: [this.fechaHoy, fechaValida], concepto: ['', textoObligatorio], categoria: ['', textoObligatorio], importe: [null as number | null, importeValido] });
  idEditando: string | null = null;
  mensaje = '';
  procesando = false;

  async guardarGasto(): Promise<void> {
    this.mensaje = '';
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); this.mensaje = 'Revisa los campos marcados antes de guardar.'; return; }
    const v = this.formulario.getRawValue();
    if (v.importe === null) return;
    const datos = { fecha: v.fecha ?? '', concepto: v.concepto?.trim() ?? '', categoria: v.categoria?.trim() ?? '', importe: v.importe };
    this.procesando = true;
    try {
      if (this.idEditando) { await this.negocio.editarGasto(this.idEditando, datos); this.mensaje = 'Gasto actualizado correctamente.'; }
      else { await this.negocio.agregarGasto(datos); this.mensaje = 'Gasto registrado correctamente.'; }
      this.cancelarEdicion();
    } catch (e) { this.mensaje = e instanceof Error ? e.message : 'No fue posible guardar el gasto.'; }
    finally { this.procesando = false; }
  }
  prepararEdicion(g: Gasto): void { this.idEditando = g.id; this.formulario.reset({ fecha: g.fecha, concepto: g.concepto, categoria: g.categoria, importe: g.importe }); this.mensaje = 'Edita los datos del gasto y guarda los cambios.'; }
  cancelarEdicion(): void { this.idEditando = null; this.formulario.reset({ fecha: this.fechaHoy, concepto: '', categoria: '', importe: null }); }
  async solicitarEliminacion(g: Gasto): Promise<void> {
    const alerta = await this.alertController.create({ header: 'Eliminar gasto', message: `¿Deseas eliminar “${g.concepto}”? Esta acción no se puede deshacer.`, buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Eliminar', role: 'destructive', handler: () => { void this.eliminarGasto(g.id); } }] });
    await alerta.present();
  }
  cambiarMes(v: unknown): void { this.mesSeleccionado.set(Number(v)); }
  cambiarAnio(v: unknown): void { this.anioSeleccionado.set(Number(v)); }
  formatearMXN(importe: number): string { return this.formatoMoneda.format(importe); }
  campoInvalido(n: 'fecha' | 'concepto' | 'categoria' | 'importe'): boolean { const c = this.formulario.controls[n]; return c.invalid && (c.touched || c.dirty); }
  private async eliminarGasto(id: string): Promise<void> {
    this.mensaje = ''; this.procesando = true;
    try { await this.negocio.eliminarGasto(id); if (this.idEditando === id) this.cancelarEdicion(); this.mensaje = 'Gasto eliminado correctamente.'; }
    catch (e) { this.mensaje = e instanceof Error ? e.message : 'No fue posible eliminar el gasto.'; }
    finally { this.procesando = false; }
  }
}
function fechaLocal(fecha: Date): string { return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`; }
