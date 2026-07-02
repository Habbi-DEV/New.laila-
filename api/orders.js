import supabase from './db-client.js';

function productsTotal(items) {
  return (items || []).reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0);
}

async function shippingFor(wilayaId, deliveryType) {
  const { data, error } = await supabase.from('wilayas').select('*').eq('id', Number(wilayaId)).single();
  if (error) throw new Error('Wilaya introuvable');
  const price = deliveryType === 'desk' ? Number(data.desk_shipping_price) : Number(data.home_shipping_price);
  return { price, name: data.name };
}

async function attachShipping(orders) {
  const ids = (orders || []).map(o => o.id);
  if (!ids.length) return orders;
  const { data: ship, error } = await supabase.from('order_shipping').select('*').in('order_id', ids);
  if (error) throw error;
  const smap = new Map((ship || []).map(s => [s.order_id, s]));
  return orders.map(o => ({ ...o, shipping: smap.get(o.id) || null }));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const out = await attachShipping(data || []);
      return res.status(200).json(out);
    }
    if (req.method === 'POST') {
      const { customer_name, phone, address, city, payment_method, items, wilaya_id, delivery_type } = req.body;
      if (!wilaya_id || !delivery_type) return res.status(400).json({ error: 'Wilaya et type de livraison requis' });
      const { price: shipping_price, name: wilaya_name } = await shippingFor(wilaya_id, delivery_type);
      const pTotal = productsTotal(items);
      const grandTotal = pTotal + shipping_price;
      const { data: order, error } = await supabase.from('orders').insert({
        customer_name, phone, address, city, total: grandTotal, payment_method: payment_method || 'cod', status: 'pending', items
      }).select().single();
      if (error) throw error;
      const { error: serr } = await supabase.from('order_shipping').insert({
        order_id: order.id, wilaya_id: Number(wilaya_id), wilaya_name, delivery_type, shipping_price
      });
      if (serr) throw serr;
      const { data: shipRow } = await supabase.from('order_shipping').select('*').eq('order_id', order.id).single();
      return res.status(201).json({ ...order, shipping: shipRow });
    }
    if (req.method === 'PUT') {
      const { id, status } = req.body;
      const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders error:', err);
    res.status(500).json({ error: err.message });
  }
}
