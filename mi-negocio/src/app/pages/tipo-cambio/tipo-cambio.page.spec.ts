import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TipoCambioUsdMxn } from '../../models/tipo-cambio.model';
import { TipoCambioService } from '../../services/tipo-cambio.service';
import { TipoCambioPage } from './tipo-cambio.page';

describe('TipoCambioPage', () => {
  let fixture: ComponentFixture<TipoCambioPage>;
  const tasa: TipoCambioUsdMxn = { date: '2026-10-28', base: 'USD', quote: 'MXN', rate: 20 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipoCambioPage],
      providers: [{ provide: TipoCambioService, useValue: { consultarUsdMxn: () => Promise.resolve(tasa) } }],
    }).compileComponents();
    fixture = TestBed.createComponent(TipoCambioPage);
    fixture.detectChanges();
  });

  it('convierte 10 USD a 200 MXN usando la tasa consultada', async () => {
    fixture.componentInstance.formulario.controls.importeUsd.setValue(10);
    await fixture.componentInstance.consultarYConvertir();
    expect(fixture.componentInstance.conversion()?.importeMxn).toBe(200);
  });

  it('rechaza importes vacíos, negativos, con más de dos decimales o excesivos', () => {
    const control = fixture.componentInstance.formulario.controls.importeUsd;
    for (const importe of [null, -1, 1.234, 1_000_000.01]) {
      control.setValue(importe);
      expect(control.invalid).toBe(true);
    }
  });
});
