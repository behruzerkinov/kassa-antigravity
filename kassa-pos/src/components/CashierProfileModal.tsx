import React, { useState } from 'react';
import {
  User,
  CreditCard,
  LogOut,
  Settings,
  ArrowLeft,
  ShieldAlert,
  Wallet,
  Building,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useAuthStore } from '../stores/authStore';
import { formatPrice, initials, cn } from '../lib/utils';
import { useTranslation } from '../i18n/i18nContext';

interface CashierProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateSettings?: () => void;
}

type ProviderKey = 'click' | 'payme' | 'paynet' | 'uzum';

interface ProviderConfig {
  id: ProviderKey;
  name: string;
  badge: string;
  color: string;
  bgLight: string;
  merchantRef: string;
  instructions: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'click',
    name: 'Click Up',
    badge: 'CLICK',
    color: 'text-blue-600 dark:text-blue-400',
    bgLight: 'bg-blue-500/10 border-blue-500/20',
    merchantRef: 'CLICK-MERCHANT-KASSA',
    instructions: 'Оплата через Click Pass или выставление счета по номеру телефона',
  },
  {
    id: 'payme',
    name: 'Payme Business',
    badge: 'PAYME',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgLight: 'bg-cyan-500/10 border-cyan-500/20',
    merchantRef: 'PAYME-MERCHANT-KASSA',
    instructions: 'Оплата по QR-коду Payme или через платежный шлюз Payme Business',
  },
  {
    id: 'paynet',
    name: 'Paynet',
    badge: 'PAYNET',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgLight: 'bg-emerald-500/10 border-emerald-500/20',
    merchantRef: 'PAYNET-AGENT-KASSA-01',
    instructions: 'Пополнение через инфокиоск или приложение Paynet по ID кассира',
  },
  {
    id: 'uzum',
    name: 'Uzum Bank / Pay',
    badge: 'UZUM',
    color: 'text-purple-600 dark:text-purple-400',
    bgLight: 'bg-purple-500/10 border-purple-500/20',
    merchantRef: 'UZUM-MERCHANT-KASSA-01',
    instructions: 'Оплата по динамическому QR Uzum Bank или через сервис Uzum Pay',
  },
];

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000];

