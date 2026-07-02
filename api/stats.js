import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const [{ count: products }, { count: orders }, { data: orderRows }] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total,status').order('created_at', { ascending: false }).limit(50),
    ]);
    const revenue = (orderRows || []).reduce((s, o) => s + Number(o.total || 0), 0);
    const pending = (orderRows || []).filter(o => o.status === 'pending').length;
    return res.status(200).json({
      products: products || 0, orders: orders || 0, revenue, pending, recent: orderRows || []
    });
  } catch (err) {
    console.error('stats error:', err);
    res.status(500).json({ error: err.message });
  }
}