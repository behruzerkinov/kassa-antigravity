import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useTranslation } from '../i18n/i18nContext';
import { useAuthStore } from '../stores/authStore';
import { useSmenaStore } from '../stores/smenaStore';
import { useSyncStore } from '../stores/syncStore';
import { errorMessage } from '../lib/desktop';
import type { Expense, XReport } from '../lib/types';
import { formatDateTime, formatPrice, formatTime } from '../lib/utils';
import { Button } from './ui/Button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { ExpenseForm } from './ExpenseForm';
import { useToast } from './ui/toast-host';

interface SmenaControlsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SmenaControls({ open, onOpenChange }: SmenaControlsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { openSmena } = useAuthStore();
  const { openSmena: apiOpenSmena, closeSmena, getXReport, getExpenses } = useSmenaStore();
  const { pendingCount, retry, refresh: refreshSync } = useSyncStore();

  const [report, setReport] = useState<XReport | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [forceCloseConfirm, setForceCloseConfirm] = useState(false);

  const loadShift = useCallback(async () => {
    if (!openSmena) {
      setReport(null);
      setExpenses([]);
      return;
    }
    setLoading(true);
    try {
      const [nextReport, nextExpenses] = await Promise.all([
        getXReport(openSmena.id),
        getExpenses(openSmena.id),
      ]);
      setReport(nextReport);
      setExpenses(nextExpenses);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [openSmena, getXReport, getExpenses]);

  useEffect(() => {
    if (open) {
      void loadShift();
      void refreshSync();
    }
  }, [open, loadShift, refreshSync]);

  const handleOpen = async () => {
    setBusy(true);
    setError('');
    try {
      await apiOpenSmena();
      toast({ title: t('shift.opened'), variant: 'success' });
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!openSmena) return;
    setBusy(true);
    setError('');
    try {
      await closeSmena(openSmena.id);
      toast({ title: t('shift.closed_success') });
      setCloseConfirm(false);
      setReport(null);
      setExpenses([]);
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
      setCloseConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  const handleForceClose = async () => {
    if (!openSmena) return;
    setBusy(true);
    setError('');
    try {
      await closeSmena(openSmena.id, true);
      toast({ title: t('shift.closed_success') });
      setForceCloseConfirm(false);
      setReport(null);
      setExpenses([]);
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
      setForceCloseConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  const cashInDrawer = report
    ? report.total_cash - report.total_returns - report.total_expenses
    : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('shift.title')}</DialogTitle>
            <DialogDescription>
              {openSmena
                ? t('shift.opened_at', { time: formatDateTime(openSmena.opened_at) })
                : t('shift.open_first')}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="max-h-[65vh] overflow-auto">
            {!openSmena ? (
              <div className="py-4 text-center">
                <p className="text-[17px] font-semibold tracking-tight text-ink">
                  {t('shift.closed')}
                </p>
                <p className="mx-auto mt-1.5 max-w-[38ch] text-[12px] leading-relaxed text-ink-soft">
                  {t('shift.open_description')}
                </p>
                <Button size="lg" className="mt-5 w-full" onClick={() => void handleOpen()} disabled={busy}>
                  {busy ? t('general.loading') : t('shift.open')}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-ink">{t('xreport.title')}</h3>
                    <button
                      type="button"
                      onClick={() => void loadShift()}
                      aria-label={t('xreport.refresh')}
                      className="flex h-8 w-8 items-center justify-center text-ink-soft hover:bg-counter hover:text-ink"
                    >
                      <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>

                  {loading && !report ? (
                    <p className="mt-3 text-[12px] text-ink-faint">{t('general.loading')}</p>
                  ) : report ? (
                    <dl className="mt-2 divide-y divide-rule border-y border-rule text-[12px]">
                      <Row label={t('xreport.sales')} value={String(report.transaction_count)} />
                      <Row label={t('xreport.cash')} value={formatPrice(report.total_cash)} />
                      <Row label={t('xreport.card')} value={formatPrice(report.total_card)} />
                      <Row label={t('xreport.debt')} value={formatPrice(report.total_debt)} />
                      <Row label={t('xreport.returns')} value={`−${formatPrice(report.total_returns)}`} />
                      <Row label={t('xreport.expenses')} value={`−${formatPrice(report.total_expenses)}`} />
                      <div className="flex items-baseline justify-between py-2.5">
                        <dt className="font-medium text-ink">{t('xreport.net')}</dt>
                        <dd className="num text-[18px] font-semibold tracking-tight text-ink">
                          {formatPrice(cashInDrawer)}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </section>

                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-ink">{t('expenses.title')}</h3>
                    <Button size="sm" variant="outline" onClick={() => setExpenseOpen(true)}>
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      {t('expenses.add')}
                    </Button>
                  </div>

                  {expenses.length === 0 ? (
                    <p className="mt-2 text-[12px] text-ink-faint">{t('expenses.empty')}</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-rule border-y border-rule">
                      {expenses.map((expense) => (
                        <li key={expense.id} className="flex items-center justify-between gap-3 py-2">
                          <div className="min-w-0">
                            <p className="text-[12px] text-ink">
                              {t('expenses.entry')} #{expense.id}
                              {expense.note ? ` · ${expense.note}` : ''}
                            </p>
                            <p className="num text-[10px] text-ink-faint">
                              {formatTime(expense.created_at)}
                            </p>
                          </div>
                          <span className="num text-[13px] text-ink">
                            {formatPrice(expense.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {pendingCount > 0 && (
                  <div className="border border-warning/30 bg-warning-tint px-3 py-2.5">
                    <p className="text-[12px] leading-relaxed text-warning">
                      {t('shift.close_blocked', { count: pendingCount })}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void retry().then(() => refreshSync())}
                        className="text-[12px] font-medium text-warning underline underline-offset-2"
                      >
                        {t('status.retry')}
                      </button>
                      <span className="text-[11px] text-ink-faint">·</span>
                      <button
                        type="button"
                        onClick={() => setForceCloseConfirm(true)}
                        className="text-[12px] font-medium text-danger hover:underline"
                      >
                        {t('shift.force_close')}
                      </button>
                    </div>
                  </div>
                )}

                {error && <p className="text-[12px] text-danger">{error}</p>}
              </div>
            )}

            {!openSmena && error && <p className="mt-3 text-[12px] text-danger">{error}</p>}
          </DialogBody>

          <DialogFooter>
            {openSmena ? (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t('general.close')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setCloseConfirm(true)}
                  disabled={busy || pendingCount > 0}
                >
                  {t('shift.close')}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('general.cancel')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={closeConfirm}
        title={t('shift.close_title')}
        description={t('shift.close_description')}
        confirmLabel={t('shift.close_confirm')}
        cancelLabel={t('general.cancel')}
        destructive
        onConfirm={() => void handleClose()}
        onClose={() => setCloseConfirm(false)}
      />

      <ConfirmDialog
        open={forceCloseConfirm}
        title={t('shift.force_close_title')}
        description={t('shift.force_close_description', { count: pendingCount })}
        confirmLabel={t('shift.force_close_confirm')}
        cancelLabel={t('general.cancel')}
        destructive
        onConfirm={() => void handleForceClose()}
        onClose={() => setForceCloseConfirm(false)}
      />

      {expenseOpen && (
        <ExpenseForm
          onClose={() => setExpenseOpen(false)}
          onCreated={() => void loadShift()}
        />
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-2">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="num text-ink">{value}</dd>
    </div>
  );
}
