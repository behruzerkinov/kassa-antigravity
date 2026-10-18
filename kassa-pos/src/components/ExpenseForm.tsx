import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation, errorMessage } from '../i18n/i18nContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import { cn } from '../lib/utils';

interface ExpenseType { id: number; name: string }

export function ExpenseForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [type, setType] = useState<ExpenseType | null>(null);
  const [typesOpen, setTypesOpen] = useState(false);

  useEffect(() => {
    invoke<ExpenseType[]>('get_expense_types').then(setTypes).catch(() => setTypes([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) { toast(t('expenses.select_type'), 'error'); return; }
    try {
      await invoke('create_expense', {
        token: useAuthStore.getState().token,
        expenseTypeId: type.id,
        amount: parseFloat(amount) || 0,
        note: note.trim() || null,
      });
      toast(t('expenses.saved'), 'success');
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('expenses.add')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">{t('expenses.type')}</span>
            <Button type="button" variant="outline" className="h-12 justify-between" onClick={() => setTypesOpen(true)}>
              <span>{type?.name ?? t('expenses.select_type')}</span>
              <span className="text-ink-muted">›</span>
            </Button>
          </div>
          <Input
            label={t('expenses.amount')}
            type="number"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label={t('expenses.note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <Button type="submit" className="w-full h-12 mt-4">
            {t('general.confirm')}
          </Button>
        </form>
      </DialogContent>

      {typesOpen && (
        <Dialog open onOpenChange={(open) => !open && setTypesOpen(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('expenses.type')}</DialogTitle>
            </DialogHeader>
            <div className="max-h-72 overflow-auto border border-border rounded-md mt-2">
              {types.map((et) => (
                <button
                  key={et.id}
                  className={cn('w-full text-left px-3 min-h-12 border-b border-border last:border-0 hover:bg-surface-raised', type?.id === et.id && 'bg-accent text-white')}
                  onClick={() => { setType(et); setTypesOpen(false); }}
                >
                  {et.name}
                </button>
              ))}
            </div>
            <Button variant="outline" className="h-12" onClick={() => setTypesOpen(false)}>{t('general.close')}</Button>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
