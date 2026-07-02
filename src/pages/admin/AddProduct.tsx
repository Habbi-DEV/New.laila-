import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Trash2, Star, ImagePlus, X, Check, Eye } from 'lucide-react';
import AdminShell from '../../components/admin/AdminShell';
import Spinner from '../../components/customer/Spinner';
import { api, jbody } from '../../lib/api';
import { effectivePrice } from '../../lib/cart';
import { SHOE_SIZES, BAG_SIZES } from '../../lib/types';
import type { Category, ProductVariant } from '../../lib/types';

interface VState {
  id?: number;
  color_name: string;
  color_hex: string;
  color_type: 'primary' | 'other';
  is_default: boolean;
  images: string[];
  sizes: { size: string; stock: number }[];
}

const blankVariant = (sizes: string[]): VState => ({
  color_name: '', color_hex: '#8B1E3F', color_type: 'primary', is_default: false,
  images: [], sizes: sizes.map(s => ({ size: s, stock: 0 })),
});

export default function AdminAddProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [status, setStatus] = useState<'active' | 'draft'>('active');
  const [featured, setFeatured] = useState(false);
  const [variants, setVariants] = useState<VState[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [previewColor, setPreviewColor] = useState(0);

  useEffect(() => {
    api('/api/categories').then((cats: Category[]) => {
      setCategories(cats);
      if (!isEdit && cats.length) {
        setCategoryId(cats[0].id);
        setVariants([blankVariant(sizeSetFor(cats[0].slug))]);
      }
    });
    if (isEdit) {
      api(`/api/products?id=${id}`).then(d => {
        setName(d.product.name);
        setDescription(d.product.description || '');
        setCategoryId(d.product.category_id);
        setPrice(String(d.product.price));
        setDiscount(String(d.product.discount || ''));
        setStatus(d.product.status);
        setFeatured(!!d.product.featured);
        const vs: VState[] = (d.variants || []).map((v: ProductVariant) => ({
          id: v.id, color_name: v.color_name, color_hex: v.color_hex,
          color_type: v.color_type, is_default: v.is_default,
          images: v.images || [], sizes: v.sizes || [],
        }));
        setVariants(vs.length ? vs : [blankVariant(sizeSetFor(d.product.category_slug || ''))]);
        setLoading(false);
      }).catch(e => { setErr(e.message); setLoading(false); });
    }
  }, [id]);

  const sizeSetFor = (slug: string) => slug === 'bags' ? BAG_SIZES : SHOE_SIZES;
  const selectedCat = categories.find(c => c.id === Number(categoryId));
  const sizeSet = selectedCat ? sizeSetFor(selectedCat.slug) : SHOE_SIZES;

  // ---- variant helpers ----
  const updateVariant = (idx: number, patch: Partial<VState>) =>
    setVariants(vs => vs.map((v, i) => i === idx ? { ...v, ...patch } : v));

  const addVariant = () => {
    setVariants(vs => [...vs, { ...blankVariant(sizeSet), color_type: 'other', color_hex: '#B24A5A' }]);
    setPreviewColor(vs => vs); // keep
  };

  const removeVariant = (idx: number) => {
    setVariants(vs => vs.filter((_, i) => i !== idx));
    setPreviewColor(p => Math.max(0, p >= idx ? p - 1 : p));
  };

  const setDefault = (idx: number) =>
    setVariants(vs => vs.map((v, i) => ({ ...v, is_default: i === idx, color_type: i === idx ? 'primary' : (v.color_type === 'primary' ? 'other' : v.color_type) })));

  const setStock = (vIdx: number, size: string, val: number) =>
    setVariants(vs => vs.map((v, i) => i === vIdx ? { ...v, sizes: v.sizes.map(s => s.size === size ? { ...s, stock: val } : s) } : v));

  const totalStock = (v: VState) => v.sizes.reduce((s, x) => s + Number(x.stock || 0), 0);

  // ---- image upload ----
  const uploadImage = async (vIdx: number, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const { url } = await api('/api/upload', { method: 'POST', ...jbody({ fileName: file.name, fileBase64: base64, contentType: file.type }) });
        updateVariant(vIdx, { images: [...variants[vIdx].images, url] });
      } catch (e: any) { setErr('Upload échoué: ' + e.message); }
    };
    reader.readAsDataURL(file);
  };

  const onFile = (vIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => uploadImage(vIdx, f));
    e.target.value = '';
  };

  // ---- save ----
  const validate = () => {
    if (!name.trim()) return 'Nom requis';
    if (!categoryId) return 'Catégorie requise';
    if (!price || Number(price) <= 0) return 'Prix invalide';
    if (variants.length === 0) return 'Ajoutez au moins une couleur';
    for (const v of variants) {
      if (!v.color_name.trim()) return 'Chaque couleur doit avoir un nom';
      if (v.images.length === 0) return `La couleur "${v.color_name || '?'}" doit avoir au moins une image`;
    }
    return '';
  };

  const save = async () => {
    const v = validate();
    if (v) { setErr(v); return; }
    setErr(''); setSaving(true);
    try {
      // ensure one default
      let vs = variants.map(v => ({ ...v }));
      if (!vs.some(v => v.is_default)) vs[0].is_default = true;
      vs = vs.map(v => ({ ...v, color_type: v.is_default ? 'primary' : (v.color_type === 'primary' ? 'other' : v.color_type) }));

      let productId = Number(id);
      const payload = {
        name, description, category_id: Number(categoryId),
        price: Number(price), discount: Number(discount) || 0, status, featured,
      };
      if (isEdit) {
        await api('/api/products', { method: 'PUT', ...jbody({ id: productId, ...payload }) });
      } else {
        const created = await api('/api/products', { method: 'POST', ...jbody(payload) });
        productId = created.id;
      }
      const vrows = vs.map(v => ({
        product_id: productId, color_name: v.color_name, color_hex: v.color_hex,
        color_type: v.color_type, is_default: v.is_default, images: v.images, sizes: v.sizes,
      }));
      await api('/api/variants', { method: 'PUT', ...jbody({ product_id: productId, variants: vrows }) });
      navigate('/admin/products');
    } catch (e: any) { setErr(e.message); setSaving(false); }
  };

  if (loading) return <AdminShell><Spinner className="py-32" /></AdminShell>;

  const previewVariant = variants[previewColor] || variants[0];
  const finalPrice = effectivePrice(Number(price) || 0, Number(discount) || 0);

  return (
    <div className="min-h-screen bg-softgray">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-bordergray/70">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="tap p-1.5 text-ink"><ChevronLeft size={22} /></button>
          <span className="font-serif text-base">{isEdit ? 'Modifier' : 'Ajouter un produit'}</span>
          <button onClick={save} disabled={saving} className="tap h-9 px-4 rounded-full bg-burgundy text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={15} />} Enregistrer
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-28 pt-4 space-y-4">
        {/* Basic info */}
        <section className="bg-white rounded-2xl p-4 shadow-soft space-y-4">
          <div>
            <label className="text-xs text-ink/60 mb-1.5 block">Nom du produit</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Escarpin Laila Rouge"
              className="w-full h-11 px-3.5 rounded-xl border border-bordergray bg-white text-sm focus:border-burgundy outline-none" />
          </div>
          <div>
            <label className="text-xs text-ink/60 mb-1.5 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Matière, fabrication, style..."
              className="w-full px-3.5 py-3 rounded-xl border border-bordergray bg-white text-sm focus:border-burgundy outline-none resize-none" />
          </div>
          <div>
            <label className="text-xs text-ink/60 mb-1.5 block">Catégorie</label>
            <select value={categoryId} onChange={e => {
              const cid = Number(e.target.value); setCategoryId(cid);
              const cat = categories.find(c => c.id === cid);
              const ss = cat ? sizeSetFor(cat.slug) : SHOE_SIZES;
              setVariants(vs => vs.map(v => ({ ...v, sizes: ss.map(s => ({ size: s, stock: v.sizes.find(x => x.size === s)?.stock || 0 })) })));
            }} className="w-full h-11 px-3 rounded-xl border border-bordergray bg-white text-sm focus:border-burgundy outline-none">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink/60 mb-1.5 block">Prix (DH)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0"
                className="w-full h-11 px-3.5 rounded-xl border border-bordergray bg-white text-sm focus:border-burgundy outline-none" />
            </div>
            <div>
              <label className="text-xs text-ink/60 mb-1.5 block">Remise (%)</label>
              <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0"
                className="w-full h-11 px-3.5 rounded-xl border border-bordergray bg-white text-sm focus:border-burgundy outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex rounded-xl border border-bordergray overflow-hidden">
              {(['active', 'draft'] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)} className={`tap flex-1 h-10 text-sm font-medium ${status === s ? 'bg-burgundy text-white' : 'bg-white text-ink/60'}`}>
                  {s === 'active' ? 'Actif' : 'Brouillon'}
                </button>
              ))}
            </div>
            <button onClick={() => setFeatured(f => !f)} className={`tap h-10 px-3 rounded-xl border flex items-center gap-1.5 text-sm ${featured ? 'border-gold bg-gold/10 text-gold' : 'border-bordergray text-ink/50'}`}>
              <Star size={15} fill={featured ? 'currentColor' : 'none'} /> Vedette
            </button>
          </div>
        </section>

        {/* Couleurs & Variantes */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-serif text-lg">Couleurs & Variantes</h2>
            <span className="text-xs text-ink/40">{variants.length} couleur(s)</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {variants.map((v, vIdx) => (
                <motion.div key={vIdx} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }}
                  className={`bg-white rounded-2xl p-4 shadow-soft border-2 ${v.is_default ? 'border-gold/50' : 'border-transparent'}`}>

                  {/* Color header */}
                  <div className="flex items-start gap-3">
                    <label className="relative shrink-0 mt-1">
                      <span className="block w-11 h-11 rounded-full ring-2 ring-white shadow-soft cursor-pointer" style={{ background: v.color_hex }} />
                      <input type="color" value={v.color_hex} onChange={e => updateVariant(vIdx, { color_hex: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer" />
                    </label>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input value={v.color_name} onChange={e => updateVariant(vIdx, { color_name: e.target.value })} placeholder="Nom couleur"
                        className="h-10 px-3 rounded-lg border border-bordergray bg-white text-sm focus:border-burgundy outline-none" />
                      <input value={v.color_hex} onChange={e => updateVariant(vIdx, { color_hex: e.target.value })} placeholder="#8B1E3F"
                        className="h-10 px-3 rounded-lg border border-bordergray bg-white text-sm font-mono focus:border-burgundy outline-none" />
                    </div>
                    <button onClick={() => removeVariant(vIdx)} className="tap p-2 text-ink/30 hover:text-rose"><Trash2 size={16} /></button>
                  </div>

                  {/* Type + default */}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex rounded-lg border border-bordergray overflow-hidden">
                      {(['primary', 'other'] as const).map(t => (
                        <button key={t} onClick={() => updateVariant(vIdx, { color_type: t })}
                          className={`tap px-3 h-8 text-xs font-medium ${v.color_type === t ? 'bg-burgundy text-white' : 'bg-white text-ink/50'}`}>
                          {t === 'primary' ? 'Couleur principale' : 'Autre couleur'}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setDefault(vIdx)} className={`tap h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1 ${v.is_default ? 'bg-gold/20 text-gold' : 'border border-bordergray text-ink/50'}`}>
                      <Star size={12} fill={v.is_default ? 'currentColor' : 'none'} /> {v.is_default ? 'Par défaut' : 'Définir par défaut'}
                    </button>
                  </div>

                  {/* Images */}
                  <div className="mt-4">
                    <p className="text-xs text-ink/60 mb-2">Images ({v.images.length})</p>
                    <div className="grid grid-cols-4 gap-2">
                      {v.images.map((img, iIdx) => (
                        <div key={iIdx} className="relative aspect-square rounded-lg overflow-hidden bg-softgray group">
                          <img src={img} className="w-full h-full object-cover" />
                          <button onClick={() => updateVariant(vIdx, { images: v.images.filter((_, i) => i !== iIdx) })}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center tap opacity-0 group-hover:opacity-100 transition"><X size={11} /></button>
                          <span className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[8px] text-center py-0.5">{['face', 'profil', 'détail', ' dos'][iIdx] || iIdx + 1}</span>
                        </div>
                      ))}
                      <button onClick={() => fileRefs.current[vIdx]?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-bordergray flex flex-col items-center justify-center gap-1 text-ink/40 tap hover:border-burgundy hover:text-burgundy">
                        <ImagePlus size={18} /><span className="text-[9px]">Ajouter</span>
                      </button>
                    </div>
                    <input ref={el => { fileRefs.current[vIdx] = el; }} type="file" accept="image/*" multiple className="hidden" onChange={e => onFile(vIdx, e)} />
                  </div>

                  {/* Sizes & stock */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-ink/60">Tailles & Stock</p>
                      <span className="text-xs font-medium text-burgundy">Stock total: {totalStock(v)}</span>
                    </div>
                    <div className={`grid gap-2 ${v.sizes.length > 4 ? 'grid-cols-6' : 'grid-cols-3'}`}>
                      {v.sizes.map(s => (
                        <div key={s.size} className="rounded-lg border border-bordergray overflow-hidden">
                          <div className="bg-softgray text-center text-[10px] py-0.5 font-medium text-ink/60">{s.size}</div>
                          <input type="number" min="0" value={s.stock} onChange={e => setStock(vIdx, s.size, Number(e.target.value))}
                            className="w-full h-9 text-center text-sm bg-white outline-none focus:bg-burgundy/5" />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <button onClick={addVariant} className="tap mt-3 w-full h-12 rounded-2xl border-2 border-dashed border-burgundy/30 text-burgundy font-medium text-sm flex items-center justify-center gap-2 hover:bg-burgundy/5">
            <Plus size={18} /> Ajouter une autre couleur
          </button>
        </section>

        {/* Real-time preview */}
        <section className="bg-white rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-3"><Eye size={15} className="text-gold" /><h2 className="font-serif text-base">Aperçu client</h2></div>
          {previewVariant ? (
            <div className="flex gap-3">
              <div className="w-24 h-28 rounded-xl overflow-hidden bg-softgray shrink-0">
                {previewVariant.images[0] ? <img src={previewVariant.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-ink/20 text-xs">Aucune image</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-sm truncate">{name || 'Nom du produit'}</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  {Number(discount) > 0 && <span className="text-xs text-ink/40 line-through">{Number(price).toFixed(0)} DH</span>}
                  <span className="text-sm font-semibold text-burgundy">{finalPrice.toFixed(0)} DH</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {variants.map((v, i) => (
                    <button key={i} onClick={() => setPreviewColor(i)} className={`w-5 h-5 rounded-full ring-1 ${previewColor === i ? 'ring-2 ring-burgundy ring-offset-1' : 'ring-bordergray'}`} style={{ background: v.color_hex }} />
                  ))}
                </div>
                <div className="flex gap-1 mt-2">
                  {previewVariant.sizes.slice(0, 6).map(s => (
                    <span key={s.size} className={`text-[9px] px-1.5 py-0.5 rounded ${Number(s.stock) > 0 ? 'bg-softgray text-ink/60' : 'bg-softgray text-ink/25 line-through'}`}>{s.size}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : <p className="text-sm text-ink/40">Ajoutez une couleur pour voir l'aperçu</p>}
        </section>

        {err && <p className="text-sm text-rose text-center bg-rose/5 rounded-xl py-2.5">{err}</p>}
      </main>
    </div>
  );
}
