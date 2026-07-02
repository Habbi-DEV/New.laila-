export async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, opts);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export function jbody(data: unknown) {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}
