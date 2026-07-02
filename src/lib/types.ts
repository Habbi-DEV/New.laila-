export interface Category {
  id: number;
  name: string;
  slug: string;
  image: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  category_id: number;
  category_name?: string;
  category_slug?: string;
  price: number;
  discount: number;
  status: 'active' | 'draft';
  featured: boolean;
  created_at: string;
  cover_image?: string;
  colors?: { hex: string; name: string; type: string }[];
  in_stock?: boolean;
}

export interface SizeStock {
  size: string;
  stock: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  color_name: string;
  color_hex: string;
  color_type: 'primary' | 'other';
  is_default: boolean;
  images: string[];
  sizes: SizeStock[];
  created_at?: string;
}

export interface CartItem {
  key: string;
  productId: number;
  variantId: number;
  name: string;
  colorName: string;
  colorHex: string;
  size: string;
  qty: number;
  price: number;
  image: string;
}

export interface Wilaya {
  id: number;
  name: string;
  home_shipping_price: number;
  desk_shipping_price: number;
}

export interface OrderShipping {
  id: number;
  order_id: number;
  wilaya_id: number;
  wilaya_name: string;
  delivery_type: 'home' | 'desk';
  shipping_price: number;
  created_at: string;
}

export interface Order {
  id: number;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  total: number;
  payment_method: string;
  status: string;
  items: CartItem[];
  created_at: string;
  shipping?: OrderShipping | null;
}

export const SHOE_SIZES = ['36', '37', '38', '39', '40', '41'];
export const BAG_SIZES = ['Unique'];
