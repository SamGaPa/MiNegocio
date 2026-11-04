import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'inicio',
        loadComponent: () => import('./pages/inicio/inicio.page').then((m) => m.InicioPage),
      },
      {
        path: 'gastos',
        loadComponent: () => import('./pages/gastos/gastos.page').then((m) => m.GastosPage),
      },
      {
        path: 'inventario',
        loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'movimientos',
        loadComponent: () => import('./pages/movimientos/movimientos.page').then((m) => m.MovimientosPage),
      },
      {
        path: 'tipo-cambio',
        loadComponent: () => import('./pages/tipo-cambio/tipo-cambio.page').then((m) => m.TipoCambioPage),
      },
      {
        path: 'login',
        loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'registro',
        loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage),
      },
      {
        path: 'verificar-cuenta',
        loadComponent: () => import('./pages/verificar-cuenta/verificar-cuenta.page').then((m) => m.VerificarCuentaPage),
      },
      {
        path: 'recuperar-contrasena',
        loadComponent: () => import('./pages/recuperar-contrasena/recuperar-contrasena.page').then((m) => m.RecuperarContrasenaPage),
      },
      {
        path: 'aviso-privacidad',
        loadComponent: () =>
          import('./pages/aviso-privacidad/aviso-privacidad.page').then((m) => m.AvisoPrivacidadPage),
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  {
    path: 'home',
    redirectTo: 'tabs/inventario',
    pathMatch: 'full',
  },
  { path: '', redirectTo: 'tabs/inicio', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs/inicio' },
];
