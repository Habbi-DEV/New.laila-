import supabase from './db-client.js';
import { verifyAdmin } from './verify-admin.js';

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

async function attachTracking(orders) {
  const ids = (orders || []).map(o => o.id);
  if (!ids.length) return orders;
  const { data: track, error } = await supabase.from('order_tracking').select('*').in('order_id', ids);
  if (error) throw error;
  const tmap = new Map((track || []).map(t => [t.order_id, t]));
  return orders.map(o => ({
    ...o,
    tracking_number: tmap.get(o.id)?.tracking_number || null,
    shipping_voucher_url: tmap.get(o.id)?.shipping_voucher_url || null,
  }));
}

async function attachBlacklist(orders) {
  const phones = [...new Set((orders || []).map(o => (o.phone || '').replace(/\s/g, '')).filter(Boolean))];
  if (!phones.length) return orders;
  const { data: bl, error } = await supabase.from('customers').select('phone,is_blacklisted').in('phone', phones);
  if (error) throw error;
  const blSet = new Set((bl || []).filter(c => c.is_blacklisted).map(c => c.phone));
  return orders.map(o => ({ ...o, is_blacklisted: blSet.has((o.phone || '').replace(/\s/g, '')) }));
}

async function restoreStock(orderId) {
  const { data: order, error: oerr } = await supabase.from('orders').select('items,status').eq('id', Number(orderId)).single();
  if (oerr) throw oerr;
  if (!order.items || !order.items.length) return;
  for (const it of order.items) {
    if (!it.variantId || !it.size) continue;
    const { data: variant, error: verr } = await supabase.from('product_variants').select('id,sizes,color_name,product_id').eq('id', Number(it.variantId)).single();
    if (verr || !variant) continue;

    const { data: product } = await supabase.from('products').select('name').eq('id', variant.product_id).single();

    const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];
    const oldStock = sizes.find(s => s.size === it.size)?.stock || 0;
    const updated = sizes.map(s =>
      s.size === it.size ? { ...s, stock: Number(s.stock || 0) + Number(it.qty || 0) } : s
    );
    if (!updated.some(s => s.size === it.size)) {
      updated.push({ size: it.size, stock: Number(it.qty || 0) });
    }
    const { error: uerr } = await supabase.from('product_variants').update({ sizes: updated }).eq('id', variant.id);
    if (uerr) console.error('stock restore failed for variant', variant.id, uerr.message);

    await supabase.from('stock_logs').insert({
      variant_id: variant.id,
      product_name: product?.name || '',
      color_name: variant.color_name || '',
      size: it.size,
      old_stock: oldStock,
      new_stock: oldStock + Number(it.qty || 0),
      change_type: 'return',
    });
  }
}

async function validateStock(items) {
  if (!items || !items.length) return null;
  for (const it of items) {
    if (!it.variantId || !it.size) continue;
    const { data: variant, error } = await supabase
      .from('product_variants').select('id,sizes,color_name,product_id').eq('id', Number(it.variantId)).single();
    if (error || !variant) return `Variante introuvable pour ${it.name || 'un produit'}`;
    const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];
    const sizeEntry = sizes.find(s => s.size === it.size);
    const available = Number(sizeEntry?.stock || 0);
    if (available < Number(it.qty || 0)) {
      return `Stock insuffisant: ${it.name} — ${variant.color_name} · T.${it.size} (disponible: ${available}, demandé: ${it.qty})`;
    }
  }
  return null;
}

async function deductStock(orderId) {
  const { data: order, error: oerr } = await supabase.from('orders').select('items').eq('id', Number(orderId)).single();
  if (oerr) throw oerr;
  if (!order.items || !order.items.length) return;
  for (const it of order.items) {
    if (!it.variantId || !it.size) continue;
    const { data: variant, error: verr } = await supabase
      .from('product_variants').select('id,sizes,color_name,product_id').eq('id', Number(it.variantId)).single();
    if (verr || !variant) continue;

    const { data: product } = await supabase.from('products').select('name').eq('id', variant.product_id).single();

    const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];
    const oldStock = sizes.find(s => s.size === it.size)?.stock || 0;
    const updated = sizes.map(s =>
      s.size === it.size ? { ...s, stock: Math.max(0, Number(s.stock || 0) - Number(it.qty || 0)) } : s
    );
    const { error: uerr } = await supabase.from('product_variants').update({ sizes: updated }).eq('id', variant.id);
    if (uerr) console.error('stock deduct failed for variant', variant.id, uerr.message);

    await supabase.from('stock_logs').insert({
      variant_id: variant.id,
      product_name: product?.name || '',
      color_name: variant.color_name || '',
      size: it.size,
      old_stock: oldStock,
      new_stock: Math.max(0, oldStock - Number(it.qty || 0)),
      change_type: 'sale',
    });
  }
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
      let out = await attachShipping(data || []);
      out = await attachTracking(out);
      out = await attachBlacklist(out);
      return res.status(200).json(out);
    }
    if (req.method === 'POST') {
      const { customer_name, phone, address, city, payment_method, items, wilaya_id, delivery_type } = req.body;
      if (!wilaya_id || !delivery_type) return res.status(400).json({ error: 'Wilaya et type de livraison requis' });

      const stockError = await validateStock(items);
      if (stockError) return res.status(409).json({ error: stockError });

      const { price: shipping_price, name: wilaya_name } = await shippingFor(wilaya_id, delivery_type);
      const pTotal = productsTotal(items);
      const grandTotal = pTotal + shipping_price;
      const { data: order, error } = await supabase.from('orders').insert({
        customer_name, phone, address, city, total: grandTotal, payment_method: payment_method || 'cod', status: 'pending', items,
      }).select().single();
      if (error) throw error;

      await deductStock(order.id);

      const { error: serr } = await supabase.from('order_shipping').insert({
        order_id: order.id, wilaya_id: Number(wilaya_id), wilaya_name, delivery_type, shipping_price,
      });
      if (serr) throw serr;
      try {
        await supabase.from('customers').upsert({ phone, name: customer_name }, { onConflict: 'phone' });
      } catch (e) { /* non-fatal */ }
      const { data: shipRow } = await supabase.from('order_shipping').select('*').eq('order_id', order.id).single();
      return res.status(201).json({ ...order, shipping: shipRow });
    }
    if (req.method === 'PUT') {
      const admin = await verifyAdmin(req);
      if (!admin) return res.status(403).json({ error: 'Accès administrateur requis' });

      const { id, status } = req.body;
      if (status === 'returned' || status === 'cancelled') {
        await restoreStock(id);
      }
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
