import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonItem,
  IonList,
  IonNote,
} from '@ionic/angular';

import { Producto } from '../models/producto.model';
import { NegocioService } from '../services/negocio.service';
import { ProductoIconoService } from '../services/producto-icono.service';

const textoObligatorio: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() ? null : { requerido: true };

const enteroNoNegativo: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value;
  if (valor === null || valor === '' || typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) {
    return { enteroNoNegativo: true };
  }
  return null;
};

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonInput,
    IonButton,
    IonList,
    IonItem,
    IonNote,
    IonCard,
    IonCardContent,
    IonBadge,
  ],
})
export class HomePage {
  private readonly negocio = inject(NegocioService);
  private readonly iconos = inject(ProductoIconoService);
  private readonly formBuilder = inject(FormBuilder);

  readonly productosConStock = this.negocio.productosConStock;
  readonly formulario = this.formBuilder.group({
    nombre: ['', textoObligatorio],
    categoria: ['', textoObligatorio],
    stockInicial: [0 as number | null, enteroNoNegativo],
    stockMinimo: [2 as number | null, enteroNoNegativo],
  });

  mensaje = '';
  idEditando: string | null = null;
  procesando = false;

  async guardarProducto(): Promise<void> {
    this.mensaje = '';
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.mensaje = 'Revisa los campos marcados antes de guardar.';
      return;
    }

    const valores = this.formulario.getRawValue();
    const nombre = valores.nombre?.trim() ?? '';
    const categoria = valores.categoria?.trim() ?? '';
    const stockInicial = valores.stockInicial;
    const stockMinimo = valores.stockMinimo;
    if (stockInicial === null || stockMinimo === null) return;

    this.procesando = true;
    try {
      if (this.idEditando) {
        await this.negocio.editarProducto(this.idEditando, { nombre, categoria, stockMinimo });
        this.mensaje = 'Producto actualizado correctamente.';
      } else {
        await this.negocio.agregarProducto({ nombre, categoria, stockInicial, stockMinimo, activo: true });
        this.mensaje = 'Producto registrado correctamente.';
      }
      this.cancelarEdicion();
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : 'No fue posible guardar el producto.';
    } finally {
      this.procesando = false;
    }
  }

  prepararEdicion(producto: Producto): void {
    this.idEditando = producto.id;
    this.formulario.reset({
      nombre: producto.nombre,
      categoria: producto.categoria,
      stockInicial: producto.stockInicial,
      stockMinimo: producto.stockMinimo,
    });
    this.formulario.controls.stockInicial.disable();
    this.mensaje = 'Puedes editar el nombre, la categoría y el stock mínimo.';
  }

  cancelarEdicion(): void {
    this.idEditando = null;
    this.formulario.controls.stockInicial.enable();
    this.formulario.reset({ nombre: '', categoria: '', stockInicial: 0, stockMinimo: 2 });
  }

  async cambiarEstado(producto: Producto): Promise<void> {
    this.mensaje = '';
    this.procesando = true;
    try {
      const activo = !producto.activo;
      await this.negocio.actualizarEstadoProducto(producto.id, activo);
      this.mensaje = activo ? 'Producto reactivado.' : 'Producto marcado como inactivo.';
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : 'No fue posible actualizar el producto.';
    } finally {
      this.procesando = false;
    }
  }

  campoInvalido(nombre: 'nombre' | 'categoria' | 'stockInicial' | 'stockMinimo'): boolean {
    const campo = this.formulario.controls[nombre];
    return campo.invalid && (campo.touched || campo.dirty);
  }

  obtenerIconoProducto(producto: Producto): string {
    return this.iconos.obtenerUrl(producto.id);
  }
}
