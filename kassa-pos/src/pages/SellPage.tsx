import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Minus,
  Percent,
  Plus,
  ScanLine,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslation } from '../i18n/i18nContext';
import { useCartStore } from '../stores/cartStore';
import { invoke, errorMessage } from '../lib/desktop';
import type { CartItem, Product } from '../lib/types';
import { formatPrice, formatQty, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { DiscountDialog, type DiscountTarget } from '../components/DiscountDialog';
import { useToast } from '../components/ui/toast-host';
import type { PaymentMethod } from './PaymentModal';

interface SellPageProps {
  onRequestPayment: (method: PaymentMethod) => void;
  onOpenShift: () => void;
  noShift: boolean;
  touchMode?: boolean;
}

export function SellPage({ onRequestPayment, onOpenShift, noShift, touchMode = false }: SellPageProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    carts,
    activeCart,
    activeCartIndex,
    parkedCarts,
    selectedItemId,
    setSelectedItemId,
    setActiveTab,
    createCart,
    addToCart,
    updateItemQty,
    removeItem,
    clearCart,
    closeCart,
    parkCart,
    resumeCart,
    applyItemDiscount,
    applyCartDiscount,
    refreshParkedCarts,
  } = useCartStore();

  const [barcode, setBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [quickProducts, setQuickProducts] = useState<Product[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recentItemId, setRecentItemId] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CartItem | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [closingCartId, setClosingCartId] = useState<number | null>(null);
  const [parkOpen, setParkOpen] = useState(false);
  const [parkName, setParkName] = useState('');
  const [discountTarget, setDiscountTarget] = useState<DiscountTarget | null>(null);

  const scannerRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Touch mode drops the price column (it moves under the product name) so the
  // remaining columns stay comfortable to hit on a screen.
  const rowGrid = touchMode
    ? 'grid-cols-[minmax(0,1fr)_148px_124px_60px]'
    : 'grid-cols-[minmax(0,1fr)_88px_136px_104px_72px]';

  const focusScanner = useCallback(() => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.closest('[role="dialog"]')) &&
        active !== scannerRef.current
      ) {
        return;
      }
      scannerRef.current?.focus();
    }, 40);
  }, []);

  useEffect(() => {
    focusScanner();
  }, [activeCartIndex, focusScanner]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('button') ||
        target.closest('[role="dialog"]') ||
        target.closest('[role="tab"]')
      ) {
        return;
      }
      focusScanner();
    };
    document.addEventListener('pointerup', handleDocumentClick);
    return () => document.removeEventListener('pointerup', handleDocumentClick);
  }, [focusScanner]);

  useEffect(() => {
    invoke<Product[]>('search_products', { query: '' })
      .then((list) => setQuickProducts(list.slice(0, 9)))
      .catch(() => setQuickProducts([]));
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      invoke<Product[]>('search_products', { query })
        .then((list) => {
          setResults(list.slice(0, 8));
          setSearchOpen(true);
        })
        .catch(() => setResults([]));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'F1') {
        event.preventDefault();
        if (activeCart?.items.length) onRequestPayment('cash');
      } else if (event.key === 'F2') {
        event.preventDefault();
        if (activeCart?.items.length) onRequestPayment('card');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCart, onRequestPayment]);

  const addProduct = useCallback(
    async (code: string) => {
      if (!activeCart) {
        await createCart();
      }
      try {
        setBusy(true);
        const item = await addToCart(code);
        setRecentItemId(item.id);
        window.setTimeout(() => setRecentItemId((current) => (current === item.id ? null : current)), 260);
        setBarcode('');
        setSearch('');
        setSearchOpen(false);
        focusScanner();
      } catch (error) {
        toast({
          title: t('sell.cannot_add'),
          description: errorMessage(error),
          variant: 'destructive',
        });
        scannerRef.current?.select();
      } finally {
        setBusy(false);
      }
    },
    [activeCart, addToCart, createCart, focusScanner, t, toast],
  );

  const handleLoadDemoProducts = useCallback(async () => {
    try {
      setBusy(true);
      const count = await invoke<number>('load_demo_products');
      toast({
        title: 'Демо-товары загружены',
        description: `Добавлено позиций: ${count}. Весовой товар: 2700001012503`,
        variant: 'success',
      });
      const list = await invoke<Product[]>('search_products', { query: '' });
      setQuickProducts(list.slice(0, 9));
      focusScanner();
    } catch (error) {
      toast({
        title: 'Ошибка загрузки демо-товаров',
        description: errorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }, [focusScanner, toast]);

  const handleScan = (event: React.FormEvent) => {
    event.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    void addProduct(code);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (results[0]?.barcode) {
      void addProduct(results[0].barcode);
    } else if (search.trim()) {
      void addProduct(search.trim());
    }
  };

  const handleQty = async (item: CartItem, next: number) => {
    if (next < 1) return;
    try {
      await updateItemQty(item.id, next);
    } catch (error) {
      toast({ title: t('sell.cannot_change'), description: errorMessage(error), variant: 'destructive' });
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeItem(removeTarget.id);
      toast({ title: t('sell.removed'), description: removeTarget.name });
    } catch (error) {
      toast({ title: t('general.error'), description: errorMessage(error), variant: 'destructive' });
    } finally {
      setRemoveTarget(null);
      focusScanner();
    }
  };

  const confirmClear = async () => {
    try {
      await clearCart();
      toast({ title: t('sell.cleared') });
    } catch (error) {
      toast({ title: t('general.error'), description: errorMessage(error), variant: 'destructive' });
    } finally {
      setClearOpen(false);
      focusScanner();
    }
  };

  const submitPark = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = parkName.trim();
    if (!name) return;
    try {
      await parkCart(name);
      setParkOpen(false);
      setParkName('');
      toast({ title: t('sell.parked_success'), description: name });
      focusScanner();
    } catch (error) {
      toast({ title: t('general.error'), description: errorMessage(error), variant: 'destructive' });
    }
  };

  const openPark = async () => {
    setParkOpen(true);
    await refreshParkedCarts();
  };

  const resumeParked = async (id: number) => {
    try {
      await resumeCart(id);
      setParkOpen(false);
      focusScanner();
    } catch (error) {
      toast({ title: t('general.error'), description: errorMessage(error), variant: 'destructive' });
    }
  };

  const items = activeCart?.items ?? [];
  const total = activeCart?.total ?? 0;
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items],
  );
  const discount = subtotal - total;

  const applyDiscount = async (type: 'percentage' | 'fixed' | null, value: number) => {
    if (!discountTarget) return;
    if (discountTarget.kind === 'cart') await applyCartDiscount(type, value);
    else if (discountTarget.item) await applyItemDiscount(discountTarget.item.id, type, value);
    toast({
      title: type ? t('discount.applied_title') : t('discount.removed_title'),
      description: type
        ? discountTarget.kind === 'cart'
          ? t('discount.cart_short')
          : discountTarget.name
        : discountTarget.name,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {noShift && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rule bg-warning-tint px-4 py-2 text-[12px] text-warning">
          <span>{t('sell.no_shift')}</span>
          <Button size="sm" variant="outline" onClick={onOpenShift} className="border-warning/40 text-warning hover:border-warning">
            {t('sell.open_shift')}
          </Button>
        </div>
      )}

      {/* Scan and search */}
      <div className={cn('shrink-0 border-b border-rule bg-paper', touchMode ? 'px-4 pb-4 pt-4' : 'px-4 pb-3 pt-4')}>
        <div className={cn('flex', touchMode ? 'flex-col gap-3' : 'gap-3')}>
          <form onSubmit={handleScan} className={cn('min-w-0', touchMode ? 'w-full' : 'flex-[1.35]')}>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="scan-input"
                className={cn('block font-medium text-ink-soft', touchMode ? 'text-[13px]' : 'text-[12px]')}
              >
                {t('sell.scan_label')}
              </label>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Сканер готов</span>
              </span>
            </div>
            <div className="relative">
              <ScanLine
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                strokeWidth={1.75}
              />
              <Input
                id="scan-input"
                ref={scannerRef}
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                placeholder={t('sell.scan_placeholder')}
                autoComplete="off"
                spellCheck={false}
                className={cn('pl-9 pr-16', touchMode ? 'h-16 text-[20px]' : 'h-12 text-[16px]')}
                disabled={busy}
              />
              <span className="num pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink-faint">
                Enter
              </span>
            </div>
          </form>

          <div className={cn('relative min-w-0', touchMode ? 'w-full' : 'flex-1')}>
            <label
              htmlFor="search-input"
              className={cn('mb-1.5 block font-medium text-ink-soft', touchMode ? 'text-[13px]' : 'text-[12px]')}
            >
              {t('sell.search_label')}
            </label>
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                  strokeWidth={1.75}
                />
                <Input
                  id="search-input"
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onFocus={() => search.trim().length >= 2 && setSearchOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setSearchOpen(false);
                  }}
                  placeholder={t('sell.search_placeholder')}
                  autoComplete="off"
                  className={cn('pl-9 pr-10', touchMode ? 'h-16 text-[17px]' : 'h-12')}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setResults([]);
                      setSearchOpen(false);
                    }}
                    aria-label={t('general.clear')}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-ink-faint hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>

            {searchOpen && search.trim().length >= 2 && (
              <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 border border-rule-strong bg-paper shadow-[0_18px_40px_-20px_rgba(10,14,9,0.4)] animate-fade">
                <div className="flex items-center justify-between px-3 pb-2">
                  <span className="text-[12px] text-ink-soft">{t('sell.search_results')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setResults([]);
                      setSearchOpen(false);
                    }}
                    aria-label={t('general.close')}
                    className="rounded-[2px] text-ink-faint hover:text-ink h-6 w-6 flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {results.length === 0 ? (
                  <p className="px-3 py-4 text-[12px] text-ink-soft">{t('sell.no_results')}</p>
                ) : (
                  <ul className="max-h-80 overflow-auto">
                    {results.map((product) => (
                      <li key={product.id} className="border-b border-rule last:border-0">
                        <button
                          type="button"
                          onClick={() => product.barcode && void addProduct(product.barcode)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-counter"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] text-ink">{product.name}</span>
                            <span className="num block text-[11px] text-ink-faint">
                              {product.barcode} · {t('sell.in_stock', { qty: formatQty(product.stock_qty), unit: product.unit })}
                            </span>
                          </span>
                          <span className="num shrink-0 text-[13px] font-medium text-ink">
                            {formatPrice(product.price)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart tabs — in touch mode cheques live in the left rail instead */}
      {!touchMode && (
      <div className="flex shrink-0 items-end gap-1 overflow-x-auto border-b border-rule bg-counter-deep px-4 pt-2">
        {carts.map((entry, index) => {
          const createdOrder = [...carts]
            .sort((a, b) => a.cart.created_at.localeCompare(b.cart.created_at))
            .findIndex((item) => item.cart.id === entry.cart.id);
          return (
          <button
            key={entry.cart.id}
            type="button"
            onClick={() => {
              setActiveTab(index);
              focusScanner();
            }}
            className={cn(
              'group relative -mb-px flex min-h-10 max-w-[210px] shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3 text-[12px] font-medium transition-all',
              activeCartIndex === index
                ? 'border-rule-strong bg-paper text-ink shadow-[0_-1px_3px_rgba(0,0,0,0.04)] before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:rounded-t-lg before:bg-carbon'
                : 'border-transparent text-ink-soft hover:bg-counter hover:text-ink',
            )}
          >
            <span className="truncate">
              {entry.cart.name || t('sell.cart', { n: createdOrder + 1 })}
            </span>
            <span className="num rounded-full bg-counter-deep px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">
              {entry.items.length}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                if (entry.items.length > 0) {
                  setClosingCartId(entry.cart.id);
                } else {
                  void closeCart(entry.cart.id);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  if (entry.items.length > 0) {
                    setClosingCartId(entry.cart.id);
                  } else {
                    void closeCart(entry.cart.id);
                  }
                }
              }}
              title="Закрыть вкладку"
              aria-label="Закрыть вкладку"
              className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-ink-faint transition-all hover:bg-danger-tint hover:text-danger opacity-60 group-hover:opacity-100"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </span>
          </button>
          );
        })}
        {carts.length < 10 && (
          <button
            type="button"
            onClick={() => void createCart().then(focusScanner)}
            aria-label={t('sell.new_cart')}
            title={t('sell.new_cart')}
            className="-mb-px flex h-10 w-10 shrink-0 items-center justify-center rounded-t-[3px] text-ink-soft transition-colors hover:bg-counter hover:text-ink"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
          </button>
        )}

        <div className="ml-auto flex shrink-0 items-center pb-1 pl-3">
          <button
            type="button"
            onClick={() => void openPark()}
            className="flex min-h-9 items-center gap-1.5 px-2 text-[12px] text-ink-soft transition-colors hover:text-ink"
          >
            <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t('sell.park')}
            {parkedCarts.length > 0 && (
              <span className="num rounded-[2px] border border-rule-strong px-1 text-[10px]">
                {parkedCarts.length}
              </span>
            )}
          </button>
        </div>
      </div>
      )}

      {/* Ledger */}
      <div className="min-h-0 flex-1 overflow-auto bg-paper">
        {items.length === 0 ? (
          <div className="px-5 py-6">
            <p className="text-[12px] font-medium text-ink-soft">{t('sell.empty_title')}</p>
            <p className="mt-1 max-w-[46ch] text-[20px] font-semibold leading-snug tracking-tight text-ink">
              {t('sell.empty_hint')}
            </p>

            <div className="mt-7 border-t border-rule pt-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-medium text-ink-soft">{t('sell.quick_add')}</h2>
                <button
                  type="button"
                  onClick={() => void handleLoadDemoProducts()}
                  className="text-[11px] font-medium text-ink-soft hover:text-ink underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Загрузить демо-товары
                </button>
              </div>
              <div
                className={cn(
                  'mt-3 grid gap-px border border-rule bg-rule',
                  touchMode ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3',
                )}
              >
                {quickProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => product.barcode && void addProduct(product.barcode)}
                    className={cn(
                      'group flex flex-col items-start justify-between bg-paper text-left transition-colors hover:bg-counter',
                      touchMode ? 'min-h-[96px] p-4' : 'min-h-[70px] p-3',
                    )}
                  >
                    <span
                      className={cn('line-clamp-2 leading-snug text-ink', touchMode ? 'text-[15px]' : 'text-[13px]')}
                    >
                      {product.name}
                    </span>
                    <span className="mt-2 flex w-full items-baseline justify-between">
                      <span className="num text-[12px] text-ink-soft">{formatPrice(product.price)}</span>
                      <span className="text-[10px] text-ink-faint">
                        {formatQty(product.stock_qty)} {product.unit}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'sticky top-0 z-10 grid gap-3 border-b border-rule bg-paper-deep px-4 py-2 font-medium text-ink-soft',
                rowGrid,
                touchMode ? 'text-[12px] uppercase tracking-[0.06em]' : 'text-[11px]',
              )}
            >
              <span>{t('sell.col_name')}</span>
              {!touchMode && <span className="text-right">{t('sell.col_price')}</span>}
              <span className="text-center">{t('sell.col_qty')}</span>
              <span className="text-right">{t('sell.col_sum')}</span>
              <span className="text-right">{touchMode ? '' : t('sell.col_actions')}</span>
            </div>

            <ul>
              {items.map((item) => {
                const isSelected = selectedItemId === item.id;
                return (
                  <li
                    key={item.id}
                    role="row"
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClick={() => setSelectedItemId(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedItemId(item.id);
                      }
                    }}
                    className={cn(
                      'group relative grid cursor-pointer items-center gap-3 border-b border-rule border-l-[3.5px] px-4 transition-all outline-none',
                      rowGrid,
                      touchMode ? 'min-h-[84px] py-2.5' : 'min-h-14 py-2',
                      isSelected
                        ? 'border-l-carbon bg-carbon-tint/40 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:bg-carbon-tint/25'
                        : 'border-l-transparent hover:bg-paper-deep',
                      recentItemId === item.id && 'animate-print',
                    )}
                  >
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'truncate text-ink',
                          touchMode ? 'text-[16px]' : 'text-[14px]',
                          isSelected ? 'font-semibold' : 'font-normal',
                        )}
                      >
                        {item.name}
                      </p>
                      <p className={cn('num flex items-center gap-2 text-ink-faint', touchMode ? 'mt-1 text-[12px]' : 'mt-0.5 text-[10px]')}>
                        {touchMode && <span className="shrink-0">{formatPrice(item.price)}</span>}
                        <span className="truncate">{item.barcode}</span>
                        {item.discount_type && (
                          <span className="shrink-0 font-medium text-warning">
                            {item.discount_type === 'percentage'
                              ? `−${item.discount_value}%`
                              : `−${formatPrice(item.discount_value ?? 0)}`}
                          </span>
                        )}
                      </p>
                    </div>

                    {!touchMode && (
                      <span className="num text-right text-[13px] text-ink">{formatPrice(item.price)}</span>
                    )}

                    <div className="flex items-center justify-center">
                      {item.is_weighted ? (
                        <span className={cn('num text-ink-soft', touchMode ? 'text-[15px]' : 'text-[13px]')}>
                          {formatQty(item.qty)} кг
                        </span>
                      ) : (
                        <div className="flex items-center rounded-md border border-rule-strong bg-paper">
                          <button
                            type="button"
                            aria-label={t('sell.decrease')}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleQty(item, item.qty - 1);
                            }}
                            disabled={item.qty <= 1}
                            className={cn(
                              'flex items-center justify-center text-ink-soft transition-colors hover:bg-counter hover:text-ink disabled:opacity-35',
                              touchMode ? 'h-[52px] w-[48px]' : 'h-10 w-10',
                            )}
                          >
                            <Minus className={touchMode ? 'h-4 w-4' : 'h-3.5 w-3.5'} strokeWidth={2.2} />
                          </button>
                          <span
                            className={cn(
                              'num flex items-center justify-center border-x border-rule font-medium text-ink',
                              touchMode ? 'h-[52px] w-[48px] text-[16px]' : 'h-10 w-11 text-[13px]',
                            )}
                          >
                            {formatQty(item.qty)}
                          </span>
                          <button
                            type="button"
                            aria-label={t('sell.increase')}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleQty(item, item.qty + 1);
                            }}
                            className={cn(
                              'flex items-center justify-center text-ink-soft transition-colors hover:bg-counter hover:text-ink',
                              touchMode ? 'h-[52px] w-[48px]' : 'h-10 w-10',
                            )}
                          >
                            <Plus className={touchMode ? 'h-4 w-4' : 'h-3.5 w-3.5'} strokeWidth={2.2} />
                          </button>
                        </div>
                      )}
                    </div>

                    <span
                      className={cn(
                        'num text-right font-semibold tracking-tight text-ink',
                        touchMode ? 'text-[17px]' : 'text-[15px]',
                      )}
                    >
                      {formatPrice(item.final_price)}
                    </span>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        aria-label={t('sell.line_discount')}
                        title={t('sell.line_discount')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDiscountTarget({
                            kind: 'item',
                            item,
                            name: item.name,
                            currentType: item.discount_type,
                            currentValue: item.discount_value,
                            hasDiscount: Boolean(item.discount_type),
                          });
                        }}
                        className={cn(
                          'flex items-center justify-center rounded-md transition-colors hover:bg-counter hover:text-carbon',
                          touchMode ? 'h-[48px] w-[48px]' : 'h-9 w-9',
                          item.discount_type ? 'text-warning' : 'text-ink-faint',
                        )}
                      >
                        <Percent className={touchMode ? 'h-4 w-4' : 'h-3.5 w-3.5'} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        aria-label={t('sell.remove_item')}
                        title={t('sell.remove_item')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemoveTarget(item);
                        }}
                        className={cn(
                          'flex items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-danger-tint hover:text-danger',
                          touchMode ? 'h-[48px] w-[48px]' : 'h-9 w-9',
                        )}
                      >
                        <X className={touchMode ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Total band */}
      <div className="shrink-0 border-t border-rule bg-paper">
        <div className="flex items-stretch">
          <div className={cn('flex min-w-0 flex-1 flex-wrap items-center gap-2 px-4', touchMode ? 'gap-2.5 py-4' : 'py-3')}>
            <Button
              variant="outline"
              size={touchMode ? 'lg' : 'sm'}
              onClick={() =>
                setDiscountTarget({
                  kind: 'cart',
                  name: t('discount.cart_target', {
                    name: activeCart?.cart.name || t('sell.cart', { n: activeCartIndex + 1 }),
                  }),
                  currentType: null,
                  currentValue: null,
                  hasDiscount: items.some((item) => Boolean(item.discount_type)),
                })
              }
              disabled={!items.length}
            >
              <Percent className="h-3.5 w-3.5" strokeWidth={1.75} />
              {t('sell.discount_cart')}
            </Button>
            <Button
              variant="outline"
              size={touchMode ? 'lg' : 'sm'}
              onClick={() => void openPark()}
              disabled={!items.length}
            >
              <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
              {t('sell.park')}
            </Button>
            <Button
              variant="dangerGhost"
              size={touchMode ? 'lg' : 'sm'}
              onClick={() => setClearOpen(true)}
              disabled={!items.length}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              {t('sell.clear')}
            </Button>
            {discount > 0 && (
              <span className="num ml-1 text-[11px] text-warning">
                −{formatPrice(discount)}
              </span>
            )}
          </div>

          <div className={cn('flex shrink-0 items-center gap-4 border-l border-rule px-4', touchMode ? 'py-4' : 'py-3')}>
            <div className="text-right">
              <p className={cn('text-ink-soft', touchMode ? 'text-[12px]' : 'text-[11px]')}>
                {t('payment.total')} · {t('sell.items', { count: items.length })}
              </p>
              <p
                className={cn(
                  'num mt-0.5 font-semibold leading-none tracking-tighter text-ink',
                  touchMode ? 'text-[44px]' : 'text-[38px]',
                )}
              >
                {formatPrice(total)}
              </p>
            </div>
            <Button
              size="xl"
              onClick={() => onRequestPayment('cash')}
              disabled={!items.length}
              className={cn(touchMode ? 'min-h-16 min-w-[220px] text-[18px]' : 'min-w-[150px]')}
            >
              {t('sell.pay')}
              <span className="num ml-1 text-[10px] font-normal opacity-70">F1</span>
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={t('sell.remove_title')}
        description={removeTarget ? t('sell.remove_description', { name: removeTarget.name }) : ''}
        confirmLabel={t('sell.remove_confirm')}
        cancelLabel={t('general.cancel')}
        destructive
        onConfirm={() => void confirmRemove()}
        onClose={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={clearOpen}
        title={t('sell.clear_title')}
        description={t('sell.clear_description', { count: items.length })}
        confirmLabel={t('sell.clear_confirm')}
        cancelLabel={t('general.cancel')}
        destructive
        onConfirm={() => void confirmClear()}
        onClose={() => setClearOpen(false)}
      />

      <DiscountDialog
        target={discountTarget}
        onClose={() => setDiscountTarget(null)}
        onSubmit={applyDiscount}
      />

      <Dialog open={parkOpen} onOpenChange={(next) => !next && setParkOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('sell.park_title')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-5">
            <form onSubmit={submitPark} className="space-y-3">
              <Input
                label={t('sell.park_name')}
                value={parkName}
                onChange={(event) => setParkName(event.target.value)}
                placeholder={t('sell.park_placeholder')}
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={!parkName.trim() || !items.length}>
                {t('sell.park_submit')}
              </Button>
            </form>

            <div className="border-t border-rule pt-4">
              <h3 className="text-[12px] font-medium text-ink-soft">{t('sell.park_existing')}</h3>
              {parkedCarts.length === 0 ? (
                <p className="mt-3 text-[12px] text-ink-faint">{t('sell.park_empty')}</p>
              ) : (
                <ul className="mt-2 divide-y divide-rule border-y border-rule">
                  {parkedCarts.map((cart) => (
                    <li key={cart.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-ink">{cart.name || `#${cart.id}`}</p>
                        <p className="num text-[10px] text-ink-faint">#{cart.id}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => void resumeParked(cart.id)}>
                        {t('sell.resume')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParkOpen(false)}>
              {t('general.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={closingCartId !== null}
        onClose={() => setClosingCartId(null)}
        title="Закрыть вкладку чека?"
        description="В этом чеке есть добавленные товары. При закрытии они будут удалены."
        confirmLabel="Закрыть чек"
        cancelLabel={t('general.cancel')}
        destructive
        onConfirm={() => {
          if (closingCartId !== null) {
            void closeCart(closingCartId);
            setClosingCartId(null);
            focusScanner();
          }
        }}
      />
    </div>
  );
}
