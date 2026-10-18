import React, { useState } from 'react';
import { useTranslation, errorMessage } from '../i18n/i18nContext';
import { toast } from '../stores/toastStore';
import { useAuthStore } from '../stores/authStore';
import { useSmenaStore } from '../stores/smenaStore';
import { Button } from './ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { formatDateTime, formatPrice } from '../lib/utils';

interface XReport {
  total_cash: number;
  total_card: number;
  total_returns: number;
  total_expenses: number;
  total_debt: number;
  transaction_count: number;
}
import { ExpenseForm } from './ExpenseForm';

export function SmenaControls() {
  const { t } = useTranslation();
  const { openSmena } = useAuthStore();
  const { openSmena: apiOpenSmena, closeSmena, getXReport } = useSmenaStore();
  const [xReport, setXReport] = useState<XReport | null>(null);

  const handleXReport = async () => {
    try {
      setXReport((await getXReport()) as XReport);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };
  const [isOpen, setIsOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);

  const handleOpenSmena = async () => {
    try {
      await apiOpenSmena();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const handleCloseSmena = async () => {
    try {
      await closeSmena();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        {openSmena ? t('smena.title') : t('smena.open')}
      </Button>

      {isOpen && (
        <Dialog open onOpenChange={(open) => !open && setIsOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('smena.title')}</DialogTitle>
            </DialogHeader>

            <div className="py-6 flex flex-col gap-4">
              {!openSmena ? (
                <Button size="lg" className="w-full h-16 text-xl" onClick={handleOpenSmena}>
                  {t('smena.open')}
                </Button>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <div className="text-sm text-ink-muted mb-1">{t('smena.opened_at')}:</div>
                    <div className="font-medium text-lg">{formatDateTime(openSmena.opened_at)}</div>
                  </div>
                  
                  <Button variant="outline" className="w-full h-12" onClick={handleXReport}>
                    {t('smena.x_report')}
                  </Button>
                  {xReport && (
                    <div className="rounded-md border border-border p-3 text-sm space-y-1" data-testid="x-report">
                      {([
                        ['x_report.sales_count', String(xReport.transaction_count)],
                        ['x_report.total_cash', formatPrice(xReport.total_cash)],
                        ['x_report.total_card', formatPrice(xReport.total_card)],
                        ['x_report.debt_sales', formatPrice(xReport.total_debt)],
                        ['x_report.returns', formatPrice(xReport.total_returns)],
                        ['x_report.expenses', formatPrice(xReport.total_expenses)],
                      ] as const).map(([key, value]) => (
                        <div key={key} className="flex justify-between"><span className="text-ink-muted">{t(key)}</span><span className="tabular-nums font-medium">{value}</span></div>
                      ))}
                    </div>
                  )}
                  
                  <Button variant="outline" className="w-full h-12" onClick={() => setIsExpenseOpen(true)}>
                    {t('expenses.title')}
                  </Button>
                  
                  <Button variant="destructive" className="w-full h-12 mt-4" onClick={handleCloseSmena}>
                    {t('smena.close')}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isExpenseOpen && (
        <ExpenseForm onClose={() => setIsExpenseOpen(false)} />
      )}
    </>
  );
}
