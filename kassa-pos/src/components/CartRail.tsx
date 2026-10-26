import React, { useState } from 'react';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { formatPrice, cn } from '../lib/utils';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { useToast } from './ui/toast-host';
import { errorMessage } from '../lib/desktop';

/**
 * Touch layout: cheques live in a left rail instead of a tab strip on top.
 * Cards are large enough to hit with a thumb, and closing a cheque is a single
 * deliberate action in the rail footer — never a tiny "x" inside the card.
 */
export function CartRail() {
  const { toast } = useToast();
  const { carts, activeCartIndex, setActiveTab, createCart, closeCart } = useCartStore();
  const [confirmTarget, setConfirmTarget] = useState<{ id: number; name: string } | null>(null);

  // Read the store at press time: a freshly created cheque refreshes asynchronously,
  // so a rendered snapshot could still point at the previous cheque.
  const activeAtPress = () => {
    const state = useCartStore.getState();
    return state.carts[state.activeCartIndex] ?? null;
  };

  const createdOrder = (id: number) =>
    [...carts].sort((a, b) => a.cart.created_at.localeCompare(b.cart.created_at)).findIndex((c) => c.cart.id === id) + 1;

  const requestClose = (cartId: number, itemsCount: number, name: string) => {
    if (itemsCount > 0) setConfirmTarget({ id: cartId, name });
    else
      void closeCart(cartId).catch((error) =>
        toast({ title: 'Ошибка', description: errorMessage(error), variant: 'destructive' }),
      );
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-rule bg-paper-deep">
      <div className="flex shrink-0 items-center justify-between border-b border-rule px-4 py-3">
        <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
          <Receipt className="h-4 w-4" strokeWidth={1.75} />
          Чеки
        </span>
        <span className="num rounded-full bg-counter-deep px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
          {carts.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-2">
          {carts.map((entry, index) => {
            const active = activeCartIndex === index;
            return (
              <button
                key={entry.cart.id}
                type="button"
                onClick={() => setActiveTab(index)}
                aria-current={active}
                className={cn(
                  'relative flex min-h-[82px] w-full flex-col justify-center gap-1 rounded-xl border-2 px-3.5 py-3 text-left transition-colors',
                  active
                    ? 'border-carbon bg-carbon text-white'
                    : 'border-rule bg-paper text-ink hover:border-rule-strong hover:bg-counter',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold">
                    {entry.cart.name || `Чек ${createdOrder(entry.cart.id)}`}
                  </span>
                  <span
                    className={cn(
                      'num shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
                      active ? 'bg-white/20 text-white' : 'bg-counter-deep text-ink-soft',
                    )}
                  >
                    {entry.items.length}
                  </span>
                </span>
                <span
                  className={cn(
                    'num text-[19px] font-semibold leading-none tracking-tight',
                    active ? 'text-white' : 'text-ink',
                  )}
                >
                  {formatPrice(entry.total)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-rule bg-paper p-2">
        <button
          type="button"
          onClick={() => void createCart()}
          disabled={carts.length >= 10}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-rule-strong bg-paper text-[15px] font-semibold text-ink transition-colors hover:border-ink hover:bg-counter disabled:opacity-40"
        >
          <Plus className="h-5 w-5" strokeWidth={2.2} />
          Новый чек
        </button>
        <button
          type="button"
          onClick={() => {
            const cart = activeAtPress();
            if (!cart) return;
            requestClose(
              cart.cart.id,
              cart.items.length,
              cart.cart.name || `Чек ${createdOrder(cart.cart.id)}`,
            );
          }}
          disabled={!carts.length}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-medium text-danger transition-colors hover:bg-danger-tint disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.9} />
          Закрыть чек
        </button>
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        title={`Закрыть ${confirmTarget?.name ?? 'чек'}?`}
        description="В чеке есть товары. При закрытии они будут удалены без оплаты."
        confirmLabel="Закрыть чек"
        cancelLabel="Отмена"
        destructive
        onConfirm={() => {
          if (!confirmTarget) return;
          const { id } = confirmTarget;
          setConfirmTarget(null);
          void closeCart(id).catch((error) =>
            toast({ title: 'Ошибка', description: errorMessage(error), variant: 'destructive' }),
          );
        }}
      />
    </div>
  );
}
