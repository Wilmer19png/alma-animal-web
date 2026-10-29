// Monta una pantalla del gestor en <div id="app">. Se usa un script normal (y no una "isla" de Astro)
// para que el gestor también funcione en la vista previa que se abre con doble clic.
import { createElement, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

export function montar(Pantalla: ComponentType) {
  const el = document.getElementById('app');
  if (el) createRoot(el).render(createElement(Pantalla));
}
