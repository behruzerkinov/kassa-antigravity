import React from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { useAuthStore } from '../stores/authStore';
import type { CartWithItems } from '../lib/types';
import { formatQty, formatTime, formatPrice } from '../lib/utils';
import { BarcodeMark } from './BarcodeMark';

export function ReceiptTape({ cart }: { cart: CartWithItems | null }) {
  const { t } = useTranslation();
  const { cashierName, openSmena } = useAuthStore();

  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = cart?.total ?? 0;
  const discount = subtotal - total;

  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex min-h-0 flex-1 flex-col border border-rule-strong bg-paper">
        <div className="shrink-0 border-b border-dashed border-rule px-4 pb-3 pt-4 text-center">
          <BarcodeMark className="mx-auto h-4 w-14 text-ink" />
          <p className="mt-2 text-[15px] font-semibold tracking-tight text-ink">
            {t('cart_note.shop')}
          </p>
          <p className="text-[11px] text-ink-soft">{t('shell.branch')}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[11px] text-ink-soft">
            <dt>{t('cart_note.cashier')}</dt>
            <dd className="truncate text-right text-ink">{cashierName ?? '—'}</dd>
            <dt>{t('cart_note.date')}</dt>
            <dd className="num text-right text-ink">
              {new Date().toLocaleDateString('ru-RU')} · {formatTime(new Date().toISOString())}
            </dd>
            <dt>{t('cart_note.receipt')}</dt>
            <dd className="num text-right text-ink">
              {cart ? `#${cart.cart.id}` : '—'}
              {openSmena ? ` · ${formatTime(openSmena.opened_at)}` : ''}
            </dd>
          </dl>

          <div className="my-3 border-t border-dashed border-rule" />

          {items.length === 0 ? (
            <p className="py-8 text-center text-[12px] leading-relaxed text-ink-faint">
              {t('cart_note.empty')}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {items.map((item, index) => (
                <li key={item.id} className="animate-print text-[12px]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 flex-1 break-words text-ink">{item.name}</span>
                    <span className="num shrink-0 text-ink">{formatPrice(item.final_price)}</span>
                  </div>
                  <div className="num mt-0.5 flex justify-between text-[11px] text-ink-faint">
                    <span>
                      {formatQty(item.qty)} {item.is_weighted ? 'кг' : '×'} {formatPrice(item.price)}
                    </span>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 && (
            <>
              <div className="my-3 border-t border-dashed border-rule" />
              <dl className="space-y-1 text-[12px]">
                <div className="flex justify-between text-ink-soft">
                  <dt>{t('payment.subtotal')}</dt>
                  <dd className="num">{formatPrice(subtotal)}</dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <dt>{t('payment.discount')}</dt>
                    <dd className="num">−{formatPrice(discount)}</dd>
                  </div>
                )}
              </dl>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-ink px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-medium text-ink-soft">
              {t('cart_note.total')}
            </span>
            <span className="num text-[26px] font-semibold leading-none tracking-tighter text-ink">
              {formatPrice(total)}
            </span>
          </div>
          <p className="mt-1 text-right text-[10px] text-ink-faint">
            {t('sell.items', { count: items.length })} · UZS
          </p>
        </div>
      </div>

      <div className="receipt-tear shrink-0" aria-hidden="true" />

      <div className="flex shrink-0 items-center justify-between px-1 pt-3 text-[10px] text-ink-faint">
        <span>{t('cart_note.thanks')}</span>
        <span className="num">F1 · F2</span>
      </div>
    </div>
  );
}
