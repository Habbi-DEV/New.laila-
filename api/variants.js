import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const pid = req.query.product_id;
      const { data, error } = await supabase.from('product_variants').select('*').eq('product_id', Number(pid)).order('is_default', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      // supports single or batch (array)
      const body = req.body;
      const rows = Array.isArray(body) ? body : [body];
      const { data, error } = await supabase.from('product_variants').insert(rows).select();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      // batch replace all variants for a product: { product_id, variants: [...] }
      const { product_id, variants } = req.body;
      await supabase.from('product_variants').delete().eq('product_id', product_id);
      if (variants && variants.length) {
        const { data, error } = await supabase.from('product_variants').insert(variants).select();
        if (error) throw error;
        return res.status(200).json(data);
      }
      return res.status(200).json([]);
    }
    if (req.method === 'DELETE') {
      const id = req.query.id || req.body?.id;
      const { error } = await supabase.from('product_variants').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('variants error:', err);
    res.status(500).json({ error: err.message });
  }
}