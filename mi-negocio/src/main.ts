import { inject, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { NegocioService } from './app/services/negocio.service';
import { apiAuthInterceptor } from './app/interceptors/api-auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideHttpClient(withInterceptors([apiAuthInterceptor])),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideAppInitializer(() => inject(NegocioService).inicializar().catch(() => undefined)),
  ],
});
