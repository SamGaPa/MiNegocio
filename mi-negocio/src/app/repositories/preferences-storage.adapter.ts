import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

/** Aísla Capacitor para que el repositorio sea comprobable sin un dispositivo. */
@Injectable({ providedIn: 'root' })
export class PreferencesStorageAdapter {
  async obtener(clave: string): Promise<string | null> {
    const resultado = await Preferences.get({ key: clave });
    return resultado.value;
  }

  async guardar(clave: string, valor: string): Promise<void> {
    await Preferences.set({ key: clave, value: valor });
  }
}
