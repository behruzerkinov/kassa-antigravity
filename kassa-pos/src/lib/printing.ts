import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../stores/settingsStore';
import { toast } from '../stores/toastStore';
import { translate, errorMessage } from '../i18n/i18nContext';

/**
 * Prints a saved receipt on the default printer. The transaction is already stored,
 * so on failure the receipt stays available for reprint from the Receipts page.
 */
export async function printReceipt(transactionId: number): Promise<boolean> {
  const { printerName } = useSettingsStore.getState();
  try {
    await invoke('print_receipt', { transactionId, printerName, width: 80 });
    return true;
  } catch (e) {
    if (String(e) === 'printer_not_found') {
      toast(
        translate('printing.missing_title'),
        'error',
        translate('printing.missing_desc').replace('{name}', printerName || translate('printing.none')),
      );
    } else {
      toast(errorMessage(e), 'error');
    }
    return false;
  }
}

export async function printAfterSale(transactionId: number) {
  if (useSettingsStore.getState().autoPrint) await printReceipt(transactionId);
}
