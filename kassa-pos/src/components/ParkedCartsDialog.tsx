import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation, errorMessage } from '../i18n/i18nContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { toast } from '../stores/toastStore';
import { formatDateTime } from '../lib/utils';

interface ParkedCart { id: number; name: string | null; updated_at: string }

export function ParkedCartsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const resumeCart = useCartStore((s) => s.resumeCart);
  const [carts, setCarts] = useState<ParkedCart[] | null>(null);

  useEffect(() => {
    invoke<ParkedCart[]>('get_parked_carts', { token: useAuthStore.getState().token })
      .then(setCarts)
      .catch((e) => { setCarts([]); toast(errorMessage(e), 'error'); });
  }, []);

  const resume = async (id: number) => {
    try {
      await resumeCart(id);
      const idx = useCartStore.getState().carts.findIndex((c) => c.id === id);
      if (idx >= 0) useCartStore.getState().setActiveTab(idx);
      onClose();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('cart.parked_list')}</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-auto border border-border rounded-md mt-2">
          {carts?.length === 0 && <div className="p-3 text-sm text-ink-muted">{t('cart.no_parked')}</div>}
          {carts?.map((c) => (
            <button key={c.id} className="w-full min-h-12 px-3 text-left flex justify-between items-center border-b border-border last:border-0 hover:bg-surface-raised" onClick={() => resume(c.id)}>
              <span>{c.name || t('cart.numbered').replace('{n}', String(c.id))}</span>
              <span className="text-sm text-ink-muted">{formatDateTime(c.updated_at)}</span>
            </button>
          ))}
        </div>
        <Button variant="outline" className="h-12" onClick={onClose}>{t('general.close')}</Button>
      </DialogContent>
    </Dialog>
  );
}
