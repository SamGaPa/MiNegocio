import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonCheckbox, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonList, IonNote, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, personAddOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-registro', standalone: true, templateUrl: './registro.page.html', styleUrls: ['./registro.page.scss'],
  imports: [ReactiveFormsModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonButton, IonIcon, IonInput, IonItem, IonList, IonNote, IonCheckbox],
})
export class RegistroPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly formulario = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], contrasena: ['', [Validators.required, Validators.minLength(8)]], confirmacion: ['', Validators.required], aceptaAvisoPrivacidad: [false, Validators.requiredTrue] });
  procesando = false;
  mensaje = '';
  exito = false;

  constructor() { addIcons({ arrowBackOutline, personAddOutline }); }

  async registrar(): Promise<void> {
    if (this.procesando) return;
    this.mensaje = ''; this.exito = false;
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); return; }
    const { email, contrasena, confirmacion } = this.formulario.getRawValue();
    if (contrasena !== confirmacion) { this.mensaje = 'Las contraseñas no coinciden.'; return; }
    this.procesando = true;
    try {
      const correoVerificacion = await this.auth.registrar(email, contrasena, true);
      this.formulario.reset();
      this.exito = true;
      this.mensaje = 'Cuenta creada. Revisa tu correo para obtener el código de verificación.';
      await this.router.navigate(['/tabs/verificar-cuenta'], { queryParams: { email: correoVerificacion } });
    } catch (error) { this.mensaje = error instanceof Error ? error.message : 'No fue posible completar el registro simulado.'; }
    finally { this.procesando = false; }
  }
}
