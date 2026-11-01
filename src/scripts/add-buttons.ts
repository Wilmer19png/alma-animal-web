// Cualquier botón [data-add] de la página agrega su producto al carrito, confirma con un ✓
// y muestra un aviso flotante con el producto, lo que falta para el envío gratis y «Ver carrito».
import { cart, progress, money } from './cart';

let live = document.querySelector<HTMLElement>('[data-announce]');
if (!live) { live = document.createElement('p'); live.className = 'sr-only'; live.setAttribute('aria-live', 'polite'); document.body.append(live); }

type Item = { name: string; variant: string; icon: string; tone: string };
let caja: HTMLElement | null = null;
let timer = 0;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// aviso «¡Agregado al carrito!» (lo usa también la página del producto)
export function avisarAgregado(item: Item, qty = 1) {
  live!.textContent = `${item.name} quedó en tu carrito.`;
  const sub = cart.subtotal(), p = progress(sub);
  const envio = p.toFree > 0 ? `Te faltan <b>${money(p.toFree)}</b> para el envío gratis a toda Colombia.` : '¡Tu pedido ya tiene <b>envío gratis</b>!';
  if (!caja) {
    caja = document.createElement('div');
    caja.className = 'toast-cart';
    caja.setAttribute('role', 'status');
    document.body.append(caja);
    caja.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('[data-toast-close]')) cerrar(); });
    caja.addEventListener('mouseenter', () => window.clearTimeout(timer));
    caja.addEventListener('mouseleave', () => { timer = window.setTimeout(cerrar, 2500); });
  }
  caja.innerHTML = `
    <span class="toast-cart__ic" style="background:${esc(item.tone)}"><span class="ms" aria-hidden="true">${esc(item.icon)}</span><i class="ms" aria-hidden="true">check</i></span>
    <span class="toast-cart__txt">
      <b>¡Agregado al carrito!</b>
      <span>${qty > 1 ? qty + ' × ' : ''}${esc(item.name)}${item.variant && item.variant !== 'Única' && item.variant !== 'Único' ? ' · ' + esc(item.variant) : ''}</span>
      <small>${envio}</small>
    </span>
    <span class="toast-cart__acts">
      <a class="toast-cart__go" href="/carrito">Ver carrito</a>
      <button type="button" class="toast-cart__x" data-toast-close aria-label="Cerrar aviso"><span class="ms" aria-hidden="true">close</span></button>
    </span>`;
  caja.classList.remove('is-on'); void caja.offsetWidth; caja.classList.add('is-on');
  // el ícono del carrito da un saltito
  document.querySelectorAll<HTMLElement>('[data-cart-link]').forEach((a) => { a.classList.remove('cart-hop'); void a.offsetWidth; a.classList.add('cart-hop'); });
  window.clearTimeout(timer);
  timer = window.setTimeout(cerrar, 4500);
}
function cerrar() { caja?.classList.remove('is-on'); }

document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-add]');
  if (!btn) return;
  const item = JSON.parse(btn.dataset.add!);
  cart.add(item);
  avisarAgregado(item);
  const ic = btn.querySelector('.ms');
  const was = ic?.textContent ?? 'add';
  btn.classList.add('is-added'); if (ic) ic.textContent = 'check';
  window.setTimeout(() => { btn.classList.remove('is-added'); if (ic) ic.textContent = was; }, 1200);
});
