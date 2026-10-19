import React, { useState } from 'react';
import { LogOut, Printer, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useTranslation } from '../i18n/i18nContext';
import { invoke } from '../lib/desktop';
import { useToast } from './ui/toast-host';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from './ui/Dialog';
import { Button } from './ui/Button';

interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutConfirmDialog({ open, onOpenChange }: LogoutConfirmDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { logout, cashierName, openSmena } = useAuthStore();
  const { printerName, printerWidth } = useSettingsStore();
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      if (openSmena && printerName) {
        try {
          await invoke('print_x_report', {
            smenaId: openSmena.id,
            printerName,
            width: printerWidth,
          });
          toast({
            title: 'X-отчёт отправлен на печать',
            description: `Принтер: ${printerName} · Смена #${openSmena.id}`,
            variant: 'default',
          });
        } catch (printErr) {
          console.warn('Не удалось напечатать X-отчёт при выходе:', printErr);
          toast({
            title: 'Ошибка печати X-отчёта',
            description: String(printErr),
            variant: 'destructive',
          });
        }
      }

      await logout();
      onOpenChange(false);
    } catch (err) {
      console.error('Ошибка выхода:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border border-black/10 bg-paper p-6 shadow-2xl dark:border-white/10">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-tint text-danger">
              <LogOut className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <DialogTitle className="text-[17px] font-semibold text-ink font-apple-display">
                Выход из аккаунта
              </DialogTitle>
              <DialogDescription className="text-[12px] text-ink-soft">
                Кассир: {cashierName || 'Текущая сессия'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4 py-3 text-[13px] text-ink">
          <p className="leading-relaxed">
            Вы уверены, что хотите выйти из кассы?
          </p>

          {openSmena ? (
            <div className="rounded-xl border border-rule-strong/40 bg-counter/70 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-[12px] font-medium text-ink">
                <Printer className="h-4 w-4 text-carbon" strokeWidth={2} />
                <span>Печать X-отчёта при выходе</span>
              </div>
              <p className="text-[12px] text-ink-soft leading-normal">
                Поскольку текущая смена активна, на выбранный принтер{' '}
                <strong className="text-ink">{printerName || 'Принтер по умолчанию'}</strong> будет отправлен X-отчёт.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[12px] text-ink-faint">
              <AlertTriangle className="h-4 w-4 text-warning" strokeWidth={1.75} />
              <span>Смена не открыта, печать X-отчёта не требуется.</span>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="mt-2 flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant="danger"
            className="rounded-lg gap-2"
            onClick={() => void handleConfirm()}
            disabled={busy}
          >
            {openSmena && printerName ? (
              <>
                <Printer className="h-4 w-4" strokeWidth={2} />
                Выйти и распечатать X-отчёт
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" strokeWidth={2} />
                Выйти из аккаунта
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
