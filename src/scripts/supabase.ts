// Conexión mínima con Supabase (sin librería): solo lo que la página pública necesita.
// La clave "anon" es pública por diseño; lo que protege los datos son las reglas (RLS) de cada tabla.
const URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

export const supabaseReady = Boolean(URL && KEY);

// inserta una fila; devuelve true si quedó guardada
export async function insert(table: string, row: Record<string, unknown>): Promise<boolean> {
  if (!URL || !KEY) return false;
  try {
    const res = await fetch(`${URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row)
    });
    return res.ok;
  } catch {
    return false;
  }
}
