// Browser-only demo backend.
//
// The real app talks to Rust through Tauri's `invoke()`. When the frontend is
// opened in a plain browser (design review, preview, tests) we emulate the same
// commands with the same payload shapes, persisted in localStorage. This keeps
// the UI fully explorable without a Rust build and lets every flow be tested.

import type {
  Cart,
  CartItem,
  CartWithItems,
  Client,
  Expense,
  ExpenseType,
  LoginResponse,
  Product,
  Smena,
  SyncStatus,
  Transaction,
  TransactionDetail,
  TransactionSummary,
  XReport,
} from './types';

const STORAGE_KEY = 'kassa-demo-v3';

interface DB {
  seq: number;
  sessions: Record<string, { cashier_id: number }>;
  smenas: Smena[];
  carts: Cart[];
  cartItems: CartItem[];
  products: Product[];
  clients: Client[];
  transactions: Transaction[];
  transactionItems: Array<CartItem & { transaction_id: number; is_returned: number }>;
  expenses: Expense[];
  expenseTypes: ExpenseType[];
  settings: Record<string, string>;
  lastSyncedAt: string | null;
}

const now = () => new Date().toISOString();
const isoMinutesAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

const PASSWORD = '1234';

function seed(): DB {
  const today = new Date();
  const at = (h: number, m: number) => {
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const products: Product[] = [
    ['4780000000017', 'Coca-Cola 1.5 l', 14000, 24, 'шт', 'Ichimliklar', false],
    ['4780000000024', 'Suv Hydrolife 1 l', 4000, 40, 'шт', 'Ichimliklar', false],
    ['4780000000031', 'Non patir', 4500, 30, 'шт', 'Non', false],
    ['4780000000048', 'Sut Milkland 1 l', 12500, 18, 'шт', 'Sut mahsulotlari', false],
    ['2700001', 'Olma', 18000, 50, 'кг', 'Meva-sabzavot', true],
    ['2700002', 'Banan', 24000, 30, 'кг', 'Meva-sabzavot', true],
    ['4780000000055', 'Guruch Lazer 1 kg', 22000, 20, 'шт', 'Bakaleya', false],
    ['4780000000062', 'Tuxum 10 dona', 19000, 16, 'шт', 'Sut mahsulotlari', false],
    ['4780000000079', 'Yogurt Danone', 6500, 25, 'шт', 'Sut mahsulotlari', false],
    ['4780000000086', 'Pishloq Golland 200 g', 28000, 12, 'шт', 'Sut mahsulotlari', false],
    ['4780000000093', 'Choy Ahmad 100 g', 16000, 22, 'шт', 'Bakaleya', false],
    ['4780000000109', 'Shakar 1 kg', 13000, 35, 'шт', 'Bakaleya', false],
    ['4780000000116', 'Makaron Mavi', 8000, 28, 'шт', 'Bakaleya', false],
    ['4780000000123', 'Salfetka 100 dona', 3500, 40, 'шт', 'Uy', false],
    ['4780000000130', 'Kraker Sladkaya', 5000, 40, 'шт', 'Shirinliklar', false],
    ['4780000000147', 'Kolbasa Doktor 400 g', 42000, 9, 'шт', 'Sut mahsulotlari', false],
  ].map((row, i) => ({
    id: i + 1,
    barcode: row[0] as string,
    name: row[1] as string,
    price: row[2] as number,
    stock_qty: row[3] as number,
    unit: row[4] as string,
    category: row[5] as string,
    is_weighted: row[6] as boolean,
    vat: null,
    expiry_date: null,
    updated_at: now(),
  }));

  const clients: Client[] = [
    {
      id: 1,
      name: 'Азиз Каримов',
      phone: '+998 90 123 45 67',
      balance: -84000,
      created_at: isoMinutesAgo(60 * 24 * 40),
      updated_at: isoMinutesAgo(60 * 5),
    },
    {
      id: 2,
      name: 'Мадина Юсупова',
      phone: '+998 93 555 12 09',
      balance: 25000,
      created_at: isoMinutesAgo(60 * 24 * 90),
      updated_at: isoMinutesAgo(60 * 30),
    },
    {
      id: 3,
      name: 'Санжар Тошматов',
      phone: '+998 97 700 33 21',
      balance: 0,
      created_at: isoMinutesAgo(60 * 24 * 12),
      updated_at: isoMinutesAgo(60 * 24 * 3),
    },
  ];

  const seededSmena: Smena = {
    id: 900,
    cashier_id: 1,
    opened_at: at(8, 30),
    closed_at: at(14, 10),
    status: 'closed',
  };

  const baseItems = (
    transaction_id: number,
    rows: Array<[number, number]>,
  ): Array<CartItem & { transaction_id: number; is_returned: number }> =>
    rows.map(([productId, qty], idx) => {
      const p = products.find((x) => x.id === productId)!;
      return {
        id: 8000 + transaction_id * 10 + idx,
        transaction_id,
        cart_id: 0,
        product_id: p.id,
        barcode: p.barcode,
        name: p.name,
        price: p.price,
        qty,
        weight: p.is_weighted ? qty : null,
        discount_type: null,
        discount_value: null,
        final_price: p.price * qty,
        is_weighted: p.is_weighted,
        is_returned: 0,
      };
    });

  const transactions: Transaction[] = [
    {
      id: 101,
      cart_id: 90,
      cashier_id: 1,
      smena_id: 900,
      kind: 'sale',
      total: 44500,
      discount_total: 0,
      cash_amount: 50000,
      card_amount: 0,
      debt_amount: 0,
      change_amount: 5550,
      client_id: null,
      status: 'success',
      sync_status: 'synced',
      created_at: at(9, 42),
    },
    {
      id: 102,
      cart_id: 91,
      cashier_id: 1,
      smena_id: 900,
      kind: 'sale',
      total: 86600,
      discount_total: 8600,
      cash_amount: 0,
      card_amount: 86600,
      debt_amount: 0,
      change_amount: 0,
      client_id: null,
      status: 'success_with_discount',
      sync_status: 'synced',
      created_at: at(11, 15),
    },
    {
      id: 103,
      cart_id: 92,
      cashier_id: 1,
      smena_id: 900,
      kind: 'sale',
      total: 54000,
      discount_total: 0,
      cash_amount: 0,
      card_amount: 0,
      debt_amount: 54000,
      change_amount: 0,
      client_id: 1,
      status: 'debt_added',
      sync_status: 'synced',
      created_at: at(13, 5),
    },
  ];

  const transactionItems = [
    ...baseItems(101, [
      [1, 1],
      [3, 2],
      [9, 2],
    ]),
    ...baseItems(102, [
      [10, 2],
      [7, 1],
      [12, 1],
    ]),
    ...baseItems(103, [
      [15, 6],
      [11, 1],
      [8, 1],
    ]),
  ];

  return {
    seq: 10_000,
    sessions: {},
    smenas: [seededSmena],
    carts: [],
    cartItems: [],
    products,
    clients,
    transactions,
    transactionItems,
    expenses: [],
    expenseTypes: [
      { id: 1, name: 'Инкассация' },
      { id: 2, name: 'Хозяйственные нужды' },
      { id: 3, name: 'Выдача зарплаты' },
      { id: 4, name: 'Прочее' },
    ],
    settings: {
      language: 'ru',
      auto_print: 'true',
      lock_timeout: '5',
      weighted_prefixes: '27,28,29',
      printer_name: 'XP-80C (USB)',
      printer_width: '80',
      autostart: 'false',
    },
    lastSyncedAt: at(13, 20),
  };
}

let memory: DB | null = null;

function load(): DB {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memory = JSON.parse(raw) as DB;
      return memory;
    }
  } catch {
    // Private mode or corrupted state: fall through to a fresh seed.
  }
  memory = seed();
  save();
  return memory;
}

