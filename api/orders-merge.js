import supabase from './db-client.js';
import { verifyAdmin } from './verify-admin.js';

function productsTotal(items) {
  return (items || []).reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Accès administrateur requis' });

  try {
    if (req.method === 'POST') {
      const { primary_id, secondary_ids } = req.body;
      if (!primary_id || !Array.isArray(secondary_ids) || !secondary_ids.length)
        return res.status(400).json({ error: 'primary_id et secondary_ids requis' });

      const { data: primary, error: perr } = await supabase.from('orders').select('*').eq('id', Number(primary_id)).single();
      if (perr) throw perr;

      const { data: secondaries, error: serr } = await supabase.from('orders').select('*').in('id', secondary_ids.map(Number));
      if (serr) throw serr;

      const combined = [...(primary.items || []), ...secondaries.flatMap(s => s.items || [])];
      const pTotal = productsTotal(combined);

      const { data: ship, error: sherr } = await supabase.from('order_shipping').select('*').eq('order_id', primary.id).single();
      const shippingPrice = ship ? Number(ship.shipping_price) : 0;
      const grandTotal = pTotal + shippingPrice;

      const { data: updated, error: uerr } = await supabase.from('orders').update({ items: combined, total: grandTotal }).eq('id', primary.id).select().single();
      if (uerr) throw uerr;

      const { error: merr } = await supabase.from('order_merges').insert(
        secondary_ids.map(sid => ({ primary_order_id: primary.id, merged_order_id: Number(sid) }))
      );
      if (merr) throw merr;

      const { error: superr } = await supabase.from('orders').update({ status: 'merged' }).in('id', secondary_ids.map(Number));
      if (superr) throw superr;

      return res.status(200).json({ primary: { ...updated, shipping: ship }, merged_count: secondary_ids.length });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders-merge error:', err);
    res.status(500).json({ error: err.message });
  }
}
