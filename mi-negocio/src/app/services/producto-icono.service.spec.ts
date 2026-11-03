import { ProductoIconoService } from './producto-icono.service';

describe('ProductoIconoService', () => {
  it('genera una URL HTTPS de DiceBear basada solo en el identificador del producto', () => {
    const servicio = new ProductoIconoService();
    const url = new URL(servicio.obtenerUrl('550e8400-e29b-41d4-a716-446655440000'));
    expect(url.origin).toBe('https://api.dicebear.com');
    expect(url.pathname).toBe('/10.x/icons/svg');
    expect(url.searchParams.get('seed')).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(url.search).not.toContain('nombre');
    expect(url.search).not.toContain('categoria');
  });

  it('mantiene el icono estable para el mismo producto', () => {
    const servicio = new ProductoIconoService();
    expect(servicio.obtenerUrl('producto-1')).toBe(servicio.obtenerUrl('producto-1'));
  });
});
