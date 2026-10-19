import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  BookUser,
  CreditCard,
  Delete,
  HandCoins,
  Layers,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useTranslation } from '../i18n/i18nContext';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';
import { useSettingsStore } from '../stores/settingsStore';
import { invoke, errorMessage } from '../lib/desktop';
import type { CartWithItems, Client, Transaction } from '../lib/types';
import { formatPrice, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../components/ui/Dialog';
import { useToast } from '../components/ui/toast-host';

export type PaymentMethod = 'cash' | 'card' | 'split' | 'debt' | 'debt_payment';

interface PaymentModalProps {
  cart: CartWithItems;
  initialMethod: PaymentMethod;
  onClose: () => void;
  onPaid: () => void;
}

const digitsOnly = (value: string) => value.replace(/[^\d]/g, '');
const toNumber = (value: string) => Number(value || 0);

function Keypad({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
}) {
  const press = (key: string) => {
    if (key === 'del') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === 'clear') {
      onChange('');
      return;
    }
    const next = `${value}${key}`.replace(/^0+(?=\d)/, '');
    onChange(next.slice(0, 9));
  };

  return (
    <div role="group" aria-label={label} className="grid grid-cols-3 gap-px border border-rule-strong bg-rule">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          aria-label={key === 'del' ? label : key}
          className="num flex h-12 items-center justify-center bg-paper text-[17px] text-ink transition-colors hover:bg-counter active:bg-counter-deep"
        >
          {key === 'del' ? <Delete className="h-4 w-4" strokeWidth={1.75} /> : key}
        </button>
      ))}
    </div>
  );
}

function BalanceLine({ client }: { client: Client }) {
  const { t } = useTranslation();
  const owes = client.balance < 0;
  const settled = client.balance === 0;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-ink-soft">
        {settled ? t('payment.settled') : owes ? t('payment.owes') : t('payment.advance')}
      </span>
      <span
        className={cn(
          'num text-[15px] font-medium',
          settled ? 'text-ink-soft' : owes ? 'text-danger' : 'text-success',
        )}
      >
        {settled ? '0' : owes ? '−' : '+'}
        {formatPrice(Math.abs(client.balance))}
      </span>
    </div>
  );
}

