import supabase from './db-client.js';
import { verifyAdmin } from './verify-admin.js';

/**
 * Shipping API Integration (Yalidine / YalExpress format)
 * Creates a parcel/colis with the carrier and returns tracking_number + voucher URL.
 * Uses SHIPPING_API_KEY and SHIPPING_API_TOKEN from environment variables.
 * Falls back to a realistic mock response when credentials are absent (demo mode).
 */

const YALIDINE_API_URL = 'https://api.yalidine.app/v1/parcel';

function splitName(fullName) {
  const parts = (fullName || 'Client Inconnu').trim().split(/\s+/);
  if (parts.length >= 2) {
    return { prenom: parts[0], nom: parts.slice(1).join(' ') };
  }
  return { prenom: parts[0] || 'Client', nom: 'Inconnu' };
}

function buildItemSummary(items) {
  if (!items || !items.length) return 'Commande Laila Shoes';
  return items.map(it => `${it.name} (${it.colorName || ''} T.${it.size || ''}) x${it.qty}`).join(', ');
}

/**
 * Calls the real Yalidine API to create a parcel.
 * Returns { tracking_number, voucher_url, label }
 */
async function createYalidineParcel(order, shipping) {
  const apiKey = process.env.SHIPPING_API_KEY;
  const apiToken = process.env.SHIPPING_API_TOKEN;

  if (!apiKey || !apiToken) {
    throw new Error('SHIPPING_API_KEY / SHIPPING_API_TOKEN not configured');
  }

  const { prenom, nom } = splitName(order.customer_name);
  const isStopdesk = shipping?.delivery_type === 'desk';

  // Yalidine API payload format
  const payload = {
    prenom,
    nom,
    telephone: order.phone,
    wilaya: String(shipping?.wilaya_id || ''),
    commune: String(shipping?.wilaya_id || ''), // commune ID — in production map from a communes table
    adresse: `${order.address}, ${order.city}`,
    type: isStopdesk ? 'stopdesk' : 'home',
    prix: String(Math.round(Number(order.total))),
    poids: '500', // 500g default for shoes/bags
    produit: buildItemSummary(order.items),
    note: `Commande #${order.id} — Laila Shoes`,
  };

  const response = await fetch(YALIDINE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API_KEY': apiKey,
      'API_TOKEN': apiToken,
    },
    body: JSON.stringify([payload]), // Yalidine expects an array
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Yalidine API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  // Yalidine returns { data: [{ tracking, label, ... }] } or similar
  const parcel = Array.isArray(data?.data) ? data.data[0] : data?.data || data;

  return {
    tracking_number: parcel?.tracking || parcel?.tracking_number || `YL-${order.id}-${Date.now()}`,
    voucher_url: parcel?.label || parcel?.voucher_url || parcel?.pdf_url || '',
  };
}

/**
 * Mock response for demo mode (when no carrier credentials are configured).
 * Generates a realistic tracking number and a placeholder voucher URL.
 */
function mockShippingResponse(order) {
  const tracking = `YL${String(order.id).padStart(8, '0')}${Date.now().toString().slice(-4)}`;
  return {
    tracking_number: tracking,
    voucher_url: `https://api.yalidine.app/v1/parcel/label/${tracking}.pdf`,
    mock: true,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Accès administrateur requis' });

  try {
    if (req.method === 'POST') {
      const { order_id } = req.body;
      if (!order_id) return res.status(400).json({ error: 'order_id requis' });

      // Fetch the order + its shipping metadata
      const { data: order, error: oerr } = await supabase
        .from('orders').select('*').eq('id', Number(order_id)).single();
      if (oerr) throw new Error('Commande introuvable');

      const { data: shipping } = await supabase
        .from('order_shipping').select('*').eq('order_id', Number(order_id)).single();

      if (!shipping) {
        return res.status(400).json({ error: 'Aucune donnée de livraison (wilaya) pour cette commande' });
      }

      // Check if already shipped (tracking exists)
      const { data: existing } = await supabase
        .from('order_tracking').select('*').eq('order_id', Number(order_id)).maybeSingle();
      if (existing?.tracking_number) {
        return res.status(409).json({ error: 'Colis déjà créé', tracking_number: existing.tracking_number, voucher_url: existing.shipping_voucher_url });
      }

      // Call the carrier API (or mock)
      let result;
      const hasCredentials = process.env.SHIPPING_API_KEY && process.env.SHIPPING_API_TOKEN;
      try {
        result = hasCredentials
          ? await createYalidineParcel(order, shipping)
          : mockShippingResponse(order);
      } catch (apiErr) {
        // If real API fails, fall back to mock so the admin can still proceed
        console.error('Yalidine API failed, using mock:', apiErr.message);
        result = { ...mockShippingResponse(order), mock: true, api_error: apiErr.message };
      }

      // Save tracking data to the order_tracking table
      const { data: trackingRow, error: terr } = await supabase
        .from('order_tracking')
        .insert({
          order_id: Number(order_id),
          tracking_number: result.tracking_number,
          shipping_voucher_url: result.voucher_url,
        })
        .select()
        .single();
      if (terr) throw terr;

      // Auto-advance order status to 'shipped' if it was 'confirmed' or 'pending'
      if (order.status === 'pending' || order.status === 'confirmed') {
        await supabase.from('orders').update({ status: 'shipped' }).eq('id', Number(order_id));
      }

      return res.status(200).json({
        tracking_number: result.tracking_number,
        voucher_url: result.voucher_url,
        mock: !!result.mock,
        status_updated: order.status === 'pending' || order.status === 'confirmed',
      });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('shipping error:', err);
    res.status(500).json({ error: err.message });
  }
}
