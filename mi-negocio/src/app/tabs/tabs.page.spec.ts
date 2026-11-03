import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { TabsPage } from './tabs.page';

describe('TabsPage', () => {
  it('utiliza únicamente el outlet interno de Ionic para evitar superponer las páginas', async () => {
    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [provideRouter([]), provideIonicAngular()],
    }).compileComponents();
    const fixture = TestBed.createComponent(TabsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('ion-router-outlet').length).toBe(1);
  });
});
