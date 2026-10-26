import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Hash,
  Percent,
  Coins,
  Delete,
  RotateCcw,
  Plus,
  Minus,
  Check,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import { useCartStore, type CartWithItems, type CartItem } from '../stores/cartStore';
import { formatPrice, formatQty, cn } from '../lib/utils';
import { useTranslation } from '../i18n/i18nContext';
import { useToast } from './ui/toast-host';

type NumpadMode = 'qty' | 'discount_pct' | 'discount_val' | 'tender';

interface NumpadPanelProps {
  cart: CartWithItems | null;
  onRequestPayment?: (method: 'cash' | 'card') => void;
}

export function NumpadPanel({ cart, onRequestPayment }: NumpadPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    selectedItemId,
    setSelectedItemId,
    updateItemQty,
    applyItemDiscount,
  } = useCartStore();

  const [mode, setMode] = useState<NumpadMode>('qty');
  const [buffer, setBuffer] = useState<string>('');

  const items = cart?.items ?? [];
  const selectedItem: CartItem | null = useMemo(() => {
    if (!items.length) return null;
    return items.find((i) => i.id === selectedItemId) ?? items[items.length - 1] ?? null;
  }, [items, selectedItemId]);

  // Keep selectedItemId valid
  useEffect(() => {
    if (selectedItem && selectedItem.id !== selectedItemId) {
      setSelectedItemId(selectedItem.id);
    }
  }, [selectedItem, selectedItemId, setSelectedItemId]);

  // Reset buffer when mode or selected item changes
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

  const handleApply = useCallback(async () => {
    if (!cart || !items.length) return;
    const num = parseFloat(buffer);

    if (mode === 'qty') {
      if (!selectedItem) {
        toast({ title: 'Выберите товар в чеке' });
        return;
      }
      if (isNaN(num) || num <= 0) {
        toast({ title: 'Введите количество больше нуля' });
        return;
      }
      await updateItemQty(selectedItem.id, num);
      toast({
        title: 'Количество обновлено',
        description: `${selectedItem.name} → ${formatQty(num)}`,
        variant: 'default',
      });
      setBuffer('');
    } else if (mode === 'discount_pct') {
      if (!selectedItem) {
        toast({ title: 'Выберите товар в чеке' });
        return;
      }
      if (isNaN(num) || num < 0 || num > 100) {
        toast({ title: 'Скидка должна быть от 0 до 100%' });
        return;
      }
      await applyItemDiscount(selectedItem.id, num > 0 ? 'percentage' : null, num);
      toast({
        title: num > 0 ? `Скидка ${num}% применена` : 'Скидка сброшена',
        description: selectedItem.name,
      });
      setBuffer('');
    } else if (mode === 'discount_val') {
      if (!selectedItem) {
        toast({ title: 'Выберите товар в чеке' });
        return;
      }
      if (isNaN(num) || num < 0) {
        toast({ title: 'Введите сумму скидки' });
        return;
      }
      await applyItemDiscount(selectedItem.id, num > 0 ? 'fixed' : null, num);
      toast({
        title: num > 0 ? `Скидка ${formatPrice(num)} применена` : 'Скидка сброшена',
        description: selectedItem.name,
      });
      setBuffer('');
    } else if (mode === 'tender') {
      if (isNaN(num) || num < (cart.total || 0)) {
        toast({ title: 'Внесённая сумма меньше суммы чека' });
        return;
      }
      onRequestPayment?.('cash');
    }
  }, [buffer, mode, selectedItem, cart, items.length, updateItemQty, applyItemDiscount, toast, onRequestPayment]);

  // Global numpad key listener when on the numpad panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or modal dialog
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.getAttribute('role') === 'dialog'
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
        void handleApply();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleApply]);

  const total = cart?.total ?? 0;

  const tenderChange = useMemo(() => {
    if (mode !== 'tender') return 0;
    const val = parseFloat(buffer);
    if (isNaN(val) || val <= total) return 0;
    return val - total;
  }, [mode, buffer, total]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper select-none">
      {/* Ticket / Item Summary Header */}
      <div className="border-b border-rule bg-counter/50 p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-soft">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Текущий чек · {items.length} {items.length === 1 ? 'позиция' : 'позиций'}</span>
          </div>
          <span className="num text-[17px] font-bold text-ink">
            {formatPrice(total)}
          </span>
        </div>

        {/* Selected item card */}
        {selectedItem ? (
          <div className="rounded-xl border border-carbon/25 bg-carbon-tint/40 p-2.5 dark:bg-carbon-tint/20">
            <div className="flex items-start justify-between gap-2">
              <span className="line-clamp-1 text-[13px] font-semibold text-ink">
                {selectedItem.name}
              </span>
              <span className="num shrink-0 text-[12px] font-semibold text-carbon">
                {formatPrice(selectedItem.final_price)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-ink-soft">
              <span className="num">
                {formatQty(selectedItem.qty)} {selectedItem.is_weighted ? 'кг' : 'шт'} × {formatPrice(selectedItem.price)}
              </span>
              {selectedItem.discount_type && (
                <span className="text-warning font-medium">
                  {selectedItem.discount_type === 'percentage'
                    ? `−${selectedItem.discount_value}%`
                    : `−${formatPrice(selectedItem.discount_value || 0)}`}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-rule-strong/60 p-2.5 text-center text-[12px] text-ink-faint">
            Выберите позицию в чеке для изменения
          </div>
        )}
      </div>

      {/* Target Mode Switcher */}
      <div className="grid grid-cols-4 gap-1 border-b border-rule bg-counter-deep p-1.5">
        <button
          type="button"
          onClick={() => setMode('qty')}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-medium transition-all',
            mode === 'qty'
              ? 'bg-paper text-carbon shadow-sm'
              : 'text-ink-soft hover:bg-paper/50 hover:text-ink',
          )}
        >
          <Hash className="h-3.5 w-3.5 mb-0.5" />
          <span>Кол-во</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('discount_pct')}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-medium transition-all',
            mode === 'discount_pct'
              ? 'bg-paper text-carbon shadow-sm'
              : 'text-ink-soft hover:bg-paper/50 hover:text-ink',
          )}
        >
          <Percent className="h-3.5 w-3.5 mb-0.5" />
          <span>Скидка %</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('discount_val')}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-medium transition-all',
            mode === 'discount_val'
              ? 'bg-paper text-carbon shadow-sm'
              : 'text-ink-soft hover:bg-paper/50 hover:text-ink',
          )}
        >
          <Coins className="h-3.5 w-3.5 mb-0.5" />
          <span>Скидка сум</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('tender')}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-medium transition-all',
            mode === 'tender'
              ? 'bg-paper text-carbon shadow-sm'
              : 'text-ink-soft hover:bg-paper/50 hover:text-ink',
          )}
        >
          <ArrowRight className="h-3.5 w-3.5 mb-0.5" />
          <span>Сдача</span>
        </button>
      </div>

      {/* Active Buffer Screen */}
      <div className="border-b border-rule bg-paper p-3.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-ink-soft">
          <span>
            {mode === 'qty' && 'Новое количество:'}
            {mode === 'discount_pct' && 'Процент скидки:'}
            {mode === 'discount_val' && 'Сумма скидки (сум):'}
            {mode === 'tender' && 'Получено от клиента:'}
          </span>
          {mode === 'tender' && tenderChange > 0 && (
            <span className="text-success font-semibold">Сдача: {formatPrice(tenderChange)}</span>
          )}
        </div>
        <div className="mt-1 flex items-baseline justify-between rounded-xl border border-rule-strong/50 bg-counter/40 px-3 py-2">
          <span className="num text-[24px] font-bold tracking-tight text-ink">
            {buffer || '0'}
            {mode === 'discount_pct' && '%'}
            {mode === 'qty' && selectedItem?.is_weighted && ' кг'}
            {mode === 'qty' && !selectedItem?.is_weighted && ' шт'}
          </span>
          {buffer && (
            <button
              type="button"
              onClick={() => handleKeyPress('clear')}
              className="text-[11px] font-medium text-ink-faint hover:text-danger"
            >
              Сброс
            </button>
          )}
        </div>
      </div>

  {mode === 'tender' && (
        <div className="flex items-center justify-between gap-1 border-b border-rule px-3 py-2 bg-counter/30">
          {[10000, 50000, 100000, 200000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setBuffer(String(amt))}
              className="num flex-1 rounded-lg border border-rule-strong/60 bg-paper py-1.5 text-[11px] font-semibold text-ink hover:bg-counter active:scale-95 transition-all"
            >
              {amt >= 1000 ? `${amt / 1000}k` : amt}
            </button>
          ))}
        </div>
      )}

      {/* Main Touch Numberpad Grid */}
      <div className="grid flex-1 grid-cols-3 gap-1 p-2 bg-counter">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '00'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKeyPress(key)}
            className="num flex items-center justify-center rounded-xl border border-black/5 bg-paper text-[20px] font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-counter active:scale-[0.98] transition-all dark:border-white/5"
          >
            {key}
          </button>
        ))}
      </div>

      {/* Action Footer: Backspace + Apply Button */}
      <div className="grid grid-cols-[84px_1fr] gap-2 border-t border-rule bg-paper p-2.5">
        <button
          type="button"
          onClick={() => handleKeyPress('del')}
          aria-label="Удалить"
          className="flex h-12 items-center justify-center rounded-xl border border-rule-strong/70 bg-counter text-ink-soft hover:bg-counter-deep hover:text-ink active:scale-95 transition-all"
        >
          <Delete className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={() => void handleApply()}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-carbon text-[14px] font-semibold text-white shadow-md hover:bg-carbon-deep active:scale-[0.98] transition-all"
        >
          <Check className="h-4 w-4" strokeWidth={2.5} />
          <span>Применить (↵)</span>
        </button>
      </div>
    </div>
  );
}
