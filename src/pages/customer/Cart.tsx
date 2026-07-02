import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import TopBar from '../../components/customer/TopBar';
import BottomNav from '../../components/customer/BottomNav';
import { getCart, updateQty, removeItem } from '../../lib/cart';
import type { CartItem } from '../../lib/types';

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const navigate = useNavigate();
  const refresh = () => setItems(getCart());
  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener('cart-changed', h);
    return () => window.removeEventListener('cart-changed', h);
  }, []);
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="min-h-screen bg-softgray">
      <TopBar title="Panier" />
      <main className="max-w-md mx-auto px-5 pb-32 pt-4">
        <h1 className="font-serif text-2xl mb-5">Mon Panier</h1>
        {items.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag size={40} className="mx-auto text-ink/20" />
            <p className="mt-4 text-ink/50 text-sm">Votre panier est vide</p>
            <Link to="/" className="tap inline-block mt-5 bg-burgundy text-white text-sm px-6 py-3 rounded-xl">Découvrir la collection</Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <AnimatePresence>
                {items.map(item => (
                  <motion.div key={item.key} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }}
                    className="bg-white rounded-2xl p-3 flex gap-3 shadow-soft">
                    <div className="w-20 h-24 rounded-xl overflow-hidden bg-softgray shrink-0">
                      {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-sm truncate">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-ink/60">
                        <span className="w-3 h-3 rounded-full ring-1 ring-bordergray" style={{ background: item.colorHex }} />
                        <span>{item.colorName}</span>
                        <span>·</span>
                        <span>T. {item.size}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-bordergray rounded-lg">
                          <button onClick={() => updateQty(item.key, item.qty - 1)} className="tap w-7 h-7 flex items-center justify-center text-ink/70"><Minus size={13} /></button>
                          <span className="w-7 text-center text-sm">{item.qty}</span>
                          <button onClick={() => updateQty(item.key, item.qty + 1)} className="tap w-7 h-7 flex items-center justify-center text-ink/70"><Plus size={13} /></button>
                        </div>
                        <span className="font-semibold text-burgundy text-sm">{(item.qty * item.price).toFixed(0)} DH</span>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.key)} className="tap text-ink/30 hover:text-rose self-start"><Trash2 size={16} /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="mt-5 bg-white rounded-2xl p-4 shadow-soft space-y-2">
              <div className="flex justify-between text-sm text-ink/70"><span>Sous-total</span><span>{total.toFixed(0)} DH</span></div>
              <div className="flex justify-between text-sm text-ink/70"><span>Livraison</span><span className="text-gold">Offerte</span></div>
              <div className="gold-line my-1" />
              <div className="flex justify-between font-semibold"><span>Total</span><span className="text-burgundy">{total.toFixed(0)} DH</span></div>
            </div>
          </>
        )}
      </main>
      {items.length > 0 && (
        <div className="fixed bottom-16 inset-x-0 z-30 px-5 pb-2">
          <div className="max-w-md mx-auto">
            <button onClick={() => navigate('/checkout')} className="tap w-full h-12 rounded-xl bg-burgundy text-white font-medium">Passer la commande</button>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
