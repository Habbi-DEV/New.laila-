import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, GitMerge, Check, Home, Store, Ban, ShieldAlert, Undo2, RotateCcw, Eye, EyeOff, Truck, FileText, Package } from 'lucide-react';
import AdminShell from '../../components/admin/AdminShell';
import Spinner from '../../components/customer/Spinner';
import { api, jbody } from '../../lib/api';
import type { Order } from '../../lib/types';

const statusLabel: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmée', shipped: 'Expédiée',
  delivered: 'Livrée', cancelled: 'Annulée', returned: 'Retourné', merged: 'Fusionnée',
};
const statusColor: Record<string, string> = {
  pending: 'bg-gold/20 text-gold', confirmed: 'bg-burgundy/10 text-burgundy',
  shipped: 'bg-rose/15 text-rose', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-ink/10 text-ink/50', returned: 'bg-rose/20 text-rose', merged: 'bg-ink/10 text-ink/40',
};
const flow = ['pending', 'confirmed', 'shipped', 'delivered'];
const DAY = 24 * 60 * 60 * 1000;

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [showMerged, setShowMerged] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<number | null>(null);
  const [mergePrimaryId, setMergePrimaryId] = useState<number | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeErr, setMergeErr] = useState('');
  const [blacklistLoading, setBlacklistLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [overrideMode, setOverrideMode] = useState<number | null>(null);
  const [shippingLoading, setShippingLoading] = useState<number | null>(null);

  const refresh = () => {
    setLoading(true);
    api('/api/orders').then(setOrders).catch(e => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);

  const { dupIds, dupGroups } = useMemo(() => {
    const now = Date.now();
    const recent = orders.filter(o => o.status !== 'merged' && now - new Date(o.created_at).getTime() < DAY);
    const byPhone = new Map<string, Order[]>();
    recent.forEach(o => {
      const p = (o.phone || '').replace(/\s/g, '');
      if (!p) return;
      if (!byPhone.has(p)) byPhone.set(p, []);
      byPhone.get(p)!.push(o);
    });
    const groups: Order[][] = [];
    const ids = new Set<number>();
    byPhone.forEach(group => {
      if (group.length >= 2) {
        groups.push(group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        group.forEach(o => ids.add(o.id));
      }
    });
    return { dupIds: ids, dupGroups: groups };
  }, [orders]);

  const visibleOrders = showMerged ? orders : orders.filter(o => o.status !== 'merged');

  const advance = async (o: Order) => {
    const idx = flow.indexOf(o.status);
    const next = idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : o.status;
    await api('/api/orders', { method: 'PUT', ...jbody({ id: o.id, status: next }) });
    refresh();
  };

  const changeStatus = async (o: Order, status: string) => {
    setActionLoading(o.id);
    try {
      await api('/api/orders', { method: 'PUT', ...jbody({ id: o.id, status }) });
      refresh();
    } catch (e: any) { setErr(e.message); }
    setActionLoading(null);
  };

  const sendToShipping = async (o: Order) => {
    setShippingLoading(o.id);
    try {
      await api('/api/shipping', { method: 'POST', ...jbody({ order_id: o.id }) });
      refresh();
    } catch (e: any) { setErr(e.message); }
    setShippingLoading(null);
  };

  const toggleBlacklist = async (o: Order, blacklist: boolean) => {
    setBlacklistLoading(o.phone);
    try {
      await api('/api/customers', { method: 'PUT', ...jbody({ phone: o.phone, is_blacklisted: blacklist, name: o.customer_name }) });
      refresh();
    } catch (e: any) { setErr(e.message); }
    setBlacklistLoading(null);
  };

  const productsTotal = (o: Order) => (o.items || []).reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0);

  const openMerge = (o: Order) => {
    setMergeErr('');
    setMergeTarget(o.id);
    setMergePrimaryId(o.id);
  };

  const confirmMerge = async () => {
    if (!mergeTarget || !mergePrimaryId) return;
    const dupGroup = dupGroups.find(g => g.some(x => x.id === mergeTarget)) || [];
    const secondaryIds = dupGroup.filter(x => x.id !== mergePrimaryId).map(x => x.id);
    if (!secondaryIds.length) { setMergeErr('Aucune commande secondaire à fusionner'); return; }
    setMerging(true); setMergeErr('');
    try {
      await api('/api/orders-merge', { method: 'POST', ...jbody({ primary_id: mergePrimaryId, secondary_ids: secondaryIds }) });
      setMergeTarget(null); setMergePrimaryId(null);
      refresh();
    } catch (e: any) { setMergeErr(e.message); }
    setMerging(false);
  };

  return (
    <AdminShell title="Commandes">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl">Commandes</h1>
        <button onClick={() => setShowMerged(s => !s)} className={`tap text-xs px-3 h-8 rounded-full border ${showMerged ? 'border-burgundy text-burgundy bg-burgundy/5' : 'border-bordergray text-ink/50'}`}>
          {showMerged ? 'Masquer fusionnées' : 'Voir fusionnées'}
        </button>
      </div>

      {dupGroups.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-2xl border border-amber-300/60 bg-amber-50 p-3.5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">{dupGroups.length} groupe(s) de commandes en double détecté(s)</p>
            <p className="text-xs text-amber-700/80 mt-0.5">{dupIds.size} commande(s) — même numéro, moins de 24h. Vérifiez et fusionnez ci-dessous.</p>
          </div>
        </motion.div>
      )}

      {loading ? <Spinner className="py-20" /> : err ? <p className="text-rose text-sm text-center py-20">{err}</p> : visibleOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-soft"><p className="text-sm text-ink/40">Aucune commande</p></div>
      ) : (
        <div className="space-y-2">
          {visibleOrders.map((o, i) => {
            const isDup = dupIds.has(o.id);
            const dupGroup = dupGroups.find(g => g.some(x => x.id === o.id)) || [];
            const siblings = dupGroup.filter(x => x.id !== o.id);
            const shipping = o.shipping;
            const grandTotal = Number(o.total);
            const isBlacklisted = !!o.is_blacklisted;
            const isActive = ['pending', 'confirmed', 'shipped', 'delivered'].includes(o.status);
            const allStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
            const isOverride = overrideMode === o.id;
            return (
              <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={`bg-white rounded-2xl p-4 shadow-soft border ${isBlacklisted ? 'border-rose/40' : isDup ? 'border-amber-300/70' : 'border-transparent'}`}>

                <button onClick={() => setOpen(open === o.id ? null : o.id)} className="w-full flex items-center justify-between text-left">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">#{o.id} · {o.customer_name}</p>
                      {isBlacklisted && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose/15 text-rose font-semibold flex items-center gap-1 shrink-0">
                          <ShieldAlert size={9} /> Blacklisté
                        </span>
                      )}
                      {isDup && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold flex items-center gap-1 shrink-0">
                          <AlertTriangle size={9} /> Doublon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink/50 mt-0.5">{new Date(o.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {grandTotal.toFixed(0)} DA</p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium shrink-0 ${statusColor[o.status] || statusColor.pending}`}>{statusLabel[o.status] || o.status}</span>
                </button>

                {/* Blacklist warning banner */}
                {isBlacklisted && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 rounded-xl bg-rose/10 border border-rose/30 p-3 flex items-start gap-2.5">
                    <ShieldAlert size={16} className="text-rose mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-rose">⚠️ High-Risk Spam: Customer refused deliveries before.</p>
                      <p className="text-[11px] text-rose/70 mt-0.5">Ce numéro ({o.phone}) est sur liste noire. Vérifiez avant d'expédier.</p>
                    </div>
                  </motion.div>
                )}

                {/* Duplicate merge panel */}
                {isDup && siblings.length > 0 && (
                  <div className="mt-3 rounded-xl bg-amber-50/60 border border-amber-200/70 p-3">
                    <div className="flex items-center gap-1.5 text-amber-700 text-xs font-medium mb-2">
                      <AlertTriangle size={13} /> Commandes en double ({dupGroup.length}) — même téléphone {o.phone}
                    </div>
                    <div className="space-y-1.5 mb-2.5">
                      {dupGroup.map(x => (
                        <div key={x.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-2.5 py-1.5 border border-amber-100">
                          <span>#{x.id} · {x.customer_name} · {new Date(x.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-ink/50">{(x.items || []).length} art.</span>
                        </div>
                      ))}
                    </div>
                    {mergeTarget === o.id ? (
                      <div className="bg-white rounded-lg p-2.5 border border-amber-200">
                        <p className="text-[11px] text-ink/60 mb-2">Choisir la commande principale (les autres seront fusionnées) :</p>
                        <div className="space-y-1.5 mb-2.5">
                          {dupGroup.map(x => (
                            <label key={x.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name={`merge-${o.id}`} checked={mergePrimaryId === x.id}
                                onChange={() => setMergePrimaryId(x.id)} className="accent-burgundy w-3.5 h-3.5" />
                              <span>#{x.id} · {x.customer_name}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={confirmMerge} disabled={merging || !mergePrimaryId}
                            className="tap flex-1 h-9 rounded-lg bg-burgundy text-white text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                            {merging ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><GitMerge size={13} /> Confirmer la fusion</>}
                          </button>
                          <button onClick={() => { setMergeTarget(null); setMergePrimaryId(null); setMergeErr(''); }} className="tap h-9 px-3 rounded-lg border border-bordergray text-ink/60 text-xs">Annuler</button>
                        </div>
                        {mergeErr && <p className="text-[11px] text-rose mt-2 text-center">{mergeErr}</p>}
                      </div>
                    ) : (
                      <button onClick={() => openMerge(o)} className="tap w-full h-9 rounded-lg bg-amber-500 text-white text-xs font-medium flex items-center justify-center gap-1.5">
                        <GitMerge size={13} /> Fusionner les commandes
                      </button>
                    )}
                  </div>
                )}

                {open === o.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 pt-3 border-t border-bordergray">
                    <div className="text-xs text-ink/60 space-y-1 mb-3">
                      <p>📞 {o.phone}</p>
                      <p>📍 {o.address}, {o.city}</p>
                      <p>💳 {o.payment_method === 'cod' ? 'Paiement à la livraison (COD)' : o.payment_method}</p>
                      {shipping && (
                        <p className="flex items-center gap-1.5">
                          {shipping.delivery_type === 'desk' ? <Store size={12} className="text-burgundy" /> : <Home size={12} className="text-burgundy" />}
                          <span>Wilaya {shipping.wilaya_id} — {shipping.wilaya_name} · {shipping.delivery_type === 'desk' ? 'Stopdesk' : 'Domicile'} · {Number(shipping.shipping_price).toFixed(0)} DA</span>
                        </p>
                      )}
                    </div>
                    <div className="space-y-1 mb-3">
                      {(o.items || []).map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs"><span className="text-ink/70">{it.name} · {it.colorName} · T.{it.size} ×{it.qty}</span><span>{(it.qty * it.price).toFixed(0)} DA</span></div>
                      ))}
                    </div>
                    <div className="rounded-xl bg-softgray p-3 space-y-1 mb-3">
                      <div className="flex justify-between text-xs text-ink/60"><span>Sous-total produits</span><span>{productsTotal(o).toFixed(0)} DA</span></div>
                      <div className="flex justify-between text-xs text-ink/60"><span>Frais de livraison</span><span className={shipping ? 'text-gold' : 'text-ink/40'}>{shipping ? `${Number(shipping.shipping_price).toFixed(0)} DA` : '—'}</span></div>
                      <div className="gold-line my-1" />
                      <div className="flex justify-between font-semibold text-sm"><span>Total commande</span><span className="text-burgundy">{grandTotal.toFixed(0)} DA</span></div>
                    </div>

                    {/* Returned/Cancelled stock note */}
                    {(o.status === 'returned' || o.status === 'cancelled') && (
                      <div className="rounded-xl bg-rose/5 border border-rose/20 p-2.5 mb-3 flex items-center gap-2">
                        <RotateCcw size={14} className="text-rose" />
                        <p className="text-[11px] text-rose/80">Stock restauré automatiquement pour chaque variante/taille.</p>
                      </div>
                    )}

                    {/* Tracking info — shown when a parcel has been created */}
                    {o.tracking_number && (
                      <div className="rounded-xl bg-burgundy/[0.04] border border-burgundy/15 p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Package size={14} className="text-burgundy" />
                          <p className="text-[11px] font-semibold text-burgundy">Colis envoyé au transporteur</p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] text-ink/40 tracking-wide">N° de suivi</p>
                            <p className="text-sm font-mono font-medium text-ink truncate">{o.tracking_number}</p>
                          </div>
                          {o.shipping_voucher_url && (
                            <a href={o.shipping_voucher_url} target="_blank" rel="noopener noreferrer"
                              className="tap shrink-0 h-9 px-3 rounded-lg bg-burgundy text-white text-xs font-medium flex items-center gap-1.5">
                              <FileText size={14} /> Bordereau
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="space-y-2">
                      {/* Override mode: eye icon toggle at top right */}
                      <div className="flex justify-end -mb-1">
                        <button onClick={() => setOverrideMode(isOverride ? null : o.id)}
                          className={`tap p-1.5 rounded-lg transition-colors ${isOverride ? 'bg-burgundy/10 text-burgundy' : 'text-ink/30 hover:text-ink/60'}`}
                          title={isOverride ? 'Fermer le mode override' : 'Mode override (changement direct)'}>
                          {isOverride ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      {isOverride ? (
                        /* Override mode: premium selection grid of all 6 statuses */
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-burgundy/20 bg-burgundy/[0.02] p-2.5">
                          <p className="text-[10px] text-burgundy/70 font-medium mb-2 px-1 flex items-center gap-1"><Eye size={11} /> Override — forcer le statut</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {allStatuses.map(s => {
                              const isCurrent = o.status === s;
                              return (
                                <button key={s} onClick={() => changeStatus(o, s)} disabled={isCurrent || actionLoading === o.id}
                                  className={`tap h-9 rounded-lg text-xs font-medium border transition-all disabled:opacity-40 ${isCurrent
                                    ? 'border-burgundy bg-burgundy text-white'
                                    : s === 'cancelled' || s === 'returned'
                                      ? 'border-rose/30 text-rose hover:bg-rose/5'
                                      : 'border-bordergray text-ink/70 hover:border-burgundy/40'}`}>
                                  {statusLabel[s]}
                                </button>
                              );
                            })}
                          </div>
                          {actionLoading === o.id && (
                            <div className="flex justify-center mt-2"><span className="w-4 h-4 border-2 border-burgundy/20 border-t-burgundy rounded-full animate-spin" /></div>
                          )}
                        </motion.div>
                      ) : (
                        /* Clean default view: stacked vertical buttons */
                        <>
                          {/* Primary: forward progression */}
                          {isActive && flow.indexOf(o.status) >= 0 && flow.indexOf(o.status) < flow.length - 1 && (
                            <button onClick={() => advance(o)} disabled={actionLoading === o.id}
                              className="tap w-full h-10 rounded-xl bg-burgundy text-white text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                              {actionLoading === o.id ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={15} /> Marquer: {statusLabel[flow[flow.indexOf(o.status) + 1]]}</>}
                            </button>
                          )}

                          {/* Secondary: send to shipping carrier (visible when confirmed, no tracking yet) */}
                          {(o.status === 'confirmed' || o.status === 'pending') && !o.tracking_number && (
                            <button onClick={() => sendToShipping(o)} disabled={shippingLoading === o.id}
                              className="tap w-full h-10 rounded-xl border border-burgundy/30 text-burgundy text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                              {shippingLoading === o.id ? <span className="w-4 h-4 border-2 border-burgundy/30 border-t-burgundy rounded-full animate-spin" /> : <><Truck size={15} /> Envoyer à la livraison</>}
                            </button>
                          )}

                          {/* Secondary: return (visible for shipped/delivered) */}
                          {(o.status === 'shipped' || o.status === 'delivered') && (
                            <button onClick={() => changeStatus(o, 'returned')} disabled={actionLoading === o.id}
                              className="tap w-full h-10 rounded-xl border border-rose/40 text-rose text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                              {actionLoading === o.id ? <span className="w-4 h-4 border-2 border-rose/30 border-t-rose rounded-full animate-spin" /> : <><Undo2 size={15} /> Marquer: Retourné (+ stock)</>}
                            </button>
                          )}

                          {/* Blacklist toggle */}
                          {isBlacklisted ? (
                            <button onClick={() => toggleBlacklist(o, false)} disabled={blacklistLoading === o.phone}
                              className="tap w-full h-10 rounded-xl border border-bordergray text-ink/60 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                              {blacklistLoading === o.phone ? <span className="w-4 h-4 border-2 border-ink/20 border-t-ink/60 rounded-full animate-spin" /> : <><Ban size={15} /> Retirer de la liste noire</>}
                            </button>
                          ) : (
                            <button onClick={() => toggleBlacklist(o, true)} disabled={blacklistLoading === o.phone}
                              className="tap w-full h-10 rounded-xl border border-rose/30 text-rose text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                              {blacklistLoading === o.phone ? <span className="w-4 h-4 border-2 border-rose/30 border-t-rose rounded-full animate-spin" /> : <><Ban size={15} /> Blacklist Customer</>}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
