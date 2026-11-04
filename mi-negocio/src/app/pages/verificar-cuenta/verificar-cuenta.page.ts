import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonInput, IonItem, IonList, IonNote, IonTitle, IonToolbar } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { NegocioService } from '../../services/negocio.service';

@Component({
  selector: 'app-verificar-cuenta', standalone: true, templateUrl: './verificar-cuenta.page.html',
  imports: [ReactiveFormsModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonInput, IonItem, IonList, IonNote, IonButton],
})
export class VerificarCuentaPage {
  private readonly auth = inject(AuthService);
  private readonly negocio = inject(NegocioService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly formulario = this.fb.nonNullable.group({
    email: [this.ruta.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
    codigo: ['', [Validators.required, Validators.pattern(/^[A-Fa-f0-9]{10}$/)]],
  });
  procesando = false;
  mensaje = '';

  async confirmar(): Promise<void> {
    if (this.procesando) return;
    this.mensaje = '';
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); return; }
    this.procesando = true;
    try {
      const { email, codigo } = this.formulario.getRawValue();
      await this.auth.confirmarVerificacion(email, codigo);
      await this.negocio.sincronizarConServidor();
      await this.router.navigateByUrl('/tabs/inicio');
    } catch (error) { this.mensaje = error instanceof Error ? error.message : 'No fue posible verificar el correo.'; }
    finally { this.procesando = false; }
  }

  async reenviar(): Promise<void> {
    const email = this.formulario.controls.email;
    if (email.invalid) { email.markAsTouched(); return; }
    this.procesando = true; this.mensaje = '';
    try { await this.auth.solicitarVerificacion(email.value); this.mensaje = 'Enviamos un nuevo código a tu correo.'; }
    catch (error) { this.mensaje = error instanceof Error ? error.message : 'No fue posible enviar el código.'; }
    finally { this.procesando = false; }
  }
}
