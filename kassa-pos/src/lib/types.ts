// Types here mirror the serde structs in `src-tauri/src/commands`.
// Keep them in sync: the Rust layer is the source of truth for the shape.

export interface Smena {
  id: number;
  cashier_id: number;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed';
}

export interface SessionInfo {
  cashier_id: number;
  cashier_name: string;
  is_locked: boolean;
  open_smena: Smena | null;
}

export interface LoginResponse {
  token: string;
  cashier_id: number;
  cashier_name: string;
  open_smena: Smena | null;
}

export interface Product {
  id: number;
  barcode: string | null;
  name: string;
  price: number;
  stock_qty: number;
  unit: string;
  category: string | null;
  is_weighted: boolean;
  vat: number | null;
  expiry_date: string | null;
  updated_at: string;
}

export interface Cart {
  id: number;
  cashier_id: number;
  smena_id: number | null;
  name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: number;
  cart_id: number;
  product_id: number | null;
  barcode: string | null;
  name: string;
  price: number;
  qty: number;
  weight: number | null;
  discount_type: 'percentage' | 'fixed' | null;
  discount_value: number | null;
  final_price: number;
  is_weighted: boolean;
}

export interface CartWithItems {
  cart: Cart;
  items: CartItem[];
  total: number;
}

export interface Client {
  id: number;
  name: string;
  phone: string | null;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  cart_id: number | null;
  cashier_id: number;
  smena_id: number | null;
  kind: 'sale' | 'return' | 'debt_payment' | string;
  total: number;
  discount_total: number;
  cash_amount: number;
  card_amount: number;
  debt_amount: number;
  change_amount: number;
  client_id: number | null;
  status: string;
  sync_status: 'pending' | 'synced' | 'failed' | string;
  created_at: string;
}

export interface TransactionSummary {
  id: number;
  kind: string;
  total: number;
  status: string;
  sync_status: string;
  created_at: string;
  client_name: string | null;
}

export interface TransactionDetail {
  transaction: Transaction;
  items: CartItem[];
}

export interface XReport {
  smena_id: number;
  opened_at: string;
  total_cash: number;
  total_card: number;
  total_returns: number;
  total_expenses: number;
  total_debt: number;
  transaction_count: number;
}

export interface Expense {
  id: number;
  cashier_id: number;
  smena_id: number | null;
  expense_type_id: number | null;
  amount: number;
  note: string | null;
  sync_status: string;
  created_at: string;
}

export interface ExpenseType {
  id: number;
  name: string;
}

export interface SyncStatus {
  pending_count: number;
  failed_count: number;
  last_synced_at: string | null;
}
