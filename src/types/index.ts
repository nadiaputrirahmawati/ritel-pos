// Roles
export type UserRole = 'admin' | 'cashier';

// User Model
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

// Auth Responses
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    token_type: string;
    user: User;
  };
}

// Category
export interface Category {
  id: number;
  name: string;
}

// Product
export interface Product {
  id: number;
  category_id: number;
  category?: Category;
  name: string;
  sku: string;
  barcode: string | null;
  cost_price: number;
  price: number;
  stock_quantity: number;
  unit: string;
}

// Form Payload Tambah Produk
export interface CreateProductPayload {
  category_id: number;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  cost_price: number;
  price: number;
  stock_quantity: number;
  unit?: string;
}

// Cart Item (State Klien)
export interface CartItem {
  product: Product;
  quantity: number;
}

// Checkout Request Payload
export interface CheckoutItemPayload {
  product_id: number;
  quantity: number;
}

export interface CheckoutPayload {
  items: CheckoutItemPayload[];
  paid_amount?: number | null;
}

// Order & Items Response
export interface OrderItem {
  id: number;
  product_id: number;
  product: {
    id: number;
    name: string;
    unit: string;
  };
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: number;
  invoice_number: string;
  order_date: string;
  total_amount: number;
  status: string;
  cashier?: {
    id: number;
    name: string;
  };
  items: OrderItem[];
}

export interface CheckoutPaymentInfo {
  total_amount: number;
  paid_amount: number;
  change: number;
}

export interface CheckoutResponse {
  success: boolean;
  message: string;
  data: Order;
  payment?: CheckoutPaymentInfo;
}

// Standard Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// Validation Error Response (422)
export interface ValidationErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

// Struk (data hasil encode ESC/POS) — struktur SAMA PERSIS dengan backend Laravel
export interface ReceiptData {
  shop: {
    shop_name: string;
    address: string;
    phone_number: string;
    receipt_footer: string;
    paper_width: number; // 58 atau 80
  };
  order: {
    invoice_number: string;
    order_date: string; // format tampilan, mis. "07 Agu 2026 20:30"
    cashier: string;
    total: number;
    paid_amount?: number; // uang dibayar tunai (opsional)
    change?: number; // kembalian = paid_amount - total
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
    }>;
  };
}

// Shop settings dari backend (endpoint GET /api/shop-settings)
export interface ShopSettings {
  id: number | null;
  shop_name: string;
  address: string | null;
  phone_number: string | null;
  email: string | null;
  logo_url: string | null;
  receipt_footer: string | null;
  paper_width: number; // 58 atau 80
}
