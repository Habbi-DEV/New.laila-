import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import TopBar from '../../components/customer/TopBar';
import BottomNav from '../../components/customer/BottomNav';
import ProductCard from '../../components/customer/ProductCard';
import Spinner from '../../components/customer/Spinner';
import { api } from '../../lib/api';
import type { Product } from '../../lib/types';

interface ShopProduct extends Product {
  cover_image?: string;
  in_stock?: boolean;
  sizes?: string[];
}

const CAT_TABS = [
  { key: 'all', label: 'Tout' },
  { key: 'shoes', label: 'Soulier & Sandales' },
  { key: 'bags', label: 'Sacs' },
];

const SHOE_SUBFILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'soulier', label: 'Soulier' },
  { key: 'sandales', label: 'Sandales' },
];

export default function Shop() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [catTab, setCatTab] = useState<string>(category || 'all');
  const [shoeSubFilter, setShoeSubFilter] = useState<string>('all');
  const [selSize, setSelSize] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setSelSize(null);
    setShoeSubFilter('all');
    const url = catTab === 'all' ? '/api/products' : `/api/products?category=${catTab}`;
    api(url).then((data: ShopProduct[]) => {
      setProducts(data.filter((p: ShopProduct) => p.status === 'active'));
    }).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [catTab]);

  // Sync URL when category param changes
  useEffect(() => {
    if (category && category !== catTab) {
      setCatTab(category);
    }
  }, [category]);

  const switchCat = (key: string) => {
    setCatTab(key);
    if (key === 'all') navigate('/shop', { replace: true });
    else navigate(`/shop/${key}`, { replace: true });
  };

  // Dynamically compute available sizes from the currently loaded products
  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    products.forEach(p => {
      (p.sizes || []).forEach(s => sizeSet.add(s));
    });
    return [...sizeSet].sort((a, b) => {
      const na = Number(a), nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [products]);

  // Filter by shoe sub-type (soulier vs sandales) — based on product name keywords
  const afterSubFilter = useMemo(() => {
    if (catTab !== 'shoes' || shoeSubFilter === 'all') return products;
    if (shoeSubFilter === 'sandales') {
      return products.filter(p => /sandale|sandals|mule|tong/i.test(p.name));
    }
    // soulier = everything in shoes that's not a sandale
    return products.filter(p => !/sandale|sandals|mule|tong/i.test(p.name));
  }, [products, catTab, shoeSubFilter]);

  // Filter by selected size
  const filtered = useMemo(() => {
    if (!selSize) return afterSubFilter;
    return afterSubFilter.filter(p => (p.sizes || []).includes(selSize));
  }, [afterSubFilter, selSize]);

  return (
    <div className="min-h-screen bg-softgray">
      <TopBar title="Boutique" />
      <main className="max-w-md mx-auto px-5 pb-28 pt-4">
        <h1 className="font-serif text-2xl mb-4">Boutique</h1>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 mb-3">
          {CAT_TABS.map(tab => (
            <button key={tab.key} onClick={() => switchCat(tab.key)}
              className={`tap shrink-0 h-9 px-4 rounded-full text-sm font-medium border transition-all ${catTab === tab.key
                ? 'border-burgundy bg-burgundy text-white'
                : 'border-bordergray bg-white text-ink/60'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Shoe sub-filters (only when shoes category is active) */}
        <AnimatePresence>
          {catTab === 'shoes' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3">
              <div className="flex gap-2">
                {SHOE_SUBFILTERS.map(sf => (
                  <button key={sf.key} onClick={() => setShoeSubFilter(sf.key)}
                    className={`tap h-8 px-3 rounded-full text-xs font-medium border transition-all ${shoeSubFilter === sf.key
                      ? 'border-rose bg-rose/10 text-rose'
                      : 'border-bordergray bg-white text-ink/50'}`}>
                    {sf.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic size filter pills */}
        {availableSizes.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1 shrink-0 text-ink/40">
              <SlidersHorizontal size={13} />
              <span className="text-[11px] font-medium">Tailles</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
              {availableSizes.map(size => (
                <button key={size} onClick={() => setSelSize(selSize === size ? null : size)}
                  className={`tap shrink-0 min-w-[36px] h-9 px-2.5 rounded-lg text-xs font-medium border transition-all ${selSize === size
                    ? 'border-burgundy bg-burgundy text-white'
                    : 'border-bordergray bg-white text-ink/70 hover:border-burgundy/40'}`}>
                  {size}
                </button>
              ))}
              {selSize && (
                <button onClick={() => setSelSize(null)} className="tap shrink-0 h-9 px-2 rounded-lg text-ink/40 flex items-center gap-0.5">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <p className="text-xs text-ink/40 mb-3">{filtered.length} produit{filtered.length > 1 ? 's' : ''}{selSize && ` · Taille ${selSize}`}</p>
        )}

        {/* Products grid */}
        {loading ? <Spinner className="py-16" /> : err ? (
          <p className="text-sm text-rose text-center py-12">{err}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-ink/40">Aucun produit ne correspond à ce filtre</p>
            {selSize && <button onClick={() => setSelSize(null)} className="tap text-xs text-burgundy mt-3">Réinitialiser le filtre</button>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6">
            {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
