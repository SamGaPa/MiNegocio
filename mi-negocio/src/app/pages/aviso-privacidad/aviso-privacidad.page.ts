import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, shieldCheckmarkOutline } from 'ionicons/icons';

@Component({
  selector: 'app-aviso-privacidad',
  standalone: true,
  templateUrl: './aviso-privacidad.page.html',
  styleUrls: ['./aviso-privacidad.page.scss'],
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonButton, IonIcon],
})
export class AvisoPrivacidadPage {
  constructor() {
    addIcons({ arrowBackOutline, shieldCheckmarkOutline });
  }
}
