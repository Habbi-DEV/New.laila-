import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Plus, ShoppingBag, Store, Boxes, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const tabs = [
  { to: '/admin/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Produits', icon: Package },
  { to: '/admin/products/new', label: 'Ajouter', icon: Plus, primary: true },
  { to: '/admin/inventory', label: 'Stock', icon: Boxes },
  { to: '/admin/orders', label: 'Commandes', icon: ShoppingBag },
];

export default function AdminShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-softgray">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-bordergray/70">
        <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="tap"><Store size={18} className="text-burgundy" /></Link>
            <div>
              <span className="font-serif text-base leading-none">Laila</span>
              <span className="text-[9px] text-ink/40 tracking-[0.25em] ml-1">ADMIN</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {title && <span className="font-serif text-sm text-ink/70 hidden sm:block">{title}</span>}
            <button onClick={handleLogout} className="tap p-2 text-ink/40 hover:text-rose"><LogOut size={16} /></button>
          </div>
        </div>
      </header>
      <main className="max-w-md mx-auto px-5 pb-28 pt-4">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-bordergray/70 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto h-16 grid grid-cols-5">
          {tabs.map(({ to, label, icon: Icon, primary }) => {
            const active = loc.pathname === to;
            return (
              <button key={to} onClick={() => navigate(to)} className="tap flex flex-col items-center justify-center gap-0.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${primary ? 'bg-burgundy text-white shadow-lift' : active ? 'bg-burgundy/10 text-burgundy' : 'text-ink/40'}`}>
                  <Icon size={16} strokeWidth={primary ? 2.2 : 1.7} />
                </div>
                <span className={`text-[8px] tracking-wide ${active || primary ? 'text-burgundy font-medium' : 'text-ink/40'}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
