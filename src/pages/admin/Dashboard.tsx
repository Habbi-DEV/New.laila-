import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ShoppingBag, DollarSign, Clock, Plus, ArrowRight } from 'lucide-react';
import AdminShell from '../../components/admin/AdminShell';
import Spinner from '../../components/customer/Spinner';
import { api } from '../../lib/api';

interface Stats { products: number; orders: number; revenue: number; pending: number; recent: any[] }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/stats').then(setStats).catch(e => setErr(e.message)).finally(() => setLoading(false)); }, []);

  const cards = [
    { label: 'Produits', value: stats?.products ?? 0, icon: Package, tint: 'bg-burgundy/10 text-burgundy' },
    { label: 'Commandes', value: stats?.orders ?? 0, icon: ShoppingBag, tint: 'bg-rose/15 text-rose' },
    { label: 'Revenu', value: `${(stats?.revenue ?? 0).toFixed(0)} DH`, icon: DollarSign, tint: 'bg-gold/20 text-gold' },
    { label: 'En attente', value: stats?.pending ?? 0, icon: Clock, tint: 'bg-ink/10 text-ink/60' },
  ];

  return (
    <AdminShell title="Tableau de bord">
      <div className="mb-5">
        <p className="serif-italic text-gold text-sm">Bienvenue</p>
        <h1 className="font-serif text-2xl">Tableau de bord</h1>
      </div>

      {loading ? <Spinner className="py-20" /> : err ? <p className="text-rose text-sm text-center py-20">{err}</p> : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {cards.map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl p-4 shadow-soft">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.tint}`}><c.icon size={18} /></div>
                <p className="text-2xl font-serif mt-3">{c.value}</p>
                <p className="text-xs text-ink/50 mt-0.5">{c.label}</p>
              </motion.div>
            ))}
          </div>

          <Link to="/admin/products/new" className="tap mt-4 flex items-center gap-3 bg-burgundy text-white rounded-2xl p-4 shadow-lift">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"><Plus size={20} /></div>
            <div className="flex-1 text-left"><p className="font-medium text-sm">Ajouter un produit</p><p className="text-xs text-white/70">Créer avec variantes & couleurs</p></div>
            <ArrowRight size={18} />
          </Link>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-lg">Commandes récentes</h2>
              <Link to="/admin/orders" className="text-xs text-burgundy">Voir tout</Link>
            </div>
            {stats!.recent.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-soft"><p className="text-sm text-ink/40">Aucune commande</p></div>
            ) : (
              <div className="space-y-2">
                {stats!.recent.slice(0, 5).map(o => (
                  <div key={o.id} className="bg-white rounded-xl p-3 flex items-center justify-between shadow-soft">
                    <div><p className="text-sm font-medium">#{o.id} · {o.customer_name || 'Client'}</p><p className="text-xs text-ink/50">{Number(o.total).toFixed(0)} DH</p></div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full ${o.status === 'pending' ? 'bg-gold/20 text-gold' : 'bg-burgundy/10 text-burgundy'}`}>{o.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}
