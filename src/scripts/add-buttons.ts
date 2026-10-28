// Cualquier botón [data-add] de la página agrega su producto al carrito y confirma con un ✓.
import { cart } from './cart';

let live = document.querySelector<HTMLElement>('[data-announce]');
if (!live) { live = document.createElement('p'); live.className = 'sr-only'; live.setAttribute('aria-live', 'polite'); document.body.append(live); }
document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-add]');
  if (!btn) return;
  const item = JSON.parse(btn.dataset.add!);
  cart.add(item);
  live!.textContent = `${item.name} quedó en tu carrito.`;
  const ic = btn.querySelector('.ms');
  btn.classList.add('is-added'); if (ic) ic.textContent = 'check';
  window.setTimeout(() => { btn.classList.remove('is-added'); if (ic) ic.textContent = 'add'; }, 1200);
});
