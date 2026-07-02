import type { CartItem } from './types';

const KEY = 'laila_cart';

export function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-changed'));
}

export function addToCart(item: CartItem) {
  const items = getCart();
  const idx = items.findIndex(i => i.key === item.key);
  if (idx >= 0) items[idx].qty += item.qty;
  else items.push(item);
  saveCart(items);
}

export function updateQty(key: string, qty: number) {
  const items = getCart().map(i => i.key === key ? { ...i, qty: Math.max(1, qty) } : i).filter(i => i.qty > 0);
  saveCart(items);
}

export function removeItem(key: string) {
  saveCart(getCart().filter(i => i.key !== key));
}

export function clearCart() { saveCart([]); }

export function cartCount(): number {
  return getCart().reduce((s, i) => s + i.qty, 0);
}

export function cartTotal(): number {
  return getCart().reduce((s, i) => s + i.qty * i.price, 0);
}

export function effectivePrice(price: number, discount: number): number {
  return discount > 0 ? Math.round(price * (1 - discount / 100) * 100) / 100 : price;
}
