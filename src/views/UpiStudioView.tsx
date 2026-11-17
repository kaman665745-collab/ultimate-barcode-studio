import React, { useState } from 'react';
import { ExportFormat, QRDesignConfig, UpiPosterConfig } from '../types/studio';
import { buildUpiUri, isValidUpiId, sanitizeText } from '../utils/qrPayload';
import { QrPreviewCanvas } from '../components/QrPreviewCanvas';
import { ExportBar } from '../components/ExportBar';
import {
  copyPngBlobToClipboard,
  exportQrCode,
  exportUpiPaymentPoster,
  renderQrPngBlob,
} from '../utils/exportStudio';
import { DESIGN_PRESETS } from '../data/presets';
import {
  AlertCircle,
  BookmarkPlus,
  Copy,
  Check,
  FileDown,
  Info,
  Printer,
  ShieldAlert,
} from 'lucide-react';

interface UpiStudioViewProps {
  defaultExportSize: number;
  onSaveProject: (
    name: string,
    payload: string,
    design: QRDesignConfig,
    thumbnail?: string
  ) => Promise<boolean>;
  onRecordDownload: (title: string, payload: string, format: ExportFormat) => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

const POSTER_TEMPLATES: {
  id: UpiPosterConfig['template'];
  label: string;
  bgClass: string;
  textClass: string;
  accentClass: string;
}[] = [
  {
    id: 'classic-violet',
    label: 'Royal Violet',
    bgClass: 'bg-gradient-to-br from-[#140c2b] to-[#3b0764] border-violet-400/40',
    textClass: 'text-white',
    accentClass: 'text-pink-400',
  },
  {
    id: 'merchant-gold',
    label: 'Black & Gold',
    bgClass: 'bg-gradient-to-br from-zinc-950 to-stone-900 border-amber-500/40',
    textClass: 'text-amber-50',
    accentClass: 'text-amber-400',
  },
  {
    id: 'pink-modern',
    label: 'Magenta Studio',
    bgClass: 'bg-gradient-to-br from-fuchsia-950 to-pink-900 border-pink-400/40',
    textClass: 'text-white',
    accentClass: 'text-pink-300',
  },
  {
    id: 'minimal-white',
    label: 'Clean Counter White',
    bgClass: 'bg-gradient-to-br from-slate-50 to-violet-100 border-violet-300',
    textClass: 'text-slate-900',
    accentClass: 'text-violet-700',
  },
];

export const UpiStudioView: React.FC<UpiStudioViewProps> = ({
  defaultExportSize,
  onSaveProject,
  onRecordDownload,
  onToast,
}) => {
  const [poster, setPoster] = useState<UpiPosterConfig>({
    upiId: 'merchant@okicici',
    payeeName: 'Apex Coffee Roasters',
    shopName: 'Apex Coffee Roasters',
    amount: '',
    note: 'Counter Checkout',
    template: 'classic-violet',
    showAppsStrip: true,
  });

  const [copiedUri, setCopiedUri] = useState(false);
  const [thumbnail, setThumbnail] = useState<string>('');
  const [exportingPoster, setExportingPoster] = useState<'PNG' | 'PDF' | null>(null);

  const upiIdValid = isValidUpiId(poster.upiId);
  const payeeValid = sanitizeText(poster.payeeName).length > 0;
  const amountValid =
    !poster.amount || (!Number.isNaN(Number(poster.amount)) && Number(poster.amount) >= 0);
  const isValid = upiIdValid && payeeValid && amountValid;

  const upiUri = isValid
    ? buildUpiUri({
        upiId: poster.upiId,
        payeeName: poster.payeeName,
        amount: poster.amount,
        currency: 'INR',
        note: poster.note,
      })
    : '';

  const paymentDesign: QRDesignConfig = {
    ...DESIGN_PRESETS.find((p) => p.id === 'payment')!.design,
    frameStyle: 'none',
    caption: '',
    size: 240,
    ecc: 'H',
  };

  const activeTheme = POSTER_TEMPLATES.find((t) => t.id === poster.template)!;

  const handleCopyUri = () => {
    if (!upiUri) return;
    navigator.clipboard.writeText(upiUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 1800);
    onToast('info', 'UPI URI copied', upiUri);
  };

  const handlePosterDownload = async (fmt: 'PNG' | 'PDF') => {
    if (!isValid) {
      onToast('error', 'Invalid UPI Details', 'Enter a valid UPI ID and payee name first.');
      return;
    }
    setExportingPoster(fmt);
    try {
      const name = poster.shopName.trim() || poster.payeeName.trim() || 'upi-payment';
      await exportUpiPaymentPoster(poster, fmt, name);
      await onRecordDownload(`${name} UPI Poster`, upiUri, fmt);
      onToast('success', `Poster Downloaded (${fmt})`, 'Print-ready merchant standee saved.');
    } finally {
      setExportingPoster(null);
    }
  };

  const handleQrOnlyExport = async (fmt: ExportFormat, size: number) => {
    if (!isValid) return;
    const name = `${poster.shopName || poster.payeeName}-upi-qr`;
    await exportQrCode(upiUri, paymentDesign, fmt, name, size);
    await onRecordDownload(name, upiUri, fmt);
    onToast('success', `Downloaded ${fmt}`, 'Payment QR image exported.');
  };

  const handleSave = async () => {
    if (!isValid) {
      onToast('error', 'Cannot save', 'Please fix UPI input validation errors.');
      return;
    }
    const title = `${poster.shopName || poster.payeeName} UPI`;
    try {
      const saved = await onSaveProject(title, upiUri, paymentDesign, thumbnail);
      if (saved) {
        onToast('success', 'Saved UPI QR', `${title} added to My Saved Codes.`);
      }
    } catch (err) {
      onToast(
        'error',
        'Save Failed',
        err instanceof Error ? err.message : 'Unable to save UPI QR.'
      );
    }
  };

  const inputCls =
    'w-full bg-[#100d1b] border border-violet-400/25 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500';
  const labelCls = 'block text-xs font-medium text-slate-300 mb-1.5';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">UPI Payment QR Studio</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Create standard Indian UPI payment QRs and printable counter posters.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isValid}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.08] border border-violet-400/35 text-white hover:bg-violet-600/30 disabled:opacity-45 whitespace-nowrap self-start"
        >
          <BookmarkPlus className="w-4 h-4 text-pink-300" />
          Save to Projects
        </button>
      </div>

      {/* Explicit Payment Disclaimer */}
      <div className="glass-panel rounded-2xl p-4 flex items-start gap-3 border-amber-500/30 bg-amber-950/20">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-100/90 leading-relaxed">
          <strong className="font-semibold text-amber-200">Payment Notice:</strong> Generating a UPI QR code creates a standard <code className="font-mono text-amber-200">upi://pay</code> instruction link for scanning apps. Ultimate Barcode Studio does not process, hold, or verify payments—always confirm settled funds directly inside your bank or merchant app.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Controls */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-white pb-3 border-b border-white/10">
            Merchant & Payment Parameters
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="upi-shop-name" className={labelCls}>
                Store / Brand Heading
              </label>
              <input
                id="upi-shop-name"
                type="text"
                value={poster.shopName}
                onChange={(e) => setPoster({ ...poster, shopName: e.target.value })}
                placeholder="Apex Coffee Roasters"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="upi-payee-name" className={labelCls}>
                Payee Name (Bank Account Name)
              </label>
              <input
                id="upi-payee-name"
                type="text"
                value={poster.payeeName}
                onChange={(e) => setPoster({ ...poster, payeeName: e.target.value })}
                placeholder="Apex Coffee Roasters"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="upi-vpa-input" className={labelCls}>
                UPI ID (VPA)
              </label>
              <input
                id="upi-vpa-input"
                type="text"
                value={poster.upiId}
                onChange={(e) => setPoster({ ...poster, upiId: e.target.value })}
                placeholder="merchant@okicici"
                className={`${inputCls} font-mono`}
              />
            </div>

            <div>
              <label htmlFor="upi-amount-input" className={labelCls}>
                Fixed Amount INR (Optional)
              </label>
              <input
                id="upi-amount-input"
                type="number"
                min="0"
                step="0.01"
                value={poster.amount}
                onChange={(e) => setPoster({ ...poster, amount: e.target.value })}
                placeholder="Leave blank for any amount"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="upi-note-input" className={labelCls}>
              Payment Description / Reference Note
            </label>
            <input
              id="upi-note-input"
              type="text"
              value={poster.note}
              onChange={(e) => setPoster({ ...poster, note: e.target.value })}
              placeholder="Invoice or counter note"
              className={inputCls}
            />
          </div>

          {/* Merchant Poster Template Picker */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <p className="text-xs font-medium text-slate-300">Merchant Poster Template</p>
            <div className="grid grid-cols-2 gap-2.5">
              {POSTER_TEMPLATES.map((tpl) => {
                const active = poster.template === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setPoster({ ...poster, template: tpl.id })}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left border transition-all ${
                      active
                        ? 'border-pink-400 bg-violet-600/25 text-white'
                        : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
                    }`}
                  >
                    {tpl.label}
                  </button>
                );
              })}
            </div>
          </div>

          {!isValid && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/35 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                {!upiIdValid
                  ? 'Enter a valid UPI ID in handle@bank format (e.g., store@okicici).'
                  : !payeeValid
                  ? 'Payee name is required.'
                  : 'Enter a valid non-negative amount.'}
              </span>
            </div>
          )}

          {isValid && (
            <div className="rounded-xl bg-[#0c0916] border border-white/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">Generated UPI URI</span>
                <button
                  type="button"
                  onClick={handleCopyUri}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-pink-300 hover:text-pink-200"
                >
                  {copiedUri ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedUri ? 'Copied' : 'Copy URI'}
                </button>
              </div>
              <p data-testid="upi-generated-uri" className="text-xs font-mono text-violet-200 break-all">
                {upiUri}
              </p>
            </div>
          )}

          {/* Export QR Image Only */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <p className="text-xs font-semibold text-slate-200">Download QR Image Only</p>
            <ExportBar
              defaultSize={defaultExportSize}
              disabled={!isValid}
              onExport={handleQrOnlyExport}
              onCopyImage={async (size) => {
                try {
                  const blob = await renderQrPngBlob(upiUri, paymentDesign, size);
                  await copyPngBlobToClipboard(blob);
                  onToast('success', 'Payment QR Copied', 'PNG ready to paste.');
                } catch (err) {
                  onToast(
                    'error',
                    'Clipboard Copy Unavailable',
                    err instanceof Error ? err.message : 'Download PNG instead.'
                  );
                }
              }}
            />
          </div>
        </div>

        {/* Printable Merchant Poster Preview */}
        <div className="lg:col-span-6 space-y-4">
          <div
            data-testid="upi-poster-preview"
            className={`rounded-3xl p-6 sm:p-8 border shadow-2xl flex flex-col items-center text-center transition-all ${activeTheme.bgClass}`}
          >
            <p className={`font-display text-xl sm:text-2xl font-extrabold tracking-tight ${activeTheme.textClass}`}>
              {poster.shopName || poster.payeeName || 'Merchant Store'}
            </p>
            <p className={`text-xs font-bold tracking-widest mt-1 ${activeTheme.accentClass}`}>
              SCAN & PAY WITH ANY UPI APP
            </p>

            <div className="my-5 bg-white p-4 rounded-2xl shadow-lg">
              <QrPreviewCanvas
                payload={upiUri || 'upi://pay?pa=merchant@okicici&pn=Merchant&cu=INR'}
                design={paymentDesign}
                previewSize={220}
                showReliabilityBadge={false}
                onThumbnailReady={setThumbnail}
              />
            </div>

            <p className={`font-display text-base font-bold ${activeTheme.textClass}`}>
              {poster.payeeName || 'Payee Name'}
            </p>
            <p
              className={`font-mono text-xs mt-1 ${
                poster.template === 'minimal-white' ? 'text-slate-600' : 'text-slate-300'
              }`}
            >
              {poster.upiId}
            </p>

            {poster.amount && Number(poster.amount) > 0 && (
              <p className={`mt-2 font-display text-xl font-extrabold tabular-nums ${activeTheme.accentClass}`}>
                INR {Number(poster.amount).toFixed(2)}
              </p>
            )}

            {poster.note && (
              <p
                className={`mt-1 text-xs ${
                  poster.template === 'minimal-white' ? 'text-slate-500' : 'text-slate-300'
                }`}
              >
                {poster.note}
              </p>
            )}

            <p
              className={`mt-5 pt-3 border-t w-full text-[11px] flex items-center justify-center gap-1.5 ${
                poster.template === 'minimal-white'
                  ? 'border-slate-200 text-slate-500'
                  : 'border-white/15 text-slate-300'
              }`}
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              GPay · PhonePe · Paytm · BHIM · Any UPI App
            </p>
          </div>

          {/* Printable Poster Download Actions */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Printable Payment Poster</p>
              <p className="text-xs text-slate-400">1000x1400 high-resolution counter standee</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={!isValid || exportingPoster !== null}
                onClick={() => handlePosterDownload('PNG')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 disabled:opacity-45 whitespace-nowrap"
              >
                <FileDown className="w-3.5 h-3.5" />
                {exportingPoster === 'PNG' ? 'Rendering...' : 'Poster PNG'}
              </button>
              <button
                type="button"
                disabled={!isValid || exportingPoster !== null}
                onClick={() => handlePosterDownload('PDF')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.08] border border-violet-400/30 text-white hover:bg-white/[0.14] disabled:opacity-45 whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5 text-pink-300" />
                {exportingPoster === 'PDF' ? 'Rendering...' : 'Print PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
