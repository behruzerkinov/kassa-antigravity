import React, { useState } from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export function ExpenseForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // submit expense logic
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('expenses.add')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
    </Dialog>
  );
}
