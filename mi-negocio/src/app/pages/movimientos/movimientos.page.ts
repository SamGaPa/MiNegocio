import { Component, computed, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonInput, IonItem, IonList, IonNote, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/angular';
import { validarFechaLocal } from '../../domain/validaciones';
import { TipoMovimiento } from '../../models/movimiento.model';
import { NegocioService } from '../../services/negocio.service';

const requerido: ValidatorFn = (c: AbstractControl): ValidationErrors | null => typeof c.value === 'string' && c.value.trim() ? null : { requerido: true };
const cantidadPositiva: ValidatorFn = (c: AbstractControl): ValidationErrors | null => typeof c.value === 'number' && Number.isInteger(c.value) && c.value > 0 ? null : { cantidadInvalida: true };
const fechaValida: ValidatorFn = (c: AbstractControl): ValidationErrors | null => { try { validarFechaLocal(c.value); return null; } catch { return { fechaInvalida: true }; } };

@Component({
  selector: 'app-movimientos', standalone: true, templateUrl: './movimientos.page.html', styleUrls: ['./movimientos.page.scss'],
  imports: [ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonList, IonItem, IonInput, IonNote, IonButton, IonSelect, IonSelectOption],
})
export class MovimientosPage {
  private readonly negocio = inject(NegocioService);
  private readonly fb = inject(FormBuilder);
  private readonly hoy = new Date();
  readonly fechaHoy = `${this.hoy.getFullYear()}-${String(this.hoy.getMonth() + 1).padStart(2, '0')}-${String(this.hoy.getDate()).padStart(2, '0')}`;
  readonly productosActivos = computed(() => this.negocio.productosConStock().filter((detalle) => detalle.producto.activo));
  readonly movimientos = computed(() => {
    const productos = new Map(this.negocio.productos().map((producto) => [producto.id, producto]));
    return this.negocio.movimientos().map((movimiento) => ({ movimiento, producto: productos.get(movimiento.productoId) })).sort((a, b) => b.movimiento.fecha.localeCompare(a.movimiento.fecha));
  });
  readonly formulario = this.fb.group({ productoId: ['', requerido], tipo: ['entrada' as TipoMovimiento, requerido], cantidad: [null as number | null, cantidadPositiva], fecha: [this.fechaHoy, fechaValida], motivo: ['', requerido] });
  mensaje = '';
  procesando = false;

  async guardarMovimiento(): Promise<void> {
    this.mensaje = '';
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); this.mensaje = 'Revisa los campos marcados antes de guardar.'; return; }
    const v = this.formulario.getRawValue();
    if (v.cantidad === null) return;
    this.procesando = true;
    try {
      await this.negocio.registrarMovimiento({ productoId: v.productoId ?? '', tipo: v.tipo ?? 'entrada', cantidad: v.cantidad, fecha: v.fecha ?? '', motivo: v.motivo?.trim() ?? '' });
      this.formulario.reset({ productoId: '', tipo: 'entrada', cantidad: null, fecha: this.fechaHoy, motivo: '' });
      this.mensaje = 'Movimiento registrado correctamente.';
    } catch (e) { this.mensaje = e instanceof Error ? e.message : 'No fue posible registrar el movimiento.'; }
    finally { this.procesando = false; }
  }
  campoInvalido(n: 'productoId' | 'tipo' | 'cantidad' | 'fecha' | 'motivo'): boolean { const c = this.formulario.controls[n]; return c.invalid && (c.touched || c.dirty); }
}
