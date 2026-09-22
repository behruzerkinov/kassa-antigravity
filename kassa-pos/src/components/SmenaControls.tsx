import React, { useState } from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { useAuthStore } from '../stores/authStore';
import { useSmenaStore } from '../stores/smenaStore';
import { Button } from './ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { formatDateTime } from '../lib/utils';
import { ExpenseForm } from './ExpenseForm';

export function SmenaControls() {
  const { t } = useTranslation();
  const { openSmena } = useAuthStore();
  const { openSmena: apiOpenSmena, closeSmena } = useSmenaStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);

  const handleOpenSmena = async () => {
    try {
      await apiOpenSmena();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseSmena = async () => {
    try {
      await closeSmena();
    } catch (err) {
      console.error(err);
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
                    <div className="text-sm text-ink-muted mb-1">Время открытия:</div>
                    <div className="font-medium text-lg">{formatDateTime(openSmena.opened_at)}</div>
                  </div>
                  
                  <Button variant="outline" className="w-full h-12">
                    {t('smena.x_report')}
                  </Button>
                  
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
