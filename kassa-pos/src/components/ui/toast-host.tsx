import * as React from 'react';
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './Toast';

type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
  variant: ToastVariant;
}

const ToastContext = React.createContext<{ toast: (input: ToastInput) => void } | null>(null);

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback((input: ToastInput) => {
    counter.current += 1;
    const id = counter.current;
    setItems((current) => [
      ...current.slice(-2),
      { ...input, id, variant: input.variant ?? 'default' },
    ]);
  }, []);

  const value = React.useMemo(() => ({ toast }), [toast]);

  // TEMP diagnostic: allows a manual toast trigger from the console.
  React.useEffect(() => {
    (window as unknown as Record<string, unknown>).__kassaToast = toast;
  }, [toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastProvider swipeDirection="right" duration={4800}>
        {children}
        {/* Toasts must live inside the viewport: it is what positions them. */}
        <ToastViewport>
          {items.map((item) => (
            <Toast
              key={item.id}
              open
              onOpenChange={(open) => {
                if (!open) dismiss(item.id);
              }}
              variant={item.variant}
              duration={item.duration ?? 4800}
            >
              <div className="min-w-0">
                <ToastTitle>{item.title}</ToastTitle>
                {item.description && <ToastDescription>{item.description}</ToastDescription>}
              </div>
            </Toast>
          ))}
        </ToastViewport>
      </ToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastHost');
  return context;
}

export type { ToastVariant };
