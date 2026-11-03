import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonList, IonNote, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logInOutline, personAddOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { NegocioService } from '../../services/negocio.service';

@Component({
  selector: 'app-login', standalone: true, templateUrl: './login.page.html', styleUrls: ['./login.page.scss'],
  imports: [ReactiveFormsModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonButton, IonIcon, IonInput, IonItem, IonList, IonNote],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly negocio = inject(NegocioService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly usuario = this.auth.usuario;
  readonly formulario = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], contrasena: ['', Validators.required] });
  procesando = false;
  mensaje = '';

  constructor() { addIcons({ logInOutline, personAddOutline, shieldCheckmarkOutline }); }

  async iniciarSesion(): Promise<void> {
    if (this.procesando) return;
    this.mensaje = '';
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); return; }
    this.procesando = true;
    try {
      const { email, contrasena } = this.formulario.getRawValue();
      await this.auth.iniciarSesion(email, contrasena);
      await this.negocio.sincronizarConServidor();
      this.formulario.reset();
      await this.router.navigateByUrl('/tabs/inicio');
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : 'No fue posible iniciar sesión.';
    } finally { this.procesando = false; }
  }

  cerrarSesion(): void { this.auth.cerrarSesion(); this.negocio.limpiarEstadoEnMemoria(); this.mensaje = ''; }
}
