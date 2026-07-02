import supabase from './db-client.js';
import { verifyAdmin } from './verify-admin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('categories').select('*').order('id', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data);
    }
    // POST requires admin
    const admin = await verifyAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Accès administrateur requis' });
    if (req.method === 'POST') {
      const { name, slug, image } = req.body;
      const { data, error } = await supabase.from('categories').insert({ name, slug, image }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('categories error:', err);
    res.status(500).json({ error: err.message });
  }
}
