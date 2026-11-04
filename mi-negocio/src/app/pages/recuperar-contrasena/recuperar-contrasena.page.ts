import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonInput, IonItem, IonList, IonNote, IonTitle, IonToolbar } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-recuperar-contrasena', standalone: true, templateUrl: './recuperar-contrasena.page.html',
  imports: [ReactiveFormsModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonInput, IonItem, IonList, IonNote, IonButton],
})
export class RecuperarContrasenaPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly formulario = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    codigo: ['', [Validators.required, Validators.pattern(/^[A-Fa-f0-9]{10}$/)]],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
  });
  codigoEnviado = false;
  procesando = false;
  mensaje = '';

  async solicitar(): Promise<void> {
    const email = this.formulario.controls.email;
    if (this.procesando || email.invalid) { email.markAsTouched(); return; }
    this.procesando = true; this.mensaje = '';
    try { await this.auth.solicitarRecuperacion(email.value); this.codigoEnviado = true; this.mensaje = 'Si la cuenta existe y está verificada, enviamos un código al correo.'; }
    catch (error) { this.mensaje = error instanceof Error ? error.message : 'No fue posible solicitar el código.'; }
    finally { this.procesando = false; }
  }

  async confirmar(): Promise<void> {
    if (this.procesando) return;
    this.mensaje = '';
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); return; }
    this.procesando = true;
    try {
      const { email, codigo, contrasena } = this.formulario.getRawValue();
      await this.auth.confirmarRecuperacion(email, codigo, contrasena);
      this.mensaje = 'Contraseña actualizada. Ahora puedes iniciar sesión.';
      await this.router.navigateByUrl('/tabs/login');
    } catch (error) { this.mensaje = error instanceof Error ? error.message : 'No fue posible actualizar la contraseña.'; }
    finally { this.procesando = false; }
  }
}
