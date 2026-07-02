import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, Banknote, Check, Home, Store, MapPin } from 'lucide-react';
import TopBar from '../../components/customer/TopBar';
import { getCart, cartTotal, clearCart } from '../../lib/cart';
import { api, jbody } from '../../lib/api';
import type { Wilaya } from '../../lib/types';

export default function Checkout() {
  const navigate = useNavigate();
  const items = getCart();
  const productsTotal = cartTotal();
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', wilaya_id: '', delivery_type: 'home' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api('/api/wilayas').then(setWilayas).catch(() => {}); }, []);

  const selectedWilaya = wilayas.find(w => w.id === Number(form.wilaya_id));
  const shippingPrice = selectedWilaya
    ? (form.delivery_type === 'desk' ? selectedWilaya.desk_shipping_price : selectedWilaya.home_shipping_price)
    : 0;
  const grandTotal = productsTotal + shippingPrice;

  if (items.length === 0 && !loading) {
    return (<div className="min-h-screen bg-softgray"><TopBar showBack /><div className="max-w-md mx-auto px-5 pt-32 text-center"><p className="text-ink/50">Votre panier est vide.</p></div></div>);
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setErr('');
    if (!form.name || !form.phone || !form.address || !form.city) { setErr('Veuillez remplir tous les champs'); return; }
    if (!form.wilaya_id) { setErr('Veuillez sélectionner votre wilaya'); return; }
    if (!/^\d{8,}$/.test(form.phone.replace(/\s/g, ''))) { setErr('Numéro de téléphone invalide'); return; }
    setLoading(true);
    try {
      const order = await api('/api/orders', { method: 'POST', ...jbody({
        customer_name: form.name, phone: form.phone, address: form.address, city: form.city,
        payment_method: 'cod', items, wilaya_id: Number(form.wilaya_id), delivery_type: form.delivery_type,
      })});
      clearCart();
      navigate(`/order/${order.id}`);
    } catch (e: any) { setErr(e.message); setLoading(false); }
  };

  const field = (k: string, label: string, type = 'text') => (
    <div>
      <label className="text-xs text-ink/60 mb-1.5 block">{label}</label>
      <input type={type} value={(form as any)[k]} onChange={e => set(k, e.target.value)}
        className="w-full h-12 px-4 rounded-xl border border-bordergray bg-white text-sm focus:border-burgundy focus:ring-2 focus:ring-burgundy/10 outline-none transition" />
    </div>
  );

  return (
    <div className="min-h-screen bg-softgray">
      <TopBar title="Commande" showBack />
      <main className="max-w-md mx-auto px-5 pb-40 pt-4">
        <h1 className="font-serif text-2xl mb-5">Finaliser la commande</h1>

        <section className="bg-white rounded-2xl p-4 shadow-soft space-y-4">
          <h2 className="text-sm font-medium">Livraison</h2>
          {field('name', 'Nom complet')}
          {field('phone', 'Téléphone', 'tel')}
          {field('address', 'Adresse')}
          {field('city', 'Baladia / Commune')}
          <div>
            <label className="text-xs text-ink/60 mb-1.5 block">Wilaya</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
              <select value={form.wilaya_id} onChange={e => set('wilaya_id', e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-bordergray bg-white text-sm focus:border-burgundy outline-none appearance-none">
                <option value="" disabled>Choisir votre wilaya (1–58)</option>
                {wilayas.map(w => <option key={w.id} value={w.id}>{w.id} — {w.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-ink/60 mb-1.5 block">Type de livraison</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => set('delivery_type', 'home')} className={`tap p-3 rounded-xl border flex flex-col items-center gap-1 ${form.delivery_type === 'home' ? 'border-burgundy bg-burgundy/5' : 'border-bordergray'}`}>
                <Home size={18} className={form.delivery_type === 'home' ? 'text-burgundy' : 'text-ink/50'} />
                <span className="text-xs font-medium">À domicile</span>
                <span className="text-[10px] text-ink/50">{selectedWilaya ? `${selectedWilaya.home_shipping_price} DH` : '—'}</span>
              </button>
              <button onClick={() => set('delivery_type', 'desk')} className={`tap p-3 rounded-xl border flex flex-col items-center gap-1 ${form.delivery_type === 'desk' ? 'border-burgundy bg-burgundy/5' : 'border-bordergray'}`}>
                <Store size={18} className={form.delivery_type === 'desk' ? 'text-burgundy' : 'text-ink/50'} />
                <span className="text-xs font-medium">Bureau Stopdesk</span>
                <span className="text-[10px] text-ink/50">{selectedWilaya ? `${selectedWilaya.desk_shipping_price} DH` : '—'}</span>
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4 shadow-soft mt-4">
          <h2 className="text-sm font-medium mb-3">Paiement</h2>
          <div className="w-full p-3.5 rounded-xl border border-burgundy bg-burgundy/5 flex items-center gap-3">
            <Banknote size={20} className="text-burgundy" />
            <div className="text-left flex-1"><p className="text-sm font-medium">Paiement à la livraison (COD)</p><p className="text-xs text-ink/50">Payez en espèces à réception du colis</p></div>
            <Check size={18} className="text-burgundy" />
          </div>
          <div className="w-full p-3.5 rounded-xl border border-bordergray mt-2 flex items-center gap-3 opacity-50">
            <Truck size={20} className="text-ink/50" /><div className="text-left flex-1"><p className="text-sm font-medium">Carte bancaire</p><p className="text-xs text-ink/50">Bientôt disponible</p></div>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4 shadow-soft mt-4">
          <div className="flex justify-between text-sm mb-2"><span className="font-medium">Récapitulatif</span><span className="text-ink/50">{items.length} article(s)</span></div>
          {items.map(i => (
            <div key={i.key} className="flex justify-between text-xs text-ink/70 py-1"><span className="truncate flex-1 pr-2">{i.name} · {i.size}</span><span>{(i.qty * i.price).toFixed(0)} DH</span></div>
          ))}
          <div className="gold-line my-2" />
          <div className="flex justify-between text-sm text-ink/70"><span>Sous-total produits</span><span>{productsTotal.toFixed(0)} DH</span></div>
          <div className="flex justify-between text-sm text-ink/70 mt-1"><span>Livraison ({form.delivery_type === 'desk' ? 'Stopdesk' : 'Domicile'}{selectedWilaya ? ` · ${selectedWilaya.name}` : ''})</span><span className={shippingPrice ? 'text-gold' : 'text-ink/40'}>{shippingPrice ? `${shippingPrice} DH` : '—'}</span></div>
          <div className="gold-line my-2" />
          <div className="flex justify-between font-semibold"><span>Total à payer</span><span className="text-burgundy">{grandTotal.toFixed(0)} DH</span></div>
        </section>

        {err && <p className="text-sm text-rose mt-4 text-center">{err}</p>}
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-bordergray/70 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center gap-3">
          <div className="flex-1"><p className="text-[10px] text-ink/50">Total (COD)</p><p className="font-semibold text-burgundy">{grandTotal.toFixed(0)} DH</p></div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={submit} disabled={loading}
            className="tap h-12 px-8 rounded-xl bg-burgundy text-white font-medium flex items-center justify-center min-w-[160px]">
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirmer'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
