import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/i18nContext';
import type { CartItem } from '../lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { cn } from '../lib/utils';

export interface DiscountTarget {
  kind: 'cart' | 'item';
  item?: CartItem;
  name: string;
  currentType: string | null;
  currentValue: number | null;
  hasDiscount: boolean;
}

interface DiscountDialogProps {
  target: DiscountTarget | null;
  onClose: () => void;
  onSubmit: (type: 'percentage' | 'fixed' | null, value: number) => Promise<void>;
}

const PERCENT_PRESETS = [5, 10, 15, 20];
const FIXED_PRESETS = [1000, 5000, 10000, 20000];

export function DiscountDialog({ target, onClose, onSubmit }: DiscountDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    setMode(target.currentType === 'fixed' ? 'fixed' : 'percentage');
    setValue(target.currentValue != null ? String(target.currentValue) : '');
    setBusy(false);
  }, [target]);

  const amount = Number(value.replace(',', '.')) || 0;
  const valid =
    mode === 'percentage' ? amount > 0 && amount <= 100 : amount > 0;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await onSubmit(mode, amount);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await onSubmit(null, 0);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('discount.title')}</DialogTitle>
          <p className="mt-1 truncate text-[13px] text-ink-soft">{target?.name}</p>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-ink-soft">
              {t('discount.mode')}
            </span>
            <div className="grid grid-cols-2 gap-px border border-rule-strong bg-rule">
              {(['percentage', 'fixed'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={cn(
                    'min-h-10 px-3 text-[13px] font-medium transition-colors',
                    mode === option ? 'bg-ink text-paper' : 'bg-paper text-ink-soft hover:bg-counter',
                  )}
                >
                  {option === 'percentage' ? t('discount.mode_percent') : t('discount.mode_fixed')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Input
              label={t('discount.value')}
              numeric
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="0"
              autoFocus
              className="h-14 text-[24px]"
              hint={mode === 'percentage' ? t('discount.hint_percent') : t('discount.hint_fixed')}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {(mode === 'percentage' ? PERCENT_PRESETS : FIXED_PRESETS).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setValue(String(preset))}
                  className="num min-h-9 border border-rule-strong bg-paper px-3 text-[12px] text-ink transition-colors hover:border-ink hover:bg-counter"
                >
                  {mode === 'percentage' ? `${preset}%` : preset.toLocaleString('ru-RU')}
                </button>
              ))}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          {target?.hasDiscount && (
            <Button variant="dangerGhost" onClick={() => void remove()} disabled={busy}>
              {t('discount.remove')}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            {t('general.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={!valid || busy}>
            {t('discount.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
