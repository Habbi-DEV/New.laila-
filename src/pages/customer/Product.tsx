import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import TopBar from '../../components/customer/TopBar';
import BottomNav from '../../components/customer/BottomNav';
import Spinner from '../../components/customer/Spinner';
import { api } from '../../lib/api';
import { addToCart, effectivePrice } from '../../lib/cart';
import type { Product, ProductVariant } from '../../lib/types';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selVariant, setSelVariant] = useState(0);
  const [selSize, setSelSize] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [added, setAdded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    api(`/api/products?id=${id}`)
      .then(d => {
        setProduct(d.product);
        setVariants(d.variants || []);
        const di = (d.variants || []).findIndex((v: ProductVariant) => v.is_default);
        setSelVariant(di >= 0 ? di : 0);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { setImgIdx(0); setSelSize(null); }, [selVariant]);

  const variant = variants[selVariant];
  const images = variant?.images || [];
  const final = product ? effectivePrice(Number(product.price), Number(product.discount || 0)) : 0;
  const stockFor = (size: string) => variant?.sizes?.find(s => s.size === size)?.stock || 0;
  const totalStock = variant?.sizes?.reduce((s, x) => s + Number(x.stock || 0), 0) || 0;

  const handleAdd = () => {
    if (!product || !variant) return;
    if (!selSize) { setErr('Veuillez choisir une taille'); return; }
    addToCart({
      key: `${product.id}-${variant.id}-${selSize}`,
      productId: product.id, variantId: variant.id,
      name: product.name, colorName: variant.color_name, colorHex: variant.color_hex,
      size: selSize, qty: 1, price: final, image: images[0] || '',
    });
    setAdded(true); setErr('');
    setTimeout(() => setAdded(false), 1800);
  };

  const scrollBy = (d: number) => {
    scrollRef.current?.scrollBy({ left: d, behavior: 'smooth' });
    setImgIdx(i => Math.max(0, Math.min(images.length - 1, i + (d > 0 ? 1 : -1))));
  };

  if (loading) return (<div className="min-h-screen bg-softgray"><TopBar showBack /><Spinner className="py-32" /></div>);
  if (err && !product) return (<div className="min-h-screen bg-softgray"><TopBar showBack /><p className="text-center text-rose py-32">{err}</p></div>);
  if (!product) return null;

  return (
    <div className="min-h-screen bg-softgray">
      <TopBar showBack />
      <main className="max-w-md mx-auto pb-32">
        <div className="relative bg-white">
          <div ref={scrollRef} className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory">
            {images.length ? images.map((src, i) => (
              <div key={i} className="min-w-full snap-center aspect-square bg-softgray">
                <img src={src} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            )) : (
              <div className="min-w-full aspect-square bg-softgray shimmer" />
            )}
          </div>
          {images.length > 1 && (<>
            <button onClick={() => scrollBy(-320)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center tap shadow-soft"><ChevronLeft size={18} /></button>
            <button onClick={() => scrollBy(320)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center tap shadow-soft"><ChevronRight size={18} /></button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'w-5 bg-burgundy' : 'w-1.5 bg-ink/25'}`} />
              ))}
            </div>
          </>)}
        </div>

        <div className="px-5 pt-5">
          <p className="text-xs text-gold tracking-[0.2em] uppercase mb-1">{product.category_name}</p>
          <h1 className="font-serif text-2xl leading-tight">{product.name}</h1>
          <div className="flex items-baseline gap-2 mt-2">
            {Number(product.discount) > 0 && <span className="text-base text-ink/40 line-through">{Number(product.price).toFixed(0)} DH</span>}
            <span className="text-xl font-semibold text-burgundy">{final.toFixed(0)} DH</span>
            {Number(product.discount) > 0 && <span className="text-xs bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full">−{product.discount}%</span>}
          </div>

          {variants.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-medium">Couleur</span>
                <span className="text-sm text-ink/60">{variant?.color_name}</span>
              </div>
              <div className="flex gap-3 flex-wrap">
                {variants.map((v, i) => (
                  <button key={v.id || i} onClick={() => setSelVariant(i)} className="tap relative">
                    <span className={`block w-9 h-9 rounded-full ring-1 transition-all ${selVariant === i ? 'ring-2 ring-burgundy ring-offset-2 ring-offset-white' : 'ring-bordergray'}`} style={{ background: v.color_hex }} />
                    {v.is_default && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gold ring-2 ring-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {variant && variant.sizes?.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-medium">Taille</span>
                <span className="text-xs text-ink/50">Stock total: {totalStock}</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {variant.sizes.map(s => {
                  const out = Number(s.stock) <= 0;
                  const sel = selSize === s.size;
                  return (
                    <button key={s.size} disabled={out} onClick={() => setSelSize(s.size)}
                      className={`tap h-11 rounded-xl text-sm font-medium border transition-all ${sel ? 'border-burgundy bg-burgundy text-white' : out ? 'border-bordergray bg-softgray text-ink/25 line-through' : 'border-bordergray bg-white text-ink hover:border-burgundy/40'}`}>
                      {s.size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {product.description && (
            <div className="mt-6">
              <h2 className="text-sm font-medium mb-2">Description</h2>
              <p className="text-sm text-ink/70 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {err && <p className="text-sm text-rose mt-4 text-center">{err}</p>}
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-bordergray/70 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] text-ink/50 tracking-wide">Prix</p>
            <p className="font-semibold text-burgundy">{final.toFixed(0)} DH</p>
          </div>
          <button onClick={handleAdd} disabled={totalStock <= 0}
            className="tap flex-1 h-12 rounded-xl bg-burgundy text-white font-medium flex items-center justify-center gap-2 disabled:opacity-40">
            <AnimatePresence mode="wait">
              {added ? (
                <motion.span key="ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2"><Check size={18} /> Ajouté</motion.span>
              ) : (
                <motion.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2"><ShoppingBag size={18} /> Ajouter au panier</motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </div>
  );
}
