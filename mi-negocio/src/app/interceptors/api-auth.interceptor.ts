import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Adjunta el JWT solo a la API propia; nunca a Frankfurter, DiceBear u otros servicios externos. */
export const apiAuthInterceptor: HttpInterceptorFn = (solicitud, siguiente) => {
  const auth = inject(AuthService);
  if (!solicitud.url.startsWith(environment.apiUrl)) return siguiente(solicitud);
  const token = auth.token();
  return token ? siguiente(solicitud.clone({ setHeaders: { Authorization: `Bearer ${token}` } })) : siguiente(solicitud);
};
