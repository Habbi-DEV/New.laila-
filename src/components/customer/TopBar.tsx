import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cartCount } from '../../lib/cart';

export default function TopBar({ title, showBack = false }: { title?: string; showBack?: boolean }) {
  const navigate = useNavigate();
  const [count, setCount] = useState(cartCount());
  useEffect(() => {
    const h = () => setCount(cartCount());
    window.addEventListener('cart-changed', h);
    return () => window.removeEventListener('cart-changed', h);
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-bordergray/70">
      <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
        {showBack ? (
          <button onClick={() => navigate(-1)} className="tap p-1 -ml-1 text-ink">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        ) : (
          <Link to="/" className="tap">
            <span className="font-serif text-[22px] leading-none tracking-tight">Laila</span>
            <span className="font-serif text-[10px] text-gold tracking-[0.3em] block leading-none -mt-0.5">SHOES</span>
          </Link>
        )}
        <div className="flex items-center gap-1">
          {title && <span className="font-serif text-base text-ink/80 hidden sm:block">{title}</span>}
          <Link to="/cart" className="tap relative p-2 text-ink">
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-burgundy text-white text-[10px] font-semibold flex items-center justify-center">{count}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
