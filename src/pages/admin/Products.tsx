import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import AdminShell from '../../components/admin/AdminShell';
import Spinner from '../../components/customer/Spinner';
import { api, jbody } from '../../lib/api';
import { effectivePrice } from '../../lib/cart';
import type { Product } from '../../lib/types';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const refresh = () => { setLoading(true); api('/api/products').then(setProducts).catch(e => setErr(e.message)).finally(() => setLoading(false)); };
  useEffect(() => { refresh(); }, []);

  const del = async (id: number) => {
    if (!confirm('Supprimer ce produit ?')) return;
    await api(`/api/products?id=${id}`, { method: 'DELETE' });
    refresh();
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminShell title="Produits">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl">Produits</h1>
        <Link to="/admin/products/new" className="tap w-10 h-10 rounded-full bg-burgundy text-white flex items-center justify-center shadow-lift"><Plus size={20} /></Link>
      </div>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-bordergray bg-white text-sm focus:border-burgundy outline-none" />
      </div>
      {loading ? <Spinner className="py-20" /> : err ? <p className="text-rose text-sm text-center py-20">{err}</p> : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-soft"><p className="text-sm text-ink/40">Aucun produit</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p, i) => {
            const fp = effectivePrice(Number(p.price), Number(p.discount || 0));
            const cp = p as any;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-soft">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-softgray shrink-0">
                  {cp.cover_image ? <img src={cp.cover_image} className="w-full h-full object-cover" /> : <div className="w-full h-full shimmer" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-burgundy font-semibold">{fp.toFixed(0)} DH</span>
                    {Number(p.discount) > 0 && <span className="text-[10px] text-ink/40 line-through">{Number(p.price).toFixed(0)}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-ink/10 text-ink/50'}`}>{p.status === 'active' ? 'Actif' : 'Brouillon'}</span>
                  </div>
                </div>
                <Link to={`/admin/products/${p.id}/edit`} className="tap p-2 text-ink/50"><Pencil size={16} /></Link>
                <button onClick={() => del(p.id)} className="tap p-2 text-ink/40 hover:text-rose"><Trash2 size={16} /></button>
              </motion.div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