export function CashierProfileModal({
  open,
  onOpenChange,
  onNavigateSettings,
}: CashierProfileModalProps) {
  const { t } = useTranslation();
  const { cashierId, cashierName, requestLogout } = useAuthStore();

  const [view, setView] = useState<'profile' | 'topup'>('profile');
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey>('click');
  const [amount, setAmount] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState<string>('100000');
  const [initiatedState, setInitiatedState] = useState<boolean>(false);

  // Cashier & Workstation attribution
  const attributionId = `CASHIER-${cashierId ?? 1}-WS01`;
  const workstationName = 'Касса №1 (Основной терминал)';
  const currentBalance = 0; // Local balance model

  const handleSelectAmount = (val: number) => {
    setAmount(val);
    setCustomAmount(val.toString());
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCustomAmount(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      setAmount(parsed);
    }
  };

  const handleInitiateTopup = () => {
    setInitiatedState(true);
  };

  const resetTopup = () => {
    setInitiatedState(false);
    setView('profile');
  };

  const activeProvider = PROVIDERS.find((p) => p.id === selectedProvider) ?? PROVIDERS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-0 overflow-hidden">
        {view === 'profile' ? (
          <div>
            <DialogHeader className="border-b border-rule bg-paper px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rule-strong bg-counter-deep text-[16px] font-semibold text-ink">
                  {initials(cashierName)}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate text-[16px] font-semibold text-ink">
                    {cashierName || 'Кассир'}
                  </DialogTitle>
                  <p className="text-[12px] text-ink-soft">
                    ID сотрудника: <span className="font-mono font-medium text-ink">#{cashierId ?? 1}</span>
                  </p>
                </div>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-4 px-6 py-5">
              {/* Workstation & Balance Card */}
              <div className="rounded-lg border border-rule bg-paper-deep p-4 space-y-3">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-ink-soft">
                    <Building className="h-3.5 w-3.5" />
                    Рабочая станция
                  </span>
                  <span className="font-medium text-ink">{workstationName}</span>
                </div>

                <div className="border-t border-rule pt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                    <Wallet className="h-3.5 w-3.5" />
                    Баланс аккаунта
                  </span>
                  <span className="num text-[17px] font-bold tracking-tight text-ink">
                    {formatPrice(currentBalance)}
                  </span>
                </div>
              </div>

              {/* Attribution Reference */}
              <div className="rounded border border-rule/70 bg-paper px-3 py-2 text-[11px] text-ink-soft flex items-center justify-between">
                <span>Идентификатор платежей:</span>
                <span className="font-mono font-semibold text-ink">{attributionId}</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Button
                  variant="default"
                  className="w-full justify-center gap-2 h-10 text-[13px]"
                  onClick={() => setView('topup')}
                >
                  <CreditCard className="h-4 w-4" />
                  Пополнить баланс
                </Button>

                {onNavigateSettings && (
                  <Button
                    variant="outline"
                    className="w-full justify-center gap-2 h-9 text-[13px]"
                    onClick={() => {
                      onOpenChange(false);
                      onNavigateSettings();
                    }}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Настройки кассы
                  </Button>
                )}

                <Button
                  variant="ghost"
                  className="w-full justify-center gap-2 h-9 text-[13px] text-danger hover:bg-danger-tint hover:text-danger"
                  onClick={() => {
                    onOpenChange(false);
                    requestLogout();
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Выйти из системы
                </Button>
              </div>
            </DialogBody>
          </div>
        ) : (
          /* Top-up view */
          <div>
            <DialogHeader className="border-b border-rule bg-paper px-5 py-3.5 flex flex-row items-center gap-2">
              <button
                type="button"
                onClick={resetTopup}
                className="flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:bg-counter hover:text-ink transition-colors"
                title="Назад к профилю"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <DialogTitle className="text-[15px] font-semibold text-ink">
                  Пополнение баланса кассира
                </DialogTitle>
                <p className="text-[11px] text-ink-soft">
                  Плательщик: {cashierName} · {attributionId}
                </p>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-4 px-6 py-4">
              {!initiatedState ? (
                <>
                  {/* Select Provider */}
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-ink-soft">
                      Выберите платежную систему
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PROVIDERS.map((p) => {
                        const isSelected = selectedProvider === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedProvider(p.id)}
                            className={cn(
                              'flex flex-col items-start rounded-lg border p-3 text-left transition-all',
                              isSelected
                                ? 'border-carbon bg-carbon-tint/20 ring-1 ring-carbon text-ink'
                                : 'border-rule bg-paper hover:bg-counter text-ink-soft hover:text-ink',
                            )}
                          >
                            <span className={cn('text-[11px] font-black tracking-wider', p.color)}>
                              {p.badge}
                            </span>
                            <span className="mt-1 text-[13px] font-medium text-ink">{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preset amounts */}
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                      Сумма пополнения (UZS)
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {PRESET_AMOUNTS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleSelectAmount(amt)}
                          className={cn(
                            'rounded border py-1.5 text-center text-[11px] font-medium transition-all',
                            amount === amt
                              ? 'border-carbon bg-carbon text-counter'
                              : 'border-rule bg-paper text-ink hover:bg-counter',
                          )}
                        >
                          {(amt / 1000).toLocaleString('ru-RU')}k
                        </button>
                      ))}
                    </div>
                    <Input
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      placeholder="Введите сумму"
                      className="h-10 text-[14px]"
                    />
                  </div>

                  {/* Attribution Details */}
                  <div className="rounded-lg border border-rule bg-paper-deep p-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Мерчант-шлюз:</span>
                      <span className="font-mono text-ink">{activeProvider.merchantRef}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-soft">ID получателя:</span>
                      <span className="font-mono text-ink">{attributionId}</span>
                    </div>
                    <p className="text-[10px] text-ink-faint pt-1 border-t border-rule">
                      {activeProvider.instructions}
                    </p>
                  </div>

                  <Button
                    variant="default"
                    className="w-full justify-center h-10 text-[13px]"
                    onClick={handleInitiateTopup}
                    disabled={!amount || amount < 1000}
                  >
                    Перейти к оплате {formatPrice(amount)}
                  </Button>
                </>
              ) : (
                /* Truthful Pending / Configuration State */
                <div className="space-y-4 py-2">
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="space-y-1 text-[12px] leading-relaxed">
                        <p className="font-semibold text-ink">
                          Шлюз {activeProvider.name}: Ожидает боевые ключи мерчанта
                        </p>
                        <p className="text-ink-soft">
                          Для фискального зачисления реальных средств на счет кассы требуется
                          настройка боевого договора и API-ключей ({activeProvider.id.toUpperCase()}_MERCHANT_ID, SECRET_KEY) в бэкенд-сервере.
                        </p>
                        <p className="text-[11px] text-ink-faint pt-1">
                          Требование честности платежей (Payment Integrity): без подтвержденного
                          вебхука от шлюза баланс кассира не завышается фиктивно.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-rule bg-paper p-3 text-[12px] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Запрашиваемая сумма:</span>
                      <span className="font-bold text-ink">{formatPrice(amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Система:</span>
                      <span className="font-medium text-ink">{activeProvider.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Счет зачисления:</span>
                      <span className="font-mono text-ink">{attributionId}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1 justify-center h-9 text-[12px]"
                      onClick={() => setInitiatedState(false)}
                    >
                      Выбрать другую сумму
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1 justify-center h-9 text-[12px]"
                      onClick={resetTopup}
                    >
                      Понятно
                    </Button>
                  </div>
                </div>
              )}
            </DialogBody>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
