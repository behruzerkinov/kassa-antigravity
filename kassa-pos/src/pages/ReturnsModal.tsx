import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { useAuthStore } from '../stores/authStore';
import { invoke, errorMessage } from '../lib/desktop';
import type { CartItem, TransactionDetail, TransactionSummary } from '../lib/types';
import { formatPrice, formatQty, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/Dialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/toast-host';

interface ReturnsModalProps {
  summary: TransactionSummary;
  onClose: () => void;
  onDone: () => void;
}

export function ReturnsModal({ summary, onClose, onDone }: ReturnsModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    invoke<TransactionDetail>('get_receipt_detail', {
      token,
      transactionId: summary.id,
    })
      .then((data) => {
        setDetail(data);
        setSelected(new Set(data.items.map((item) => item.id)));
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token, summary.id]);

  const items: CartItem[] = detail?.items ?? [];
  const allSelected = items.length > 0 && selected.size === items.length;
  const amount = items
    .filter((item) => selected.has(item.id))
    .reduce((sum, item) => sum + item.final_price, 0);

  const toggle = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!token || !selected.size) return;
    setBusy(true);
    setError('');
    try {
      await invoke('process_return', {
        token,
        transactionId: summary.id,
        itemIds: Array.from(selected),
        isFull: allSelected,
      });
      toast({
        title: t('returns.success'),
        description: t('returns.success_desc', {
          id: summary.id,
          amount: formatPrice(amount),
        }),
        variant: 'success',
      });
      setConfirmOpen(false);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('returns.title', { id: summary.id })}</DialogTitle>
            <DialogDescription>{t('returns.hint')}</DialogDescription>
          </DialogHeader>

          <DialogBody className="max-h-[55vh] overflow-auto">
            {loading ? (
              <p className="text-[13px] text-ink-soft">{t('general.loading')}</p>
            ) : items.length === 0 ? (
              <p className="text-[13px] text-ink-soft">{t('receipts.empty')}</p>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-ink-soft">
                    {t('returns.selected', { count: selected.size, total: items.length })}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)))
                    }
                    className="min-h-8 border border-rule-strong px-2.5 text-[11px] text-ink hover:border-ink hover:bg-counter"
                  >
                    {allSelected ? t('returns.clear') : t('returns.select_all')}
                  </button>
                </div>

                <ul className="border-y border-rule">
                  {items.map((item) => {
                    const checked = selected.has(item.id);
                    return (
                      <li key={item.id} className="border-b border-rule last:border-0">
                        <label
                          className={cn(
                            'flex cursor-pointer items-center gap-3 py-2.5',
                            checked ? 'text-ink' : 'text-ink-soft',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(item.id)}
                            className="h-4 w-4 accent-[var(--color-carbon)]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px]">{item.name}</span>
                            <span className="num block text-[10px] text-ink-faint">
                              {formatQty(item.qty)} × {formatPrice(item.price)}
                            </span>
                          </span>
                          <span className="num text-[13px]">{formatPrice(item.final_price)}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}
          </DialogBody>

          <DialogFooter>
            <div className="mr-auto flex items-baseline gap-2">
              <span className="text-[11px] text-ink-soft">{t('returns.total')}</span>
              <span className="num text-[20px] font-semibold tracking-tight text-ink">
                {formatPrice(amount)}
              </span>
            </div>
            <Button variant="outline" onClick={onClose}>
              {t('general.cancel')}
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={!selected.size || busy}>
              {t('returns.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title={t('returns.confirm_title')}
        description={t('returns.confirm_description', { amount: formatPrice(amount) })}
        confirmLabel={t('returns.submit')}
        cancelLabel={t('general.cancel')}
        onConfirm={() => void submit()}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
