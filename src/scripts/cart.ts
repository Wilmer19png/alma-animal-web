// Carrito del navegador. Vive en localStorage de cada visitante (no se comparte ni llega al gestor
// hasta que hace el pedido). Si el navegador bloquea el almacenamiento, funciona solo en memoria.
import { SHIPPING, GIFT } from '../data/shop';

export interface CartItem { key: string; id: string; vid?: string; name: string; variant: string; price: number; qty: number; icon: string; tone: string; max: number }

const KEY = 'alma-carrito';
let memory: CartItem[] = [];

const read = (): CartItem[] => {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as CartItem[]) : memory; } catch { return memory; }
};
const write = (items: CartItem[]) => {
  memory = items;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* sin almacenamiento */ }
  document.dispatchEvent(new CustomEvent('cart:change', { detail: items }));
};

export const cart = {
  items: read,
  count: () => read().reduce((s, i) => s + i.qty, 0),
  subtotal: () => read().reduce((s, i) => s + i.qty * i.price, 0),
  add(item: Omit<CartItem, 'key' | 'qty'>, qty = 1) {
    const key = item.vid ?? `${item.id}:${item.variant}`;
    const items = read();
    const found = items.find((i) => i.key === key);
    if (found) found.qty = Math.min(found.qty + qty, item.max);
    else items.push({ ...item, key, qty: Math.min(qty, item.max) });
    write(items);
  },
  setQty(key: string, qty: number) {
    const items = read().map((i) => (i.key === key ? { ...i, qty: Math.max(0, Math.min(qty, i.max)) } : i)).filter((i) => i.qty > 0);
    write(items);
  },
  remove(key: string) { write(read().filter((i) => i.key !== key)); },
  clear() { write([]); },
  onChange(fn: (items: CartItem[]) => void) {
    document.addEventListener('cart:change', () => fn(read()));
    // otra pestaña cambió el carrito
    window.addEventListener('storage', (e) => { if (e.key === KEY) fn(read()); });
  }
};

// cuánto falta para el envío gratis a toda Colombia y para el obsequio
export const progress = (subtotal: number) => ({
  toFree: Math.max(0, SHIPPING.freeFrom - subtotal),
  freePct: Math.min(100, Math.round((subtotal / SHIPPING.freeFrom) * 100)),
  toGift: Math.max(0, GIFT.from - subtotal)
});

export const money = (n: number) => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
