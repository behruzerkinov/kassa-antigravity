import { Toast, ToastTitle, ToastDescription } from './ui/Toast';
import { useToastStore } from '../stores/toastStore';

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant === 'error' ? 'destructive' : t.variant === 'success' ? 'success' : 'default'}
          duration={5000}
          onOpenChange={(open) => !open && dismiss(t.id)}
        >
          <div className="grid gap-1">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
        </Toast>
      ))}
    </>
  );
}