function save() {
  try {
    if (memory) localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Demo data is disposable when storage is unavailable.
  }
}

export function resetDemoData() {
  memory = seed();
  save();
}

const wait = (ms = 70) => new Promise((resolve) => setTimeout(resolve, ms));
function fail(message: string): never {
  throw new Error(message);
}
const nextId = (db: DB) => ++db.seq;

function requireSession(db: DB, token: string): { cashier_id: number } {
  const session = db.sessions[token];
  if (!session) return fail('Сессия истекла. Войдите снова.') as never;
  return session;
}

function openSmenaOf(db: DB, cashierId: number): Smena | null {
  return db.smenas.find((s) => s.cashier_id === cashierId && s.status === 'open') ?? null;
}

function autoSyncIfNeeded(db: DB) {
  const pending = [
    ...db.transactions.filter((t) => t.sync_status === 'pending'),
    ...db.expenses.filter((e) => e.sync_status === 'pending'),
  ];
  if (!pending.length) return;
  const oldest = pending.reduce(
    (acc, item) => Math.min(acc, new Date(item.created_at).getTime()),
    Date.now(),
  );
  if (Date.now() - oldest < 6000) return;
  db.transactions.forEach((t) => {
    if (t.sync_status === 'pending') t.sync_status = 'synced';
  });
  db.expenses.forEach((e) => {
    if (e.sync_status === 'pending') e.sync_status = 'synced';
  });
  db.lastSyncedAt = now();
  save();
}

