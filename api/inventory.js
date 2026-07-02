import supabase from './db-client.js';
import { verifyAdmin } from './verify-admin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Accès administrateur requis' });

  try {
    if (req.method === 'GET') {
      const { data: categories, error: cerr } = await supabase.from('categories').select('*');
      if (cerr) throw cerr;
      const catMap = new Map(categories.map(c => [c.id, c.name]));

      const { data: products, error: perr } = await supabase.from('products').select('*').order('name', { ascending: true });
      if (perr) throw perr;

      const { data: variants, error: verr } = await supabase.from('product_variants').select('*').order('product_id', { ascending: true });
      if (verr) throw verr;

      const { data: logs, error: lerr } = await supabase.from('stock_logs').select('*').order('created_at', { ascending: false }).limit(20);
      if (lerr) throw lerr;

      const variantsByProduct = new Map();
      for (const v of variants || []) {
        if (!variantsByProduct.has(v.product_id)) variantsByProduct.set(v.product_id, []);
        variantsByProduct.get(v.product_id).push(v);
      }

      const result = (products || []).map(p => {
        const pvars = variantsByProduct.get(p.id) || [];
        const def = pvars.find(v => v.is_default) || pvars[0];
        const cover = def?.images?.[0] || pvars[0]?.images?.[0] || null;
        return {
          id: p.id,
          name: p.name,
          category_name: catMap.get(p.category_id) || null,
          cover_image: cover,
          variants: pvars.map(v => ({
            id: v.id,
            color_name: v.color_name,
            color_hex: v.color_hex,
            sizes: v.sizes || [],
            images: v.images || [],
          })),
        };
      });

      return res.status(200).json({ products: result, logs: logs || [] });
    }

    if (req.method === 'PUT') {
      const { variant_id, size, stock } = req.body;
      if (!variant_id || !size) return res.status(400).json({ error: 'variant_id et size requis' });

      const { data: variant, error: verr } = await supabase
        .from('product_variants').select('id,sizes,color_name,product_id').eq('id', Number(variant_id)).single();
      if (verr) throw verr;

      const { data: product } = await supabase.from('products').select('name').eq('id', variant.product_id).single();

      const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];
      const oldStock = sizes.find(s => s.size === size)?.stock || 0;
      const updated = sizes.map(s => s.size === size ? { ...s, stock: Number(stock) } : s);
      if (!updated.some(s => s.size === size)) updated.push({ size, stock: Number(stock) });

      const { error: uerr } = await supabase.from('product_variants').update({ sizes: updated }).eq('id', variant.id);
      if (uerr) throw uerr;

      await supabase.from('stock_logs').insert({
        variant_id: variant.id,
        product_name: product?.name || '',
        color_name: variant.color_name || '',
        size,
        old_stock: oldStock,
        new_stock: Number(stock),
        change_type: 'manual',
      });

      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('inventory error:', err);
    res.status(500).json({ error: err.message });
  }
}
