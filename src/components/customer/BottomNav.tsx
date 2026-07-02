import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cartCount } from '../../lib/cart';

const tabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/cart', label: 'Cart', icon: ShoppingBag, badge: true },
  { to: '/orders', label: 'Orders', icon: Receipt },
];

export default function BottomNav() {
  const loc = useLocation();
  const [count, setCount] = useState(cartCount());
  useEffect(() => {
    const h = () => setCount(cartCount());
    window.addEventListener('cart-changed', h);
    return () => window.removeEventListener('cart-changed', h);
  }, []);
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-bordergray/70 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto h-16 grid grid-cols-3">
        {tabs.map(({ to, label, icon: Icon, badge }) => {
          const active = loc.pathname === to;
          return (
            <Link key={to} to={to} className="tap flex flex-col items-center justify-center gap-0.5">
              <div className="relative">
                <Icon size={21} className={active ? 'text-burgundy' : 'text-ink/40'} strokeWidth={active ? 2 : 1.6} />
                {badge && count > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-burgundy text-white text-[9px] font-semibold flex items-center justify-center">{count}</span>
                )}
              </div>
              <span className={`text-[10px] tracking-wide ${active ? 'text-burgundy font-medium' : 'text-ink/40'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
