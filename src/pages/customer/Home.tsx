import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import TopBar from '../../components/customer/TopBar';
import BottomNav from '../../components/customer/BottomNav';
import ProductCard from '../../components/customer/ProductCard';
import Spinner from '../../components/customer/Spinner';
import { api } from '../../lib/api';
import type { Product, Category } from '../../lib/types';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      api('/api/products').then(setProducts),
      api('/api/categories').then(setCategories),
    ]).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, []);

  const active = products.filter(p => p.status === 'active');
  const featured = active.filter(p => p.featured).slice(0, 4);
  const newest = active.slice(0, 8);
  const list = featured.length ? featured : active.slice(0, 4);

  return (
    <div className="min-h-screen bg-softgray">
      <TopBar />
      <main className="max-w-md mx-auto px-5 pb-28 pt-4">
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden shadow-[0_16px_50px_-16px_rgba(139,30,63,0.25)]"
        >
          <img src="/images/hero-campaign.jpg" alt="Laila campaign" className="w-full h-[460px] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 text-white">
            <p className="serif-italic text-gold text-sm mb-1">Nouvelle Collection</p>
            <h1 className="font-serif text-3xl leading-tight">L'art de la<br/>distinction</h1>
            <Link to="/shop" className="tap inline-flex items-center gap-2 mt-4 bg-white text-ink text-sm font-medium px-4 py-2.5 rounded-full">
              Découvrir <ArrowRight size={15} />
            </Link>
          </div>
        </motion.section>

        <section className="mt-8">
          <h2 className="font-serif text-xl mb-3">Catégories</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((c, i) => (
              <Link key={c.id} to={`/shop/${c.slug}`} className="block">
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-softgray"
                >
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                  <span className="absolute bottom-3 left-3 text-white font-serif text-lg">{c.name}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl">Coups de cœur</h2>
            <Link to="/shop" className="text-xs text-burgundy tracking-wide">Tout voir</Link>
          </div>
          {loading ? <Spinner className="py-16" /> : err ? (
            <p className="text-sm text-rose text-center py-12">{err}</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-ink/40 text-center py-12">Aucun produit pour le moment</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6">
              {list.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </section>

        {!loading && newest.length > 0 && (
          <section className="mt-9">
            <h2 className="font-serif text-xl mb-3">New Collection</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
              {newest.map((p, i) => (
                <div key={p.id} className="w-[150px] shrink-0">
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="gold-line mt-10 mb-4" />
        <p className="text-center serif-italic text-ink/40 text-sm">Laila Shoes — Crafted with passion</p>
      </main>
      <BottomNav />
    </div>
  );
}
