import { useEffect, useState } from 'react';
import TopBar from '../../components/customer/TopBar';
import BottomNav from '../../components/customer/BottomNav';
import Spinner from '../../components/customer/Spinner';
import { api } from '../../lib/api';
import type { Order } from '../../lib/types';

const statusColor: Record<string, string> = { pending: 'bg-gold/20 text-gold', confirmed: 'bg-burgundy/10 text-burgundy', shipped: 'bg-rose/15 text-rose', delivered: 'bg-green-100 text-green-700', cancelled: 'bg-ink/10 text-ink/50' };
const statusLabel: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmée', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' };

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/api/orders').then(setOrders).finally(() => setLoading(false)); }, []);
  return (
    <div className="min-h-screen bg-softgray">
      <TopBar title="Commandes" />
      <main className="max-w-md mx-auto px-5 pb-28 pt-4">
        <h1 className="font-serif text-2xl mb-5">Mes commandes</h1>
        {loading ? <Spinner className="py-32" /> : orders.length === 0 ? (
          <p className="text-center text-ink/50 py-32">Aucune commande pour le moment</p>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <div key={o.id} className="bg-white rounded-2xl p-4 shadow-soft">
                <div className="flex justify-between items-start">
                  <div><p className="font-medium text-sm">Commande #{o.id}</p><p className="text-xs text-ink/50 mt-0.5">{new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${statusColor[o.status] || statusColor.pending}`}>{statusLabel[o.status] || o.status}</span>
                </div>
                <div className="mt-3 space-y-1">
                  {(o.items || []).slice(0, 2).map((i: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs text-ink/70"><span className="truncate flex-1 pr-2">{i.name} · T.{i.size} ×{i.qty}</span><span>{(i.qty * i.price).toFixed(0)} DA</span></div>
                  ))}
                  {(o.items || []).length > 2 && <p className="text-xs text-ink/40">+{o.items.length - 2} article(s)</p>}
                </div>
                <div className="gold-line my-2" />
                <div className="flex justify-between font-semibold text-sm"><span>Total</span><span className="text-burgundy">{Number(o.total).toFixed(0)} DA</span></div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