function cartWithItems(db: DB, cartId: number): CartWithItems {
  const cart = db.carts.find((c) => c.id === cartId) ?? fail('Корзина не найдена');
  const items = db.cartItems
    .filter((i) => i.cart_id === cartId)
    .map((i) => ({ ...i }));
  const total = items.reduce((sum, i) => sum + i.final_price, 0);
  return { cart: { ...cart }, items, total };
}

function recomputeItem(item: CartItem) {
  let final = item.price * item.qty;
  if (item.discount_type === 'percentage' && item.discount_value != null) {
    final *= 1 - item.discount_value / 100;
  } else if (item.discount_type === 'fixed' && item.discount_value != null) {
    final -= item.discount_value;
  }
  item.final_price = Math.max(0, Math.round(final * 100) / 100);
}

export async function demoInvoke<T>(cmd: string, args: Record<string, any> = {}): Promise<T> {
  await wait();
  const db = load();
  autoSyncIfNeeded(db);

  switch (cmd) {
    case 'has_cashiers': {
      return true as T;
    }

    case 'restart_app_with_update': {
      window.location.reload();
      return undefined as T;
    }

    case 'bootstrap_cashier': {
      const { username, password } = args;
      if (!username || String(password).length < 4) {
        fail('Имя пользователя обязательно, а пароль должен быть не менее 4 символов');
      }
      const token = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      db.sessions[token] = { cashier_id: 1 };
      save();
      const res: LoginResponse = {
        token,
        cashier_id: 1,
        cashier_name: String(username),
        open_smena: null,
      };
      return res as T;
    }
    case 'login': {
      const { username, password } = args;
      if (username !== 'admin' || password !== PASSWORD) {
        fail('Неверное имя пользователя или пароль');
      }
      const token = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      db.sessions[token] = { cashier_id: 1 };
      save();
      const res: LoginResponse = {
        token,
        cashier_id: 1,
        cashier_name: 'Дилноза Р.',
        open_smena: openSmenaOf(db, 1),
      };
      return res as T;
    }

    case 'logout': {
      delete db.sessions[args.token];
      save();
      return undefined as T;
    }

    case 'validate_session': {
      const session = requireSession(db, args.token);
      return {
        cashier_id: session.cashier_id,
        cashier_name: 'Дилноза Р.',
        is_locked: false,
        open_smena: openSmenaOf(db, session.cashier_id),
      } as T;
    }

    case 'lock_screen':
      return undefined as T;

    case 'unlock_screen': {
      requireSession(db, args.token);
      if (args.password !== PASSWORD) fail('Неверный пароль');
      return undefined as T;
    }

    case 'open_smena': {
      const session = requireSession(db, args.token);
      if (openSmenaOf(db, session.cashier_id)) fail('Смена уже открыта');
      const smena: Smena = {
        id: nextId(db),
        cashier_id: session.cashier_id,
        opened_at: now(),
        closed_at: null,
        status: 'open',
      };
      db.smenas.push(smena);
      save();
      return smena as T;
    }

    case 'close_smena': {
      const session = requireSession(db, args.token);
      const smenaId = Number(args.smenaId ?? args.smena_id ?? 0);
      const isForce = Boolean(args.force);
      const pending = db.transactions.filter(
        (t) => t.smena_id === smenaId && t.sync_status === 'pending',
      ).length;
      if (pending > 0 && !isForce) {
        fail(
          `Нельзя закрыть смену: ${pending} чек(ов) ждут синхронизации. Повторите отправку и попробуйте снова.`,
        );
      }
      const smena = db.smenas.find((s) => s.id === smenaId && s.cashier_id === session.cashier_id);
      if (!smena) fail('Смена не найдена');
      smena.status = 'closed';
      smena.closed_at = now();
      save();
      return undefined as T;
    }

    case 'get_current_smena': {
      const session = requireSession(db, args.token);
      return openSmenaOf(db, session.cashier_id) as T;
    }

    case 'get_x_report': {
      const session = requireSession(db, args.token);
      const smenaId = Number(args.smenaId ?? args.smena_id ?? 0);
      const smena = db.smenas.find((s) => s.id === smenaId && s.cashier_id === session.cashier_id);
      if (!smena) fail('Смена не найдена');
      const sales = db.transactions.filter(
        (t) => t.smena_id === smenaId && t.kind === 'sale' && t.cashier_id === session.cashier_id,
      );
      const report: XReport = {
        smena_id: smenaId,
        opened_at: smena.opened_at,
        total_cash: sales.reduce((s, t) => s + t.cash_amount, 0),
        total_card: sales.reduce((s, t) => s + t.card_amount, 0),
        total_returns: Math.abs(
          db.transactions
            .filter((t) => t.smena_id === smenaId && t.kind === 'return')
            .reduce((s, t) => s + t.total, 0),
        ),
        total_expenses: db.expenses
          .filter((e) => e.smena_id === smenaId)
          .reduce((s, e) => s + e.amount, 0),
        total_debt: sales.reduce((s, t) => s + t.debt_amount, 0),
        transaction_count: sales.length,
      };
      return report as T;
    }

    case 'search_products': {
      const query = String(args.query ?? '').toLowerCase();
      const list = db.products
        .filter(
          (p) =>
            !query ||
            p.name.toLowerCase().includes(query) ||
            (p.barcode ?? '').includes(query) ||
            (p.category ?? '').toLowerCase().includes(query),
        )
        .slice(0, 50)
        .map((p) => ({ ...p }));
      return list as T;
    }

    case 'get_product_by_barcode': {
      const product = db.products.find((p) => p.barcode === args.barcode);
      return (product ? { ...product } : null) as T;
    }

    case 'parse_weighted_barcode': {
      const barcode = String(args.barcode ?? '');
      if (barcode.length !== 13) return null as T;
      const prefixes = (db.settings.weighted_prefixes || '27,28,29').split(',');
      const prefix = prefixes.find((p) => barcode.startsWith(p.trim()));
      if (!prefix) return null as T;
      const product = db.products.find((p) => p.barcode === barcode.slice(0, 7));
      if (!product) return null as T;
      const weight = Number(barcode.slice(7, 12)) / 1000;
      return {
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        weight,
        computed_price: product.price * weight,
      } as T;
    }

    case 'create_cart': {
      const session = requireSession(db, args.token);
      const smena = openSmenaOf(db, session.cashier_id);
      const cart: Cart = {
        id: nextId(db),
        cashier_id: session.cashier_id,
        smena_id: smena?.id ?? null,
        name: null,
        status: 'active',
        created_at: now(),
        updated_at: now(),
      };
      db.carts.push(cart);
      save();
      return { ...cart } as T;
    }

    case 'add_to_cart': {
      requireSession(db, args.token);
      const cartId = Number(args.cartId ?? args.cart_id);
      const rawBarcode = String(args.barcode ?? '').trim();
      if (!rawBarcode) fail('Введите штрих-код');

      let searchBarcode = rawBarcode;
      let weighted = false;
      let weight: number | null = null;
      if (rawBarcode.length === 13) {
        const prefixes = (db.settings.weighted_prefixes || '27,28,29').split(',');
        if (prefixes.some((p) => rawBarcode.startsWith(p.trim()))) {
          weighted = true;
          weight = Number(rawBarcode.slice(7, 12)) / 1000;
          searchBarcode = rawBarcode.slice(0, 7);
        }
      }

      const product = db.products.find((p) => (p.barcode ?? '').startsWith(searchBarcode));
      if (!product) fail('Товар не найден');
      const isWeighted = weighted || product.is_weighted;
      const qty = isWeighted ? weight ?? 1 : 1;
      const existing = db.cartItems.find(
        (i) => i.cart_id === cartId && i.product_id === product.id,
      );

      if (existing) {
        const nextQty = existing.qty + qty;
        if (!isWeighted && nextQty > product.stock_qty) {
          fail(`На складе только ${product.stock_qty} ${product.unit}`);
        }
        existing.qty = nextQty;
        if (isWeighted) existing.weight = nextQty;
        recomputeItem(existing);
        save();
        return { ...existing } as T;
      }

      if (!isWeighted && qty > product.stock_qty) {
        fail(`На складе только ${product.stock_qty} ${product.unit}`);
      }

      const item: CartItem = {
        id: nextId(db),
        cart_id: cartId,
        product_id: product.id,
        barcode: rawBarcode,
        name: product.name,
        price: product.price,
        qty,
        weight: isWeighted ? qty : null,
        discount_type: null,
        discount_value: null,
        final_price: Math.round(product.price * qty * 100) / 100,
        is_weighted: isWeighted,
      };
      db.cartItems.push(item);
      const cart = db.carts.find((c) => c.id === cartId);
      if (cart) cart.updated_at = now();
      save();
      return { ...item } as T;
    }

    case 'update_cart_item_qty': {
      requireSession(db, args.token);
      const item = db.cartItems.find((i) => i.id === Number(args.itemId ?? args.item_id));
      if (!item) fail('Позиция не найдена');
      const product = db.products.find((p) => p.id === item.product_id);
      const qty = Number(args.qty);
      if (qty <= 0) {
        db.cartItems = db.cartItems.filter((i) => i.id !== item.id);
      } else {
        if (product && !item.is_weighted && qty > product.stock_qty) {
          fail(`На складе только ${product.stock_qty} ${product.unit}`);
        }
        item.qty = qty;
        if (item.is_weighted) item.weight = qty;
        recomputeItem(item);
      }
      save();
      return item as T;
    }

    case 'remove_cart_item': {
      requireSession(db, args.token);
      db.cartItems = db.cartItems.filter(
        (i) => i.id !== Number(args.itemId ?? args.item_id),
      );
      save();
      return undefined as T;
    }

    case 'clear_cart': {
      requireSession(db, args.token);
      const cartId = Number(args.cartId ?? args.cart_id);
      db.cartItems = db.cartItems.filter((i) => i.cart_id !== cartId);
      save();
      return undefined as T;
    }

    case 'park_cart': {
      requireSession(db, args.token);
      const cartId = Number(args.cartId ?? args.cart_id);
      const cart = db.carts.find((c) => c.id === cartId);
      if (!cart) fail('Корзина не найдена');
      cart.status = 'parked';
      cart.name = String(args.name ?? 'Отложенный чек');
      cart.updated_at = now();
      save();
      return undefined as T;
    }

    case 'resume_cart': {
      requireSession(db, args.token);
      const cartId = Number(args.cartId ?? args.cart_id);
      const cart = db.carts.find((c) => c.id === cartId);
      if (!cart) fail('Корзина не найдена');
      cart.status = 'active';
      cart.updated_at = now();
      save();
      return cartWithItems(db, cartId) as T;
    }

    case 'get_parked_carts': {
      requireSession(db, args.token);
      return db.carts
        .filter((c) => c.status === 'parked')
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((c) => ({ ...c })) as T;
    }

    case 'get_active_carts': {
      requireSession(db, args.token);
      return db.carts
        .filter((c) => c.status === 'active')
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((c) => cartWithItems(db, c.id)) as T;
    }

    case 'apply_item_discount': {
      requireSession(db, args.token);
      const item = db.cartItems.find((i) => i.id === Number(args.itemId ?? args.item_id));
      if (!item) fail('Позиция не найдена');
      const type = args.discountType ?? args.discount_type;
      const value = Number(args.value ?? args.discountVal ?? 0);
      if (!type || value <= 0) {
        item.discount_type = null;
        item.discount_value = null;
      } else {
        item.discount_type = type;
        item.discount_value = value;
      }
      recomputeItem(item);
      save();
      return { ...item } as T;
    }

    case 'apply_cart_discount': {
      requireSession(db, args.token);
      const cartId = Number(args.cartId ?? args.cart_id);
      const items = db.cartItems.filter((i) => i.cart_id === cartId);
      const baseTotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      if (!baseTotal) return [] as unknown as T;
      const type = args.discountType ?? args.discount_type;
      const value = Number(args.value ?? args.discountVal ?? 0);
      items.forEach((item) => {
        if (!type || value <= 0) {
          item.discount_type = null;
          item.discount_value = null;
        } else if (type === 'percentage') {
          item.discount_type = 'percentage';
          item.discount_value = value;
        } else {
          const ratio = (item.price * item.qty) / baseTotal;
          item.discount_type = 'fixed';
          item.discount_value = Math.round(value * ratio * 100) / 100;
        }
        recomputeItem(item);
      });
      save();
      return items as unknown as T;
    }

    case 'process_payment': {
      const session = requireSession(db, args.token);
      const cartId = Number(args.cartId ?? args.cart_id);
      const items = db.cartItems.filter((i) => i.cart_id === cartId);
      if (!items.length) fail('Корзина пуста');
      const total = items.reduce((s, i) => s + i.final_price, 0);
      const original = items.reduce((s, i) => s + i.price * i.qty, 0);
      const cash = Number(args.cashAmount ?? 0);
      const card = Number(args.cardAmount ?? 0);
      const debt = Number(args.debtAmount ?? 0);
      const clientId = args.clientId != null ? Number(args.clientId) : null;
      if (cash + card + debt < total - 0.01) fail('Недостаточно средств для оплаты');
      if (debt > 0 && !clientId) fail('Укажите клиента для продажи в долг');

      const smena = openSmenaOf(db, session.cashier_id);
      const txId = nextId(db);
      const status =
        debt > 0 ? 'debt_added' : original - total > 0.01 ? 'success_with_discount' : 'success';

      if (debt > 0) {
        const client = db.clients.find((c) => c.id === clientId);
        if (client) client.balance -= debt;
      }

      items.forEach((item) => {
        db.transactionItems.push({
          ...item,
          id: nextId(db),
          transaction_id: txId,
          cart_id: txId,
          is_returned: 0,
        });
        if (item.product_id) {
          const product = db.products.find((p) => p.id === item.product_id);
          if (product && !product.is_weighted) {
            product.stock_qty = Math.max(0, product.stock_qty - item.qty);
          }
        }
      });

      db.transactions.push({
        id: txId,
        cart_id: cartId,
        cashier_id: session.cashier_id,
        smena_id: smena?.id ?? null,
        kind: 'sale',
        total,
        discount_total: original - total,
        cash_amount: cash,
        card_amount: card,
        debt_amount: debt,
        change_amount: Math.max(0, cash + card + debt - total),
        client_id: clientId,
        status,
        sync_status: 'pending',
        created_at: now(),
      });

      const cart = db.carts.find((c) => c.id === cartId);
      if (cart) {
        cart.status = 'completed';
        cart.updated_at = now();
      }
      save();
      return db.transactions[db.transactions.length - 1] as T;
    }

    case 'process_return': {
      const session = requireSession(db, args.token);
      const txId = Number(args.transactionId ?? args.transaction_id);
      const original = db.transactions.find(
        (t) => t.id === txId && t.cashier_id === session.cashier_id,
      );
      if (!original) fail('Чек не найден');
      const isFull = Boolean(args.isFull ?? args.is_full);
      const selected: number[] = (args.itemIds ?? args.item_ids ?? []).map(Number);
      const lines = db.transactionItems.filter(
        (i) => i.transaction_id === txId && i.is_returned === 0,
      );
      let returnTotal = 0;
      lines.forEach((line) => {
        if (isFull || selected.includes(line.id)) {
          line.is_returned = 1;
          returnTotal += line.final_price;
          if (line.product_id) {
            const product = db.products.find((p) => p.id === line.product_id);
            if (product && !product.is_weighted) product.stock_qty += line.qty;
          }
        }
      });
      if (!returnTotal) fail('Выберите хотя бы одну позицию');
      if (original.debt_amount > 0 && original.client_id) {
        const client = db.clients.find((c) => c.id === original.client_id);
        if (client) {
          client.balance += original.debt_amount * (returnTotal / original.total);
        }
      }
      original.status = isFull ? 'full_return' : 'partial_return';
      const tx: Transaction = {
        id: nextId(db),
        cart_id: null,
        cashier_id: session.cashier_id,
        smena_id: original.smena_id,
        kind: 'return',
        total: -returnTotal,
        discount_total: 0,
        cash_amount: 0,
        card_amount: 0,
        debt_amount: 0,
        change_amount: 0,
        client_id: original.client_id,
        status: isFull ? 'full_return' : 'partial_return',
        sync_status: 'pending',
        created_at: now(),
      };
      db.transactions.push(tx);
      save();
      return tx as T;
    }

    case 'pay_client_debt': {
      const session = requireSession(db, args.token);
      const clientId = Number(args.clientId ?? args.client_id);
      const amount = Number(args.amount);
      const client = db.clients.find((c) => c.id === clientId);
      if (!client) fail('Клиент не найден');
      if (!amount || amount <= 0) fail('Введите сумму больше нуля');
      client.balance += amount;
      const smena = openSmenaOf(db, session.cashier_id);
      const tx: Transaction = {
        id: nextId(db),
        cart_id: null,
        cashier_id: session.cashier_id,
        smena_id: smena?.id ?? null,
        kind: 'debt_payment',
        total: amount,
        discount_total: 0,
        cash_amount: amount,
        card_amount: 0,
        debt_amount: 0,
        change_amount: 0,
        client_id: clientId,
        status: 'success',
        sync_status: 'pending',
        created_at: now(),
      };
      db.transactions.push(tx);
      save();
      return tx as T;
    }

    case 'search_clients': {
      const query = String(args.query ?? '').toLowerCase();
      return db.clients
        .filter(
          (c) =>
            !query ||
            c.name.toLowerCase().includes(query) ||
            (c.phone ?? '').includes(query),
        )
        .map((c) => ({ ...c })) as T;
    }

    case 'create_client': {
      const client: Client = {
        id: nextId(db),
        name: String(args.name ?? '').trim(),
        phone: args.phone ? String(args.phone) : null,
        balance: 0,
        created_at: now(),
        updated_at: now(),
      };
      if (!client.name) fail('Введите имя клиента');
      db.clients.push(client);
      save();
      return { ...client } as T;
    }

    case 'get_client': {
      const client = db.clients.find((c) => c.id === Number(args.clientId ?? args.client_id));
      if (!client) fail('Клиент не найден');
      return { ...client } as T;
    }

    case 'get_receipts': {
      const session = requireSession(db, args.token);
      const search = String(args.search ?? '').toLowerCase();
      const from = args.dateFrom ?? args.date_from;
      const to = args.dateTo ?? args.date_to;
      const list = db.transactions
        .filter((t) => t.cashier_id === session.cashier_id)
        .filter((t) => {
          if (!from && !to) return true;
          const day = t.created_at.slice(0, 10);
          if (from && day < String(from).slice(0, 10)) return false;
          if (to && day > String(to).slice(0, 10)) return false;
          return true;
        })
        .filter((t) => {
          if (!search) return true;
          const items = db.transactionItems.filter((i) => i.transaction_id === t.id);
          return items.some(
            (i) =>
              i.name.toLowerCase().includes(search) ||
              (i.barcode ?? '').includes(search),
          );
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map<TransactionSummary>((t) => ({
          id: t.id,
          kind: t.kind,
          total: t.total,
          status: t.status,
          sync_status: t.sync_status,
          created_at: t.created_at,
          client_name: db.clients.find((c) => c.id === t.client_id)?.name ?? null,
        }));
      return list as T;
    }

    case 'get_receipt_detail': {
      const session = requireSession(db, args.token);
      const txId = Number(args.transactionId ?? args.transaction_id);
      const transaction = db.transactions.find(
        (t) => t.id === txId && t.cashier_id === session.cashier_id,
      );
      if (!transaction) fail('Чек не найден');
      const items = db.transactionItems
        .filter((i) => i.transaction_id === txId)
        .map((i) => ({ ...i }));
      return { transaction: { ...transaction }, items } as TransactionDetail as T;
    }

    case 'create_expense': {
      const session = requireSession(db, args.token);
      const smena = openSmenaOf(db, session.cashier_id);
      const expense: Expense = {
        id: nextId(db),
        cashier_id: session.cashier_id,
        smena_id: smena?.id ?? null,
        expense_type_id: Number(args.expenseTypeId ?? args.expense_type_id),
        amount: Number(args.amount),
        note: args.note ? String(args.note) : null,
        sync_status: 'pending',
        created_at: now(),
      };
      if (!(expense.amount > 0)) fail('Введите сумму расхода');
      db.expenses.push(expense);
      save();
      return { ...expense } as T;
    }

    case 'get_expense_types':
      return db.expenseTypes.map((e) => ({ ...e })) as T;

    case 'get_smena_expenses': {
      requireSession(db, args.token);
      const smenaId = Number(args.smenaId ?? args.smena_id);
      return db.expenses
        .filter((e) => e.smena_id === smenaId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((e) => ({ ...e })) as T;
    }

    case 'list_printers':
      return ['XP-80C (USB)', 'EPSON TM-T20III', 'Microsoft Print to PDF'] as T;

    case 'print_receipt':
    case 'open_cash_drawer':
      return undefined as T;

    case 'get_all_settings':
      return { ...db.settings } as T;

    case 'update_setting': {
      db.settings[String(args.key)] = String(args.value);
      save();
      return undefined as T;
    }

    case 'get_sync_status': {
      const pending =
        db.transactions.filter((t) => t.sync_status === 'pending').length +
        db.expenses.filter((e) => e.sync_status === 'pending').length;
      return {
        pending_count: pending,
        failed_count: 0,
        last_synced_at: db.lastSyncedAt,
      } as SyncStatus as T;
    }

    case 'retry_failed_sync': {
      db.transactions.forEach((t) => {
        if (t.sync_status === 'pending') t.sync_status = 'synced';
      });
      db.expenses.forEach((e) => {
        if (e.sync_status === 'pending') e.sync_status = 'synced';
      });
      db.lastSyncedAt = now();
      save();
      return 0 as T;
    }

    default:
      return fail(`Команда ${cmd} не поддерживается в демо-режиме`);
  }
}
