// Convierte un documento (carnet, resumen de atención) en un archivo PDF y lo descarga.
// Se arma fuera de la vista, a un ancho fijo, se fotografía con html2canvas y se reparte en páginas carta.
// Las librerías se cargan solo al descargar, para que el gestor y el portal sigan livianos.
import { createElement, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

const ANCHO = 820; // px del documento al armarlo

export async function descargarPdf(doc: ReactElement, nombre: string): Promise<void> {
  const caja = document.createElement('div');
  caja.className = 'pdf-caja';
  caja.style.cssText = `position:fixed;left:-10000px;top:0;width:${ANCHO}px;background:#fff;`;
  document.body.append(caja);
  const raiz = createRoot(caja);
  try {
    raiz.render(createElement('div', { className: 'pdf-hoja' }, doc));
    await new Promise((r) => setTimeout(r, 60));
    // espera las imágenes (logo, firma) y las fuentes
    await Promise.all([...caja.querySelectorAll('img')].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
    await document.fonts?.ready;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
    const lienzo = await html2canvas(caja, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 28;
    const ancho = W - M * 2, escala = ancho / lienzo.width, altoPag = (H - M * 2) / escala; // alto de cada página en px del lienzo
    for (let y = 0, pag = 0; y < lienzo.height; y += altoPag, pag++) {
      const trozo = document.createElement('canvas');
      trozo.width = lienzo.width; trozo.height = Math.min(altoPag, lienzo.height - y);
      trozo.getContext('2d')!.drawImage(lienzo, 0, -y);
      if (pag) pdf.addPage();
      pdf.addImage(trozo.toDataURL('image/jpeg', 0.92), 'JPEG', M, M, ancho, trozo.height * escala);
    }
    pdf.save(nombre);
  } finally {
    raiz.unmount();
    caja.remove();
  }
}
export const nombreArchivo = (...partes: string[]) =>
  partes.join('-').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '.pdf';
