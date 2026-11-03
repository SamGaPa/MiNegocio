import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonItem, IonList, IonNote, IonSelect, IonSelectOption, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { NegocioService } from '../../services/negocio.service';

@Component({
  selector: 'app-inicio', standalone: true, templateUrl: './inicio.page.html', styleUrls: ['./inicio.page.scss'],
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonSelect, IonSelectOption, IonItem, IonList, IonNote, IonButton],
})
export class InicioPage {
  private readonly negocio = inject(NegocioService);
  private readonly hoy = new Date();
  readonly mesSeleccionado = signal(this.hoy.getMonth() + 1);
  readonly anioSeleccionado = signal(this.hoy.getFullYear());
  readonly productosActivos = this.negocio.productosActivos;
  readonly productosConStockBajo = this.negocio.productosConStockBajo;
  readonly gastos = this.negocio.gastos;
  readonly aniosDisponibles = computed(() => [...new Set([this.hoy.getFullYear(), ...this.gastos().map((g) => Number(g.fecha.slice(0, 4)))])].sort((a, b) => b - a));
  readonly totalMensual = computed(() => this.negocio.totalGastosDelPeriodo(this.anioSeleccionado(), this.mesSeleccionado()));
  readonly formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  readonly meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  cambiarMes(v: unknown): void { this.mesSeleccionado.set(Number(v)); }
  cambiarAnio(v: unknown): void { this.anioSeleccionado.set(Number(v)); }
  formatearMXN(valor: number): string { return this.formatoMoneda.format(valor); }
}
