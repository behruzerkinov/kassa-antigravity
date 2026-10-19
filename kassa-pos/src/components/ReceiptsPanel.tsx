import React, { useCallback, useEffect, useState } from 'react';
import { Printer, RotateCcw, Search } from 'lucide-react';
import { useTranslation } from '../i18n/i18nContext';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';
import { useSettingsStore } from '../stores/settingsStore';
import { invoke, errorMessage } from '../lib/desktop';
import type { TransactionDetail, TransactionSummary } from '../lib/types';
import { formatDay, formatPrice, formatTime, todayInputValue, cn } from '../lib/utils';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { ReturnsModal } from '../pages/ReturnsModal';
import { useToast } from './ui/toast-host';

type Range = 'today' | 'week' | 'all';

const statusVariant = (status: string) => {
  if (status === 'success') return 'success' as const;
  if (status === 'success_with_discount') return 'default' as const;
  if (status === 'debt_added') return 'warning' as const;
  if (status === 'partial_return' || status === 'full_return') return 'danger' as const;
  return 'neutral' as const;
};

export function ReceiptsPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);
  const { pendingCount, refresh: refreshSync } = useSyncStore();
  const { printerName } = useSettingsStore();

  const [range, setRange] = useState<Range>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [receipts, setReceipts] = useState<TransactionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [returnTarget, setReturnTarget] = useState<TransactionSummary | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await invoke<TransactionSummary[]>('get_receipts', {
        token,
        search: search.trim() || null,
        dateFrom: from ? `${from}T00:00:00` : null,
        dateTo: to ? `${to}T23:59:59` : null,
      });
      setReceipts(list);
    } catch (error) {
      toast({ title: t('general.error'), description: errorMessage(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [token, search, from, to, t, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (range === 'all') {
      setFrom('');
      setTo('');
    } else if (range === 'today') {
      setFrom(todayInputValue());
      setTo(todayInputValue());
    } else {
      setFrom(todayInputValue(-6));
      setTo(todayInputValue());
    }
  }, [range]);

  const openDetail = async (summary: TransactionSummary) => {
    if (!token) return;
    setDetailLoading(true);
    try {
      const data = await invoke<TransactionDetail>('get_receipt_detail', {
        token,
        transactionId: summary.id,
      });
      setDetail(data);
    } catch (error) {
      toast({ title: t('general.error'), description: errorMessage(error), variant: 'destructive' });
    } finally {
      setDetailLoading(false);
    }
  };

  const reprint = async (summary: TransactionSummary) => {
    if (!printerName) {
      toast({ title: t('receipts.print_unavailable'), description: t('settings.no_printer'), variant: 'warning' });
      return;
    }
    try {
      await invoke('print_receipt', {
        transactionId: summary.id,
        printerName,
        width: useSettingsStore.getState().printerWidth,
      });
      toast({ title: t('receipts.reprint_done'), description: `#${summary.id}`, variant: 'success' });
    } catch (error) {
      toast({ title: t('general.error'), description: errorMessage(error), variant: 'destructive' });
    }
  };

  const canReturn = (summary: TransactionSummary) =>
    summary.kind === 'sale' &&
    summary.status !== 'full_return' &&
    summary.status !== 'partial_return';

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <div className="shrink-0 space-y-2.5 border-b border-rule px-3 pb-3 pt-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
            strokeWidth={1.75}
          />
          <Input
            aria-label={t('receipts.search')}
            placeholder={t('receipts.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 pl-8 text-[12px]"
          />
        </div>

        <div className="flex items-center gap-1">
          {(['today', 'week', 'all'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={cn(
                'min-h-8 flex-1 border px-2 text-[11px] font-medium transition-colors',
                range === option
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule-strong bg-paper text-ink-soft hover:border-ink hover:text-ink',
              )}
            >
              {t(`receipts.${option}`)}
            </button>
          ))}
        </div>

        {range === 'all' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="mb-1 block text-[10px] text-ink-faint">{t('receipts.from')}</span>
              <Input
                aria-label={t('receipts.from')}
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="h-9 text-[11px]"
              />
            </div>
            <div>
              <span className="mb-1 block text-[10px] text-ink-faint">{t('receipts.to')}</span>
              <Input
                aria-label={t('receipts.to')}
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="h-9 text-[11px]"
              />
            </div>
          </div>
        )}

        {pendingCount > 0 && (
          <button
            type="button"
            onClick={() => void refreshSync()}
            className="flex w-full items-center gap-2 border border-warning/30 bg-warning-tint px-2.5 py-1.5 text-left text-[11px] text-warning"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
            {t('receipts.pending_sync')}: {pendingCount}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading && receipts.length === 0 ? (
          <p className="px-3 py-6 text-[12px] text-ink-faint">{t('general.loading')}</p>
        ) : receipts.length === 0 ? (
          <div className="px-4 py-7">
            <p className="text-[18px] font-semibold tracking-tight text-ink">{t('receipts.empty')}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">{t('receipts.empty_hint')}</p>
          </div>
        ) : (
          <ul>
            {receipts.map((receipt) => (
              <li key={receipt.id} className="border-b border-rule px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => void openDetail(receipt)}
                  className="block w-full text-left"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="num text-[11px] text-ink-soft">
                      #{receipt.id} · {formatDay(receipt.created_at)} {formatTime(receipt.created_at)}
                    </span>
                    <span
                      className={cn(
                        'num text-[15px] font-medium tracking-tight',
                        receipt.total < 0 ? 'text-danger' : 'text-ink',
                      )}
                    >
                      {receipt.total < 0 ? '−' : ''}
                      {formatPrice(Math.abs(receipt.total))}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-ink-soft">
                      {t(`receipts.kind_${receipt.kind}`) === `receipts.kind_${receipt.kind}`
                        ? t('receipts.unknown')
                        : t(`receipts.kind_${receipt.kind}`)}
                      {receipt.client_name ? ` · ${receipt.client_name}` : ''}
                    </span>
                    <Badge variant={statusVariant(receipt.status)}>
                      {t(`receipt_status.${receipt.status}`)}
                    </Badge>
                  </div>
                </button>

                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void reprint(receipt)}
                    className="flex items-center gap-1 text-[11px] text-ink-soft hover:text-ink"
                  >
                    <Printer className="h-3 w-3" strokeWidth={1.75} />
                    {t('receipts.reprint')}
                  </button>
                  {canReturn(receipt) && (
                    <button
                      type="button"
                      onClick={() => setReturnTarget(receipt)}
                      className="flex items-center gap-1 text-[11px] text-ink-soft hover:text-danger"
                    >
                      <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
                      {t('receipts.return')}
                    </button>
                  )}
                  <span
                    className={cn(
                      'num ml-auto flex items-center gap-1 text-[10px]',
                      receipt.sync_status === 'pending' ? 'text-warning' : 'text-ink-faint',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1 w-1 rounded-full',
                        receipt.sync_status === 'pending' ? 'bg-warning' : 'bg-success',
                      )}
                    />
                    {receipt.sync_status === 'pending'
                      ? t('receipts.pending_sync')
                      : t('receipts.synced')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={Boolean(detail) || detailLoading} onOpenChange={(next) => !next && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detail ? t('receipts.detail_title', { id: detail.transaction.id }) : t('general.loading')}
            </DialogTitle>
          </DialogHeader>

          {detail && (
            <DialogBody className="max-h-[60vh] overflow-auto">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(detail.transaction.status)}>
                  {t(`receipt_status.${detail.transaction.status}`)}
                </Badge>
                <span className="text-[12px] text-ink-soft">
                  {formatDay(detail.transaction.created_at)} · {formatTime(detail.transaction.created_at)}
                </span>
              </div>

              <table className="mt-4 w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-y border-rule text-left text-[11px] text-ink-soft">
                    <th className="py-1.5 font-medium">{t('sell.col_name')}</th>
                    <th className="py-1.5 text-right font-medium">{t('sell.col_qty')}</th>
                    <th className="py-1.5 text-right font-medium">{t('sell.col_sum')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item) => (
                    <tr key={item.id} className="border-b border-rule">
                      <td className="py-2 pr-3">
                        <span className="block text-ink">{item.name}</span>
                        <span className="num text-[10px] text-ink-faint">{item.barcode}</span>
                      </td>
                      <td className="num py-2 text-right text-ink-soft">{item.qty}</td>
                      <td className="num py-2 text-right text-ink">{formatPrice(item.final_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <dl className="mt-3 ml-auto max-w-xs space-y-1 text-[12px]">
                <div className="flex justify-between text-ink-soft">
                  <dt>{t('payment.cash')}</dt>
                  <dd className="num">{formatPrice(detail.transaction.cash_amount)}</dd>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <dt>{t('payment.card')}</dt>
                  <dd className="num">{formatPrice(detail.transaction.card_amount)}</dd>
                </div>
                {detail.transaction.debt_amount > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <dt>{t('payment.debt')}</dt>
                    <dd className="num">{formatPrice(detail.transaction.debt_amount)}</dd>
                  </div>
                )}
                {detail.transaction.discount_total > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <dt>{t('payment.discount')}</dt>
                    <dd className="num">−{formatPrice(detail.transaction.discount_total)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-rule pt-1.5 text-ink">
                  <dt className="font-medium">{t('payment.total')}</dt>
                  <dd className="num text-[16px] font-semibold">
                    {formatPrice(detail.transaction.total)}
                  </dd>
                </div>
                {detail.transaction.change_amount > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <dt>{t('payment.change')}</dt>
                    <dd className="num">{formatPrice(detail.transaction.change_amount)}</dd>
                  </div>
                )}
              </dl>
            </DialogBody>
          )}

          <DialogFooter>
            {detail && (
              <Button
                variant="outline"
                onClick={() =>
                  void reprint({
                    id: detail.transaction.id,
                    kind: detail.transaction.kind,
                    total: detail.transaction.total,
                    status: detail.transaction.status,
                    sync_status: detail.transaction.sync_status,
                    created_at: detail.transaction.created_at,
                    client_name: null,
                  })
                }
              >
                <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
                {t('receipts.reprint')}
              </Button>
            )}
            {detail && canReturn({
              id: detail.transaction.id,
              kind: detail.transaction.kind,
              total: detail.transaction.total,
              status: detail.transaction.status,
              sync_status: detail.transaction.sync_status,
              created_at: detail.transaction.created_at,
              client_name: null,
            }) && (
              <Button
                variant="dangerGhost"
                onClick={() =>
                  setReturnTarget({
                    id: detail.transaction.id,
                    kind: detail.transaction.kind,
                    total: detail.transaction.total,
                    status: detail.transaction.status,
                    sync_status: detail.transaction.sync_status,
                    created_at: detail.transaction.created_at,
                    client_name: null,
                  })
                }
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                {t('receipts.return')}
              </Button>
            )}
            <Button onClick={() => setDetail(null)}>{t('general.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {returnTarget && (
        <ReturnsModal
          summary={returnTarget}
          onClose={() => setReturnTarget(null)}
          onDone={() => {
            setReturnTarget(null);
            setDetail(null);
            void load();
            void refreshSync();
          }}
        />
      )}
    </div>
  );
}
