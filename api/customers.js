import supabase from './db-client.js';
import { verifyAdmin } from './verify-admin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Accès administrateur requis' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { phone, name } = req.body;
      if (!phone) return res.status(400).json({ error: 'phone requis' });
      const { data: existing } = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle();
      if (existing) return res.status(200).json(existing);
      const { data, error } = await supabase.from('customers').insert({ phone, name }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { phone, is_blacklisted, name } = req.body;
      if (!phone) return res.status(400).json({ error: 'phone requis' });
      const { data: existing } = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle();
      if (existing) {
        const { data, error } = await supabase.from('customers').update({ is_blacklisted, name: name || existing.name }).eq('id', existing.id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      const { data, error } = await supabase.from('customers').insert({ phone, name, is_blacklisted }).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('customers error:', err);
    res.status(500).json({ error: err.message });
  }
}
