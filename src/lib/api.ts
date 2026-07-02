import supabase from './supabase';

export async function api(path: string, opts?: RequestInit) {
  const headers: Record<string, string> = {};
  if (opts?.headers) Object.assign(headers, opts.headers as Record<string, string>);

  // Auto-attach auth token if session exists (admin routes)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  } catch {}

  if (opts?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, { ...opts, headers });
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