export function PaymentModal({ cart, initialMethod, onClose, onPaid }: PaymentModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { refreshCarts, createCart } = useCartStore();
  const { refresh: refreshSync } = useSyncStore();
  const { autoPrint, printerName, printerWidth } = useSettingsStore();

  const total = cart.total;
  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [tendered, setTendered] = useState(String(Math.ceil(total)));
  const [splitCard, setSplitCard] = useState('0');
  const [splitTendered, setSplitTendered] = useState(String(Math.ceil(total)));
  const [debtAmount, setDebtAmount] = useState(String(Math.ceil(total)));
  const [repayAmount, setRepayAmount] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cashReceived = toNumber(tendered);
  const cashChange = cashReceived - total;

  const cardPart = Math.min(toNumber(splitCard), total);
  const cashPart = Math.max(0, total - cardPart);
  const splitTenderedNum = toNumber(splitTendered);
  const splitChange = splitTenderedNum - cashPart;

  const debtPart = Math.min(toNumber(debtAmount), total);
  const debtCashPart = Math.max(0, total - debtPart);

  // The cash field follows the card amount, so the remainder is always exact.
  useEffect(() => {
    setSplitTendered(String(Math.ceil(cashPart)));
  }, [cashPart]);

  const methods = useMemo(
    () =>
      [
        { id: 'cash' as const, label: t('payment.cash'), icon: Banknote, key: 'F1' },
        { id: 'card' as const, label: t('payment.card'), icon: CreditCard, key: 'F2' },
        { id: 'split' as const, label: t('payment.split'), icon: Layers, key: 'F3' },
        { id: 'debt' as const, label: t('payment.debt'), icon: BookUser, key: 'F4' },
        {
          id: 'debt_payment' as const,
          label: t('payment.debt_payment'),
          icon: HandCoins,
          key: 'F5',
        },
      ] satisfies Array<{ id: PaymentMethod; label: string; icon: typeof Banknote; key: string }>,
    [t],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const matched = methods.find((item) => item.key === event.key);
      if (matched) {
        event.preventDefault();
        setMethod(matched.id);
        setError('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [methods]);

  const searchClients = useCallback(async (query: string) => {
    try {
      const list = await invoke<Client[]>('search_clients', { query });
      setClients(list);
    } catch {
      setClients([]);
    }
  }, []);

  useEffect(() => {
    if (clientQuery.trim().length < 2) {
      setClients([]);
      return;
    }
    const timer = window.setTimeout(() => void searchClients(clientQuery.trim()), 160);
    return () => window.clearTimeout(timer);
  }, [clientQuery, searchClients]);

  useEffect(() => {
    setError('');
  }, [method]);

  const createClient = async () => {
    if (!newName.trim()) return;
    try {
      const client = await invoke<Client>('create_client', {
        name: newName.trim(),
        phone: newPhone.trim() || null,
      });
      setSelectedClient(client);
      setNewClientOpen(false);
      setNewName('');
      setNewPhone('');
      setClients([]);
      setClientQuery('');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const finishSale = async (cash: number, card: number, debt: number, client: Client | null) => {
    const transaction = await invoke<Transaction>('process_payment', {
      token: useAuthStore.getState().token,
      cartId: cart.cart.id,
      cashAmount: cash,
      cardAmount: card,
      clientId: client?.id ?? null,
      debtAmount: debt,
    });

    await refreshCarts();
    if (useCartStore.getState().carts.length === 0) await createCart();
    await refreshSync();

    try {
      await invoke('open_cash_drawer', { printerName });
    } catch {
      // Hardware is optional in M1.
    }
    if (autoPrint && printerName) {
      try {
        await invoke('print_receipt', {
          transactionId: transaction.id,
          printerName,
          width: printerWidth,
        });
      } catch {
        // Printing must never block a completed sale.
      }
    }

    toast({
      title: debt > 0 ? t('payment.debt_success') : t('payment.success'),
      description:
        debt > 0
          ? t('payment.debt_success_desc', {
              id: transaction.id,
              client: client?.name ?? '',
            })
          : t('payment.success_desc', {
              id: transaction.id,
              change: formatPrice(transaction.change_amount),
            }),
      variant: 'success',
    });
    onPaid();
  };

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      if (method === 'cash') {
        if (cashReceived + 0.01 < total) {
          setError(t('payment.cash_short'));
          return;
        }
        await finishSale(cashReceived, 0, 0, null);
      } else if (method === 'card') {
        await finishSale(0, total, 0, null);
      } else if (method === 'split') {
        if (toNumber(splitCard) > total) {
          setError(t('payment.split_invalid'));
          return;
        }
        if (splitTenderedNum + 0.01 < cashPart) {
          setError(t('payment.cash_short'));
          return;
        }
        await finishSale(splitTenderedNum, cardPart, 0, null);
      } else if (method === 'debt') {
        if (!selectedClient) {
          setError(t('payment.select_client'));
          return;
        }
        if (debtPart <= 0) {
          setError(t('payment.debt_required'));
          return;
        }
        await finishSale(debtCashPart, 0, debtPart, selectedClient);
      } else {
        if (!selectedClient) {
          setError(t('payment.select_client'));
          return;
        }
        const amount = toNumber(repayAmount);
        if (amount <= 0) {
          setError(t('payment.amount_required'));
          return;
        }
        await invoke('pay_client_debt', {
          token: useAuthStore.getState().token,
          clientId: selectedClient.id,
          amount,
        });
        await refreshSync();
        toast({
          title: t('payment.paid_success'),
          description: t('payment.paid_success_desc', {
            client: selectedClient.name,
            balance: formatPrice(selectedClient.balance + amount),
          }),
          variant: 'success',
        });
        onPaid();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const keypadTarget =
    method === 'cash'
      ? tendered
      : method === 'split'
        ? splitCard
        : method === 'debt'
          ? debtAmount
          : method === 'debt_payment'
            ? repayAmount
            : null;

  const setKeypadTarget =
    method === 'cash'
      ? setTendered
      : method === 'split'
        ? setSplitCard
        : method === 'debt'
          ? setDebtAmount
          : setRepayAmount;

  const submitLabel =
    method === 'cash' || method === 'split'
      ? t('payment.submit_cash')
      : method === 'card'
        ? t('payment.submit_card')
        : method === 'debt'
          ? t('payment.submit_debt')
          : t('payment.submit_debt_payment');

  const canSubmit =
    method === 'cash'
      ? cashReceived + 0.01 >= total
      : method === 'split'
        ? splitTenderedNum + 0.01 >= cashPart && toNumber(splitCard) <= total
        : method === 'debt'
          ? Boolean(selectedClient) && debtPart > 0
          : method === 'debt_payment'
            ? Boolean(selectedClient) && toNumber(repayAmount) > 0
            : true;

  const showKeypad = keypadTarget !== null;

  const clientSelector = (
    <div className="space-y-3">
      <div>
        <span className="mb-1.5 block text-[12px] font-medium text-ink-soft">
          {t('payment.client')}
        </span>
        {selectedClient ? (
          <div className="border border-rule-strong bg-paper-deep px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-ink">{selectedClient.name}</p>
                {selectedClient.phone && (
                  <p className="num mt-0.5 text-[11px] text-ink-soft">{selectedClient.phone}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                aria-label={t('payment.change_client')}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-ink-faint hover:bg-counter hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 border-t border-rule pt-2">
              <BalanceLine client={selectedClient} />
            </div>
          </div>
        ) : (
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-[42px] h-4 w-4 -translate-y-1/2 text-ink-faint"
              strokeWidth={1.75}
            />
            <Input
              label={t('payment.search_client')}
              value={clientQuery}
              onChange={(event) => setClientQuery(event.target.value)}
              placeholder="Азиз, +998…"
              className="pl-9"
              autoComplete="off"
            />
            {clientQuery.trim().length >= 2 && (
              <div className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-48 overflow-auto border border-rule-strong bg-paper shadow-[0_18px_40px_-20px_rgba(10,14,9,0.4)]">
                {clients.length === 0 ? (
                  <p className="px-3 py-3 text-[12px] text-ink-soft">{t('payment.no_clients')}</p>
                ) : (
                  clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setSelectedClient(client);
                        setClients([]);
                        setClientQuery('');
                      }}
                      className="flex w-full items-center justify-between gap-3 border-b border-rule px-3 py-2.5 text-left last:border-0 hover:bg-counter"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-ink">{client.name}</span>
                        <span className="num block text-[10px] text-ink-faint">{client.phone}</span>
                      </span>
                      <span
                        className={cn(
                          'num shrink-0 text-[12px]',
                          client.balance < 0
                            ? 'text-danger'
                            : client.balance > 0
                              ? 'text-success'
                              : 'text-ink-soft',
                        )}
                      >
                        {client.balance === 0
                          ? '0'
                          : `${client.balance < 0 ? '−' : '+'}${formatPrice(Math.abs(client.balance))}`}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!selectedClient && !newClientOpen && (
        <Button variant="outline" size="sm" onClick={() => setNewClientOpen(true)}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          {t('payment.new_client')}
        </Button>
      )}

      {!selectedClient && newClientOpen && (
        <div className="space-y-2 border border-rule bg-paper-deep p-3">
          <Input
            label={t('payment.client_name')}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            autoFocus
          />
          <Input
            label={t('payment.client_phone')}
            value={newPhone}
            onChange={(event) => setNewPhone(event.target.value)}
            placeholder="+998"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void createClient()} disabled={!newName.trim()}>
              {t('payment.create_client')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNewClientOpen(false)}>
              {t('general.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        hideClose
        className="flex h-[min(700px,calc(100vh-40px))] w-[min(1060px,calc(100vw-40px))] max-w-none flex-col p-0"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-rule px-5 py-3.5">
          <div>
            <DialogTitle>{t('payment.title')}</DialogTitle>
            <DialogDescription>
              {t('payment.receipt_line', { id: cart.cart.id, count: cart.items.length })}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[11px] text-ink-soft">{t('payment.due')}</p>
              <p className="num text-[26px] font-semibold leading-none tracking-tighter text-ink">
                {formatPrice(total)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('general.close')}
              className="flex h-9 w-9 items-center justify-center text-ink-soft hover:bg-counter hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-0 flex-col">
            <div className="grid shrink-0 grid-cols-5 border-b border-rule">
              {methods.map((item) => {
                const Icon = item.icon;
                const active = method === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethod(item.id)}
                    className={cn(
                      'relative flex min-h-[68px] flex-col items-center justify-center gap-1.5 px-2 text-[12px] font-medium transition-colors',
                      active
                        ? 'bg-paper text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-carbon'
                        : 'bg-paper-deep text-ink-soft hover:bg-counter hover:text-ink',
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                    <span className="truncate">{item.label}</span>
                    <span className="num absolute right-1.5 top-1.5 text-[9px] text-ink-faint">
                      {item.key}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <div className="grid gap-5 p-5" style={{ gridTemplateColumns: showKeypad ? 'minmax(0,1fr) 210px' : '1fr' }}>
                <div className="min-w-0 space-y-4">
                  {method === 'cash' && (
                    <>
                      <div>
                        <Input
                          label={t('payment.tendered')}
                          numeric
                          inputMode="numeric"
                          value={tendered}
                          onChange={(event) => setTendered(digitsOnly(event.target.value))}
                          className="h-14 text-[28px]"
                          autoFocus
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setTendered(String(Math.ceil(total)))}
                            className="min-h-9 border border-rule-strong px-3 text-[12px] text-ink hover:border-ink hover:bg-counter"
                          >
                            {t('payment.exact')}
                          </button>
                          {[50_000, 100_000, 200_000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setTendered(String(preset))}
                              className="num min-h-9 border border-rule-strong px-3 text-[12px] text-ink hover:border-ink hover:bg-counter"
                            >
                              {preset.toLocaleString('ru-RU')}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-rule pt-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[12px] text-ink-soft">{t('payment.change')}</span>
                          <span
                            className={cn(
                              'num text-[34px] font-semibold leading-none tracking-tighter',
                              cashChange < 0 ? 'text-danger' : 'text-ink',
                            )}
                          >
                            {formatPrice(Math.max(0, cashChange))}
                          </span>
                        </div>
                        {cashChange < 0 && (
                          <p className="mt-1 text-right text-[11px] text-danger">
                            {t('payment.cash_short')}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {method === 'card' && (
                    <div className="border border-rule bg-paper-deep p-4">
                      <p className="num text-[38px] font-semibold leading-none tracking-tighter text-ink">
                        {formatPrice(total)}
                      </p>
                      <p className="mt-3 max-w-[42ch] text-[12px] leading-relaxed text-ink-soft">
                        {t('payment.card_note')}
                      </p>
                    </div>
                  )}

                  {method === 'split' && (
                    <>
                      <div>
                        <Input
                          label={t('payment.split_card')}
                          numeric
                          inputMode="numeric"
                          value={splitCard}
                          onChange={(event) => setSplitCard(digitsOnly(event.target.value))}
                          className="h-14 text-[24px]"
                          autoFocus
                        />
                      </div>
                      <Input
                        label={t('payment.tendered')}
                        numeric
                        inputMode="numeric"
                        value={splitTendered}
                        onChange={(event) => setSplitTendered(digitsOnly(event.target.value))}
                        hint={t('payment.split_cash_hint', { amount: formatPrice(cashPart) })}
                      />
                      <div className="border-t border-rule pt-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[12px] text-ink-soft">{t('payment.change')}</span>
                          <span
                            className={cn(
                              'num text-[30px] font-semibold leading-none tracking-tighter',
                              splitChange < 0 ? 'text-danger' : 'text-ink',
                            )}
                          >
                            {formatPrice(Math.max(0, splitChange))}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {method === 'debt' && (
                    <>
                      {clientSelector}
                      <div>
                        <Input
                          label={t('payment.debt_amount')}
                          numeric
                          inputMode="numeric"
                          value={debtAmount}
                          onChange={(event) => setDebtAmount(digitsOnly(event.target.value))}
                          className="h-14 text-[22px]"
                          hint={t('payment.cash_remainder_hint', {
                            amount: formatPrice(debtCashPart),
                          })}
                        />
                      </div>
                    </>
                  )}

                  {method === 'debt_payment' && (
                    <>
                      {clientSelector}
                      <div>
                        <Input
                          label={t('payment.pay_amount')}
                          numeric
                          inputMode="numeric"
                          value={repayAmount}
                          onChange={(event) => setRepayAmount(digitsOnly(event.target.value))}
                          className="h-14 text-[22px]"
                          autoFocus
                        />
                      </div>
                    </>
                  )}
                </div>

                {showKeypad && (
                  <div className="self-start">
                    <span className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                      {t('payment.amount')}
                    </span>
                    <Keypad
                      value={keypadTarget ?? ''}
                      onChange={setKeypadTarget}
                      label={t('payment.keypad')}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setKeypadTarget('')}
                    >
                      {t('payment.clear_amount')}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="shrink-0 border-t border-danger/30 bg-danger-tint px-5 py-2.5 text-[12px] text-danger">
                {error}
              </div>
            )}

            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-rule px-5 py-3.5">
              <p className="max-w-[52ch] text-[11px] leading-relaxed text-ink-faint">
                {t('payment.keyboard_hint')}
              </p>
              <Button
                size="xl"
                className="min-w-[220px]"
                onClick={() => void submit()}
                disabled={busy || !canSubmit}
              >
                {busy ? t('general.loading') : submitLabel}
              </Button>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col border-l border-rule bg-paper-deep">
            <div className="shrink-0 border-b border-rule px-4 py-3">
              <h3 className="text-[13px] font-semibold text-ink">{t('payment.items')}</h3>
            </div>
            <ul className="min-h-0 flex-1 overflow-auto px-4 py-3">
              {cart.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-b border-rule py-2 text-[12px] last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-ink">{item.name}</p>
                    <p className="num mt-0.5 text-[10px] text-ink-faint">
                      {item.qty} × {formatPrice(item.price)}
                    </p>
                  </div>
                  <span className="num shrink-0 text-ink">{formatPrice(item.final_price)}</span>
                </li>
              ))}
            </ul>

            <div className="shrink-0 border-t border-rule px-4 py-3">
              <dl className="space-y-1.5 text-[12px]">
                <div className="flex justify-between text-ink-soft">
                  <dt>{t('payment.subtotal')}</dt>
                  <dd className="num">
                    {formatPrice(cart.items.reduce((sum, item) => sum + item.price * item.qty, 0))}
                  </dd>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <dt>{t('payment.discount')}</dt>
                  <dd className="num">
                    {formatPrice(
                      cart.items.reduce((sum, item) => sum + item.price * item.qty, 0) - total,
                    )}
                  </dd>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-rule pt-2 text-ink">
                  <dt className="text-[12px] font-medium">{t('payment.total')}</dt>
                  <dd className="num text-[22px] font-semibold tracking-tighter">
                    {formatPrice(total)}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 border-t border-dashed border-rule pt-2 text-[11px] text-ink-soft">
                {method === 'cash' && (
                  <p className="num">
                    {t('payment.cash')}: {formatPrice(Math.min(cashReceived, total))} ·{' '}
                    {t('payment.change')}: {formatPrice(Math.max(0, cashChange))}
                  </p>
                )}
                {method === 'card' && <p className="num">{t('payment.card')}: {formatPrice(total)}</p>}
                {method === 'split' && (
                  <p className="num">
                    {t('payment.card')}: {formatPrice(cardPart)} · {t('payment.cash')}:{' '}
                    {formatPrice(cashPart)}
                  </p>
                )}
                {method === 'debt' && (
                  <p className="num">
                    {t('payment.debt')}: {formatPrice(debtPart)} · {t('payment.cash')}:{' '}
                    {formatPrice(debtCashPart)}
                  </p>
                )}
                {method === 'debt_payment' && (
                  <p className="num">
                    {t('payment.pay_amount')}: {formatPrice(toNumber(repayAmount))}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
