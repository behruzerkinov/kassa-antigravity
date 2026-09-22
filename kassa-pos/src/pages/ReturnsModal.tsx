import React from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';

export function ReturnsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('returns.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col mt-4 items-center justify-center text-ink-muted">
          <div>Return functionality implementation pending...</div>
          <Button variant="outline" className="mt-4" onClick={onClose}>{t('general.close')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
