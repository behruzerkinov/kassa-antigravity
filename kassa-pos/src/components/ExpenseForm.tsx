import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { useSmenaStore } from '../stores/smenaStore';
import { useSettingsStore } from '../stores/settingsStore';
import { invoke, errorMessage } from '../lib/desktop';
import type { ExpenseType } from '../lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { useToast } from './ui/toast-host';

export function ExpenseForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getExpenseTypes, addExpense } = useSmenaStore();
  const { printerName } = useSettingsStore();

  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [typeId, setTypeId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getExpenseTypes()
      .then((list) => {
        setTypes(list);
        if (list[0]) setTypeId(String(list[0].id));
      })
      .catch(() => setTypes([]));
  }, [getExpenseTypes]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!typeId || !(value > 0)) return;
    setBusy(true);
    setError('');
    try {
      await addExpense(Number(typeId), value, note.trim() || null);
      try {
        await invoke('open_cash_drawer', { printerName });
      } catch {
        // Drawer is optional hardware.
      }
      toast({ title: t('expenses.success'), description: `${value.toLocaleString('ru-RU')} UZS`, variant: 'success' });
      onCreated();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('expenses.add')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit}>
          <DialogBody className="space-y-4">
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                {t('expenses.type')}
              </span>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('expenses.type')} />
                </SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              label={t('expenses.amount')}
              numeric
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
              placeholder="0"
              autoFocus
            />

            <Input
              label={t('expenses.note')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('expenses.note_placeholder')}
            />

            {error && <p className="text-[12px] text-danger">{error}</p>}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('general.cancel')}
            </Button>
            <Button type="submit" disabled={busy || !typeId || !amount}>
              {t('expenses.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
