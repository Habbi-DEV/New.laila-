import supabase from './db-client.js';
import { verifyAdmin } from './verify-admin.js';

function withCategoryName(products, categories) {
  const cmap = new Map(categories.map(c => [c.id, c]));
  return products.map(p => ({
    ...p,
    category_name: cmap.get(p.category_id)?.name || null,
    category_slug: cmap.get(p.category_id)?.slug || null,
  }));
}

function attachVariantsSummary(products, variants) {
  const byPid = new Map();
  for (const v of variants) {
    if (!byPid.has(v.product_id)) byPid.set(v.product_id, []);
    byPid.get(v.product_id).push(v);
  }
  return products.map(p => {
    const pv = byPid.get(p.id) || [];
    const def = pv.find(v => v.is_default) || pv[0];
    const cover = def?.images?.[0] || pv[0]?.images?.[0] || null;
    const colors = pv.map(v => ({ hex: v.color_hex, name: v.color_name, type: v.color_type }));
    const totalStock = pv.reduce((s, v) => s + ((v.sizes || []).reduce((q, sz) => q + Number(sz.stock || 0), 0)), 0);
    // Collect unique available sizes (stock > 0) across all variants
    const sizeSet = new Set();
    for (const v of pv) {
      for (const sz of (v.sizes || [])) {
        if (Number(sz.stock) > 0) sizeSet.add(sz.size);
      }
    }
    const sizes = [...sizeSet].sort((a, b) => Number(a) - Number(b));
    return { ...p, cover_image: cover, colors, in_stock: totalStock > 0, sizes };
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const id = req.query.id;
      const cat = req.query.category;
      const featured = req.query.featured === 'true';

      const { data: categories, error: cerr } = await supabase.from('categories').select('*');
      if (cerr) throw cerr;

      let q = supabase.from('products').select('*');
      if (id) q = q.eq('id', id);
      else if (cat) {
        const cid = (categories.find(c => c.slug === cat) || {}).id;
        if (cid) q = q.eq('category_id', cid);
      }
      if (featured && !id) q = q.eq('featured', true);
      q = q.order('created_at', { ascending: false });
      const { data: products, error: perr } = await q;
      if (perr) throw perr;

      const out = withCategoryName(products, categories);

      if (id) {
        const { data: variants, error: verr } = await supabase.from('product_variants').select('*').eq('product_id', Number(id)).order('is_default', { ascending: false });
        if (verr) throw verr;
        return res.status(200).json({ product: out[0], variants });
      }

      const pids = out.map(p => p.id);
      let variants = [];
      if (pids.length) {
        const { data: vdata, error: verr2 } = await supabase.from('product_variants').select('*').in('product_id', pids);
        if (verr2) throw verr2;
        variants = vdata || [];
      }
      return res.status(200).json(attachVariantsSummary(out, variants));
    }

    const admin = await verifyAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Accès administrateur requis' });

    if (req.method === 'POST') {
      const { name, description, category_id, price, discount, status, featured } = req.body;
      const { data, error } = await supabase.from('products').insert({
        name, description, category_id, price, discount: discount || 0, status: status || 'draft', featured: !!featured,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, name, description, category_id, price, discount, status, featured } = req.body;
      const { data, error } = await supabase.from('products').update({
        name, description, category_id, price, discount, status, featured,
      }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const id = req.query.id || req.body?.id;
      await supabase.from('product_variants').delete().eq('product_id', Number(id));
      const { error } = await supabase.from('products').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('products error:', err);
    res.status(500).json({ error: err.message });
  }
}
