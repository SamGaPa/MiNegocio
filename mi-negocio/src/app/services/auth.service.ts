import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UsuarioAutenticado { id: string; email: string; nombre: string | null; }
interface RespuestaAutenticacion { token: string; usuario: UsuarioAutenticado; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenInterno = signal<string | null>(null);
  private readonly usuarioInterno = signal<UsuarioAutenticado | null>(null);

  readonly token = this.tokenInterno.asReadonly();
  readonly usuario = this.usuarioInterno.asReadonly();
  readonly estaAutenticado = computed(() => this.tokenInterno() !== null);

  async iniciarSesion(email: string, contrasena: string): Promise<void> {
    const respuesta = await this.solicitar('/api/v1/auth/login', { email, contrasena });
    this.establecerSesion(respuesta);
  }

  async registrar(email: string, contrasena: string, aceptaAvisoPrivacidad: true): Promise<void> {
    const respuesta = await this.solicitar('/api/v1/auth/registro', { email, contrasena, aceptaAvisoPrivacidad });
    this.establecerSesion(respuesta);
  }

  cerrarSesion(): void { this.tokenInterno.set(null); this.usuarioInterno.set(null); }

  private async solicitar(ruta: string, cuerpo: object): Promise<RespuestaAutenticacion> {
    try {
      return await firstValueFrom(this.http.post<RespuestaAutenticacion>(`${environment.apiUrl}${ruta}`, cuerpo));
    } catch (error) { throw new Error(mensajeDeError(error)); }
  }

  private establecerSesion(respuesta: RespuestaAutenticacion): void {
    if (!respuesta.token || !respuesta.usuario?.id || !respuesta.usuario.email) throw new Error('La respuesta del servidor no es válida.');
    this.tokenInterno.set(respuesta.token);
    this.usuarioInterno.set(respuesta.usuario);
  }
}

function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No fue posible conectar con el servidor. Verifica que la API esté en ejecución.';
    if (typeof error.error?.error === 'string') return error.error.error;
  }
  return 'No fue posible completar la solicitud. Inténtalo de nuevo.';
}
