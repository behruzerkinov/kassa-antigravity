import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Percent, Wallet, Delete, Check, ShoppingBag } from 'lucide-react';
import { useCartStore, type CartWithItems, type CartItem } from '../stores/cartStore';
import { formatPrice, formatQty, cn } from '../lib/utils';
import { useToast } from './ui/toast-host';
import { errorMessage } from '../lib/desktop';

/**
 * The cashier numpad only does two things:
 *  - "Сумма": the customer asks for a given amount of a line (e.g. 15 000 сум of apples).
 *    The amount is converted into quantity for the selected line.
 *  - "Скидка": a percentage discount on the selected line.
 *
 * Quantity steppers live on the cart rows, cash tender lives in the payment dialog,
 * and sum/percent discounts for a whole receipt live in the receipt action bar.
 */
type NumpadMode = 'amount' | 'discount';

interface NumpadPanelProps {
  cart: CartWithItems | null;
  touchMode?: boolean;
}

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '00'];

export function NumpadPanel({ cart, touchMode = false }: NumpadPanelProps) {
  const { toast } = useToast();
  const { selectedItemId, setSelectedItemId, updateItemQty, applyItemDiscount } = useCartStore();

  const [mode, setMode] = useState<NumpadMode>('amount');
  const [buffer, setBuffer] = useState<string>('');

  const items = cart?.items ?? [];
  const selectedItem: CartItem | null = useMemo(() => {
    if (!items.length) return null;
    return items.find((i) => i.id === selectedItemId) ?? items[items.length - 1] ?? null;
  }, [items, selectedItemId]);

  useEffect(() => {
    if (selectedItem && selectedItem.id !== selectedItemId) {
      setSelectedItemId(selectedItem.id);
    }
  }, [selectedItem, selectedItemId, setSelectedItemId]);

  useEffect(() => {
    setBuffer('');
  }, [mode, selectedItem?.id]);

  const handleKeyPress = useCallback((key: string) => {
    setBuffer((prev) => {
      if (key === 'del') return prev.slice(0, -1);
      if (key === 'clear') return '';
      if (key === '.') {
        if (prev.includes('.')) return prev;
        return prev === '' ? '0.' : prev + '.';
      }
      if (key === '00') {
        if (prev === '' || prev === '0') return '0';
        return (prev + '00').slice(0, 10);
      }
      if (prev === '0' && key !== '.') return key;
      return (prev + key).slice(0, 10);
    });
  }, []);

  const entered = parseFloat(buffer);
  const hasValue = !isNaN(entered);

  const unitPrice = selectedItem?.price ?? 0;
  const unit = selectedItem?.is_weighted ? 'кг' : 'шт';

  // Amount → quantity. Weighted lines keep three decimals, pieces stay whole.
  const previewQty = useMemo(() => {
    if (mode !== 'amount' || !hasValue || unitPrice <= 0) return null;
    const raw = entered / unitPrice;
    return selectedItem?.is_weighted ? Math.round(raw * 1000) / 1000 : Math.max(1, Math.round(raw));
  }, [mode, hasValue, entered, unitPrice, selectedItem?.is_weighted]);

  const apply = useCallback(async () => {
    if (!cart || !items.length) {
      toast({ title: 'Чек пуст', description: 'Добавьте товар перед изменением позиции' });
      return;
    }
    if (!selectedItem) {
      toast({ title: 'Выберите позицию в чеке' });
      return;
    }
    if (!hasValue) {
      toast({ title: 'Введите число на клавиатуре' });
      return;
    }

    try {
      if (mode === 'discount') {
        if (entered < 0 || entered > 100) {
          toast({ title: 'Скидка должна быть от 0 до 100%', variant: 'destructive' });
          return;
        }
        await applyItemDiscount(selectedItem.id, entered > 0 ? 'percentage' : null, entered);
        toast({
          title: entered > 0 ? `Скидка ${entered}% применена` : 'Скидка сброшена',
          description: selectedItem.name,
        });
        setBuffer('');
        return;
      }

      if (entered <= 0) {
        toast({ title: 'Введите сумму больше нуля' });
        return;
      }
      if (unitPrice <= 0) {
        toast({ title: 'У позиции нет цены', variant: 'destructive' });
        return;
      }
      const qty = selectedItem.is_weighted
        ? Math.round((entered / unitPrice) * 1000) / 1000
        : Math.max(1, Math.round(entered / unitPrice));

      await updateItemQty(selectedItem.id, qty);
      toast({
        title: 'Позиция пересчитана',
        description: `${selectedItem.name} → ${formatQty(qty)} ${unit} · ${formatPrice(qty * unitPrice)}`,
      });
      setBuffer('');
    } catch (error) {
      toast({
        title: 'Не удалось изменить позицию',
        description: errorMessage(error),
        variant: 'destructive',
      });
    }
  }, [
    cart,
    items.length,
    selectedItem,
    hasValue,
    entered,
    mode,
    unitPrice,
    unit,
    updateItemQty,
    applyItemDiscount,
    toast,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.closest('[role="dialog"]')
      ) {
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        handleKeyPress('.');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('del');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleKeyPress('clear');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        void apply();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, apply]);

  const total = cart?.total ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper select-none">
      {/* Selected line — the only thing the numpad edits */}
      <div className={cn('shrink-0 border-b border-rule bg-paper-deep', touchMode ? 'px-4 py-3.5' : 'px-3 py-2.5')}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} />
            {selectedItem ? 'Позиция' : 'Текущий чек'}
          </span>
          <span className={cn('num font-semibold text-ink', touchMode ? 'text-[20px]' : 'text-[16px]')}>
            {formatPrice(total)}
          </span>
        </div>

        {selectedItem ? (
          <div className="mt-1.5 min-w-0">
            <p className={cn('truncate font-semibold text-ink', touchMode ? 'text-[17px]' : 'text-[14px]')}>
              {selectedItem.name}
            </p>
            <p className={cn('num text-ink-soft', touchMode ? 'mt-1 text-[13px]' : 'mt-0.5 text-[11px]')}>
              {formatQty(selectedItem.qty)} {unit} × {formatPrice(selectedItem.price)}
              <span className="text-ink-faint"> · </span>
              <span className="font-semibold text-ink">{formatPrice(selectedItem.final_price)}</span>
              {selectedItem.discount_type === 'percentage' && (
                <span className="ml-1.5 font-medium text-warning">−{selectedItem.discount_value}%</span>
              )}
              {selectedItem.discount_type === 'fixed' && (
                <span className="ml-1.5 font-medium text-warning">
                  −{formatPrice(selectedItem.discount_value ?? 0)}
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className={cn('mt-1.5 text-ink-faint', touchMode ? 'text-[13px]' : 'text-[11.5px]')}>
            {items.length ? 'Выберите позицию в чеке' : 'Добавьте товар сканером или поиском'}
          </p>
        )}
      </div>

      {/* Two operations, nothing else */}
      <div className={cn('grid shrink-0 grid-cols-2 border-b border-rule bg-counter', touchMode ? 'gap-2 p-2' : 'gap-1 p-1.5')}>
        {(
          [
            { id: 'amount' as const, label: 'Сумма', icon: Wallet, hint: 'по позиции' },
            { id: 'discount' as const, label: 'Скидка', icon: Percent, hint: 'процент' },
          ]
        ).map((option) => {
          const Icon = option.icon;
          const active = mode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              aria-pressed={active}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border font-semibold transition-all',
                touchMode ? 'min-h-14 text-[16px]' : 'min-h-11 text-[13px]',
                active
                  ? 'border-carbon bg-carbon text-white shadow-sm'
                  : 'border-rule-strong bg-paper text-ink-soft hover:bg-paper-deep hover:text-ink',
              )}
            >
              <Icon className={touchMode ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={1.9} />
              <span>{option.label}</span>
              <span className={cn('font-normal', touchMode ? 'text-[11px]' : 'text-[10px]', active ? 'text-white/70' : 'text-ink-faint')}>
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>

      {/* Entry display */}
      <div className={cn('shrink-0 border-b border-rule bg-paper', touchMode ? 'px-4 py-3' : 'px-3 py-2.5')}>
        <div className={cn('flex items-baseline justify-between gap-3 rounded-lg border border-rule-strong/60 bg-counter/40 px-3', touchMode ? 'py-3' : 'py-2')}>
          <div className="min-w-0">
            <p className={cn('font-medium text-ink-faint', touchMode ? 'text-[11px]' : 'text-[10px]')}>
              {mode === 'amount' ? 'Сумма по позиции, сум' : 'Скидка на позицию, %'}
            </p>
            <p
              className={cn(
                'num truncate font-semibold leading-tight text-ink',
                touchMode ? 'text-[32px]' : 'text-[24px]',
                buffer ? '' : 'text-ink-faint',
              )}
            >
              {buffer || '0'}
              {mode === 'discount' && buffer && '%'}
            </p>
          </div>
          {buffer && (
            <button
              type="button"
              onClick={() => handleKeyPress('clear')}
              className={cn(
                'shrink-0 rounded-md px-2 font-medium text-ink-faint hover:bg-counter hover:text-danger',
                touchMode ? 'min-h-10 text-[13px]' : 'min-h-8 text-[11px]',
              )}
            >
              Сброс
            </button>
          )}
        </div>
        {mode === 'amount' && previewQty !== null && (
          <p className={cn('num mt-1.5 text-ink-soft', touchMode ? 'text-[13px]' : 'text-[11px]')}>
            ≈ {formatQty(previewQty)} {unit} × {formatPrice(unitPrice)}
          </p>
        )}
      </div>

      {/* Number grid */}
      <div className={cn('grid min-h-0 flex-1 grid-cols-3 bg-counter', touchMode ? 'gap-2 p-2' : 'gap-1 p-1.5')}>
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKeyPress(key)}
            className={cn(
              'num flex items-center justify-center rounded-xl border border-black/5 bg-paper font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:bg-paper-deep active:scale-[0.98] dark:border-white/5',
              touchMode ? 'min-h-[64px] text-[26px]' : 'text-[24px]',
            )}
          >
            {key}
          </button>
        ))}
      </div>

      <div className={cn('grid shrink-0 grid-cols-[1fr_2.2fr] border-t border-rule bg-paper', touchMode ? 'gap-2 p-2' : 'gap-1.5 p-2')}>
        <button
          type="button"
          onClick={() => handleKeyPress('del')}
          aria-label="Удалить символ"
          className={cn(
            'flex items-center justify-center rounded-xl border border-rule-strong/70 bg-counter text-ink-soft transition-all hover:bg-counter-deep hover:text-ink active:scale-95',
            touchMode ? 'min-h-14' : 'min-h-12',
          )}
        >
          <Delete className={touchMode ? 'h-6 w-6' : 'h-5 w-5'} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => void apply()}
          disabled={!buffer || !selectedItem}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl bg-carbon font-semibold text-white shadow-md transition-all hover:bg-carbon-deep active:scale-[0.98] disabled:opacity-40',
            touchMode ? 'min-h-14 text-[16px]' : 'min-h-12 text-[14px]',
          )}
        >
          <Check className={touchMode ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={2.5} />
          <span>Применить</span>
        </button>
      </div>
    </div>
  );
}
