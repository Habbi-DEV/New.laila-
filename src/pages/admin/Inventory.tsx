import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Save, RotateCcw, TrendingUp, X } from 'lucide-react';
import AdminShell from '../../components/admin/AdminShell';
import Spinner from '../../components/customer/Spinner';
import { api, jbody } from '../../lib/api';

interface InventoryVariant {
  id: number;
  color_name: string;
  color_hex: string;
  sizes: { size: string; stock: number }[];
  images: string[];
}

interface InventoryProduct {
  id: number;
  name: string;
  category_name: string;
  cover_image: string;
  variants: InventoryVariant[];
}

interface StockLog {
  id: number;
  product_name: string;
  color_name: string;
  size: string;
  old_stock: number;
  new_stock: number;
  change_type: string;
  created_at: string;
}

export default function AdminInventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    api('/api/inventory').then((data: { products: InventoryProduct[]; logs: StockLog[] }) => {
      setProducts(data.products);
      setLogs(data.logs);
    }).catch(e => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);

  const onEdit = (variantId: number, size: string, currentStock: number) => {
    setEditing(e => ({ ...e, [`${variantId}-${size}`]: String(currentStock) }));
  };

  const saveStock = async (variantId: number, size: string) => {
    const key = `${variantId}-${size}`;
    const val = editing[key];
    if (val === undefined) return;
    setSaving(key);
    try {
      await api('/api/inventory', { method: 'PUT', ...jbody({ variant_id: variantId, size, stock: Number(val) }) });
      setEditing(e => { const n = { ...e }; delete n[key]; return n; });
      refresh();
    } catch (e: any) { setErr(e.message); }
    setSaving(null);
  };

  const saveAllForVariant = async (v: InventoryVariant) => {
    const keys = Object.keys(editing).filter(k => k.startsWith(`${v.id}-`));
    for (const k of keys) {
      const [, size] = k.split('-');
      await saveStock(v.id, size);
    }
  };

  const cancelVariant = (v: InventoryVariant) => {
    setEditing(e => {
      const n = { ...e };
      Object.keys(n).filter(k => k.startsWith(`${v.id}-`)).forEach(k => delete n[k]);
      return n;
    });
  };

  const totalStock = (v: InventoryVariant) => v.sizes.reduce((s, x) => s + Number(x.stock || 0), 0);
  const lowStock = (v: InventoryVariant) => v.sizes.some(s => Number(s.stock) <= 2 && Number(s.stock) > 0);
  const outStock = (v: InventoryVariant) => v.sizes.every(s => Number(s.stock) <= 0);
  const hasEdits = (v: InventoryVariant) => Object.keys(editing).some(k => k.startsWith(`${v.id}-`));

  return (
    <AdminShell title="Inventaire">
      <h1 className="font-serif text-2xl mb-1">Inventaire</h1>
      <p className="text-xs text-ink/50 mb-4">Gérez les stocks par variante et taille</p>

      {loading ? <Spinner className="py-20" /> : err ? <p className="text-rose text-sm text-center py-20">{err}</p> : (
        <>
          <div className="space-y-3">
            {products.map((p, pi) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-soft">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-softgray shrink-0">
                    {p.cover_image ? <img src={p.cover_image} className="w-full h-full object-cover" /> : <Package size={20} className="m-auto mt-3.5 text-ink/20" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm truncate">{p.name}</p>
                    <p className="text-[10px] text-ink/40">{p.category_name}</p>
                  </div>
                </div>

                {p.variants.map(v => {
                  const isOut = outStock(v);
                  const isLow = lowStock(v);
                  return (
                    <div key={v.id} className="border-t border-bordergray pt-3 mt-2 first:border-0 first:mt-0 first:pt-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full ring-1 ring-bordergray" style={{ background: v.color_hex }} />
                          <span className="text-xs font-medium">{v.color_name}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isOut ? 'bg-rose/15 text-rose' : isLow ? 'bg-gold/20 text-gold' : 'bg-green-100 text-green-700'}`}>
                          {totalStock(v)} en stock
                        </span>
                      </div>

                      <div className={`grid gap-1.5 ${v.sizes.length > 4 ? 'grid-cols-6' : 'grid-cols-3'}`}>
                        {v.sizes.map(s => {
                          const key = `${v.id}-${s.size}`;
                          const isEditing = key in editing;
                          const val = editing[key];
                          const low = Number(s.stock) <= 2;
                          return (
                            <div key={s.size} className="rounded-lg border border-bordergray overflow-hidden">
                              <div className="bg-softgray text-center text-[9px] py-0.5 font-medium text-ink/60">{s.size}</div>
                              {isEditing ? (
                                <input type="number" min="0" value={val} onChange={e => setEditing(ed => ({ ...ed, [key]: e.target.value }))}
                                  className="w-full h-8 text-center text-sm bg-white outline-none focus:bg-burgundy/5" autoFocus />
                              ) : (
                                <button onClick={() => onEdit(v.id, s.size, s.stock)}
                                  className={`w-full h-8 text-sm font-medium tap ${low ? 'text-rose' : 'text-ink'}`}>
                                  {s.stock}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {hasEdits(v) && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2 mt-2">
                          <button onClick={() => saveAllForVariant(v)} disabled={saving !== null}
                            className="tap flex-1 h-8 rounded-lg bg-burgundy text-white text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                            {saving && saving.startsWith(`${v.id}-`) ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={13} /> Enregistrer</>}
                          </button>
                          <button onClick={() => cancelVariant(v)} className="tap h-8 px-3 rounded-lg border border-bordergray text-ink/60 text-xs flex items-center gap-1"><X size={13} /> Annuler</button>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            ))}
          </div>

          {/* Stock activity log */}
          {logs.length > 0 && (
            <div className="mt-6">
              <h2 className="font-serif text-lg mb-3 flex items-center gap-2"><RotateCcw size={16} className="text-rose" /> Activité stock</h2>
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="bg-white rounded-xl p-3 shadow-soft flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.change_type === 'return' ? 'bg-rose/15 text-rose' : 'bg-burgundy/10 text-burgundy'}`}>
                      {log.change_type === 'return' ? <RotateCcw size={14} /> : <TrendingUp size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{log.product_name} · {log.color_name} · T.{log.size}</p>
                      <p className="text-[10px] text-ink/50">
                        {log.change_type === 'return' ? <span className="text-rose">↩ Retour auto (+stock)</span> : 'Ajustement manuel'} · {' '}
                        {new Date(log.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-ink/40">{log.old_stock}</span>
                      <span className="text-[10px] text-ink/40 mx-1">→</span>
                      <span className={`text-xs font-semibold ${log.new_stock > log.old_stock ? 'text-green-600' : 'text-rose'}`}>{log.new_stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
