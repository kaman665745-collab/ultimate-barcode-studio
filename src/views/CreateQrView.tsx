import React, { useState } from 'react';
import {
  ExportFormat,
  QRDesignConfig,
  QrCategory,
  QrFormState,
} from '../types/studio';
import {
  QR_CATEGORY_META,
  buildQrPayload,
  createDefaultQrFormState,
  validateQrForm,
} from '../utils/qrPayload';
import { QrPreviewCanvas } from '../components/QrPreviewCanvas';
import { ExportBar } from '../components/ExportBar';
import {
  copyPngBlobToClipboard,
  exportQrCode,
  renderQrPngBlob,
} from '../utils/exportStudio';
import {
  Globe,
  FileText,
  Phone,
  MessageCircle,
  MessageSquare,
  Mail,
  Wifi,
  Contact,
  IndianRupee,
  Wallet,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Share2,
  Code2,
  Palette,
  BookmarkPlus,
  AlertCircle,
  Info,
  Upload,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface CreateQrViewProps {
  form: QrFormState;
  design: QRDesignConfig;
  defaultExportSize: number;
  onChangeForm: (next: QrFormState) => void;
  onOpenDesignStudio: () => void;
  onSaveProject: (name: string, payload: string, thumbnail?: string) => Promise<boolean>;
  onRecordDownload: (title: string, payload: string, format: ExportFormat) => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

const CATEGORY_ICONS: Record<QrCategory, React.ComponentType<{ className?: string }>> = {
  website: Globe,
  text: FileText,
  phone: Phone,
  whatsapp: MessageCircle,
  sms: MessageSquare,
  email: Mail,
  wifi: Wifi,
  contact: Contact,
  upi: IndianRupee,
  paytm: Wallet,
  location: MapPin,
  event: Calendar,
  image: ImageIcon,
  social: Share2,
  custom: Code2,
};

const ALL_CATEGORIES = Object.keys(QR_CATEGORY_META) as QrCategory[];

export const CreateQrView: React.FC<CreateQrViewProps> = ({
  form,
  design,
  defaultExportSize,
  onChangeForm,
  onOpenDesignStudio,
  onSaveProject,
  onRecordDownload,
  onToast,
}) => {
  const [projectName, setProjectName] = useState(
    QR_CATEGORY_META[form.category].sampleTitle
  );
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const validation = validateQrForm(form);
  const payload = validation.valid ? buildQrPayload(form) : '';

  const updateField = <K extends keyof QrFormState>(key: K, value: QrFormState[K]) => {
    onChangeForm({ ...form, [key]: value });
  };

  const handleSelectCategory = (cat: QrCategory) => {
    onChangeForm({ ...form, category: cat });
    setProjectName(QR_CATEGORY_META[cat].sampleTitle);
  };

  const handleImageFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onToast('error', 'Unsupported file', 'Please select a PNG, JPEG, WebP, or SVG image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateField('imageHostedDataUrl', String(reader.result || ''));
      onToast(
        'info',
        'Image preview loaded locally',
        'Remember: QR codes store a hosted public image URL rather than raw binary image bytes.'
      );
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!validation.valid) {
      onToast('error', 'Validation required', validation.error);
      return;
    }
    setSaving(true);
    try {
      const saved = await onSaveProject(
        projectName.trim() || QR_CATEGORY_META[form.category].sampleTitle,
        payload,
        thumbnailUrl
      );
      if (saved) {
        onToast('success', 'QR Project Saved', 'Synced securely to your cloud account.');
      }
    } catch (err) {
      onToast(
        'error',
        'Save Failed',
        err instanceof Error ? err.message : 'Unable to save project.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: ExportFormat, size: number) => {
    if (!validation.valid) {
      onToast('error', 'Cannot export invalid QR data', validation.error);
      return;
    }
    const title = projectName.trim() || QR_CATEGORY_META[form.category].sampleTitle;
    await exportQrCode(payload, design, format, title, size);
    await onRecordDownload(title, payload, format);
    onToast('success', `Downloaded ${format}`, `${title} exported cleanly.`);
  };

  const handleCopyPayload = () => {
    if (!payload) return;
    navigator.clipboard.writeText(payload);
    onToast('info', 'Copied payload', 'Encoded QR string copied to clipboard.');
  };

  const handleCopyImage = async (size: number) => {
    if (!validation.valid) return;
    try {
      const blob = await renderQrPngBlob(payload, design, size);
      await copyPngBlobToClipboard(blob);
      onToast('success', 'PNG Copied to Clipboard', 'Paste directly into docs, slides, or chat.');
    } catch (err) {
      onToast(
        'error',
        'Clipboard Copy Unavailable',
        err instanceof Error ? err.message : 'Download PNG instead.'
      );
    }
  };

  const handleLoadSampleCategory = () => {
    const defaults = createDefaultQrFormState();
    onChangeForm({ ...defaults, category: form.category });
    setProjectName(QR_CATEGORY_META[form.category].sampleTitle);
    onToast('info', 'Sample Loaded', `Loaded sample fields for ${QR_CATEGORY_META[form.category].label}.`);
  };

  const handleClearCategory = () => {
    const cleared: QrFormState = { ...form };
    switch (form.category) {
      case 'website': cleared.websiteUrl = ''; break;
      case 'text': cleared.textContent = ''; break;
      case 'phone': cleared.phoneNumber = ''; break;
      case 'whatsapp': cleared.whatsappPhone = ''; cleared.whatsappMessage = ''; break;
      case 'sms': cleared.smsPhone = ''; cleared.smsMessage = ''; break;
      case 'email': cleared.emailAddress = ''; cleared.emailSubject = ''; cleared.emailBody = ''; break;
      case 'wifi': cleared.wifiSsid = ''; cleared.wifiPassword = ''; break;
      case 'contact':
        cleared.contactFirstName = '';
        cleared.contactLastName = '';
        cleared.contactPhone = '';
        cleared.contactEmail = '';
        cleared.contactCompany = '';
        cleared.contactWebsite = '';
        cleared.contactAddress = '';
        break;
      case 'upi': cleared.upiId = ''; cleared.upiPayeeName = ''; cleared.upiAmount = ''; cleared.upiNote = ''; break;
      case 'paytm': cleared.paytmUpiId = ''; cleared.paytmPayeeName = ''; cleared.paytmAmount = ''; cleared.paytmNote = ''; break;
      case 'location': cleared.locationLat = ''; cleared.locationLng = ''; cleared.locationMapsUrl = ''; break;
      case 'event': cleared.eventTitle = ''; cleared.eventLocation = ''; cleared.eventDescription = ''; break;
      case 'image': cleared.imageUrl = ''; cleared.imageHostedDataUrl = undefined; break;
      case 'social': cleared.socialUrl = ''; break;
      case 'custom': cleared.customPayload = ''; break;
    }
    onChangeForm(cleared);
  };

  const inputCls =
    'w-full bg-[#100d1b] border border-violet-400/25 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500';
  const labelCls = 'block text-xs font-medium text-slate-300 mb-1.5';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Create QR Code</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Choose from 15 structured QR categories with live validation and studio customization.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenDesignStudio}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 transition-all whitespace-nowrap self-start"
        >
          <Palette className="w-4 h-4" />
          Customize in Design Studio
        </button>
      </div>

      {/* Category Selector Grid */}
      <div
        role="tablist"
        aria-label="QR Code Categories"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2"
      >
        {ALL_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const active = form.category === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectCategory(cat)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-r from-violet-600/35 to-pink-500/25 border border-violet-400/50 text-white shadow-sm'
                  : 'bg-white/[0.03] border border-white/10 text-slate-300 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-pink-400' : 'text-violet-400'}`} />
              <span className="truncate">{QR_CATEGORY_META[cat].label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Split Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Area */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                {QR_CATEGORY_META[form.category].label}
              </h2>
              <p className="text-xs text-slate-400">{QR_CATEGORY_META[form.category].shortDesc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLoadSampleCategory}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] border border-white/10 text-violet-300 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Load Sample
              </button>
              <button
                type="button"
                onClick={handleClearCategory}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>

          {/* Project Title */}
          <div>
            <label htmlFor="qr-project-name" className={labelCls}>
              Project Name
            </label>
            <input
              id="qr-project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Launch Campaign QR"
              className={inputCls}
            />
          </div>

          {/* Category-Specific Fields */}
          {form.category === 'website' && (
            <div>
              <label htmlFor="qr-website-url" className={labelCls}>
                Website or Landing Page URL
              </label>
              <input
                id="qr-website-url"
                type="url"
                value={form.websiteUrl}
                onChange={(e) => updateField('websiteUrl', e.target.value)}
                placeholder="https://example.com"
                className={inputCls}
              />
            </div>
          )}

          {form.category === 'text' && (
            <div>
              <label htmlFor="qr-text-content" className={labelCls}>
                Custom Text / Notes
              </label>
              <textarea
                id="qr-text-content"
                rows={4}
                value={form.textContent}
                onChange={(e) => updateField('textContent', e.target.value)}
                placeholder="Enter notes, instructions, or message..."
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
                {form.textContent.length} characters
              </p>
            </div>
          )}

          {form.category === 'phone' && (
            <div>
              <label htmlFor="qr-phone-number" className={labelCls}>
                Phone Number (with country code)
              </label>
              <input
                id="qr-phone-number"
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => updateField('phoneNumber', e.target.value)}
                placeholder="+14155550198"
                className={inputCls}
              />
            </div>
          )}

          {form.category === 'whatsapp' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="qr-wa-phone" className={labelCls}>
                  WhatsApp Number (country code + digits, no spaces)
                </label>
                <input
                  id="qr-wa-phone"
                  type="tel"
                  value={form.whatsappPhone}
                  onChange={(e) => updateField('whatsappPhone', e.target.value)}
                  placeholder="919876543210"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="qr-wa-msg" className={labelCls}>
                  Pre-filled WhatsApp Message (Optional)
                </label>
                <textarea
                  id="qr-wa-msg"
                  rows={3}
                  value={form.whatsappMessage}
                  onChange={(e) => updateField('whatsappMessage', e.target.value)}
                  placeholder="Hello! I would like to inquire about..."
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {form.category === 'sms' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="qr-sms-phone" className={labelCls}>
                  Recipient Phone Number
                </label>
                <input
                  id="qr-sms-phone"
                  type="tel"
                  value={form.smsPhone}
                  onChange={(e) => updateField('smsPhone', e.target.value)}
                  placeholder="+14155550198"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="qr-sms-msg" className={labelCls}>
                  Pre-filled SMS Message
                </label>
                <textarea
                  id="qr-sms-msg"
                  rows={3}
                  value={form.smsMessage}
                  onChange={(e) => updateField('smsMessage', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {form.category === 'email' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="qr-email-addr" className={labelCls}>
                  Recipient Email Address
                </label>
                <input
                  id="qr-email-addr"
                  type="email"
                  value={form.emailAddress}
                  onChange={(e) => updateField('emailAddress', e.target.value)}
                  placeholder="hello@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="qr-email-subject" className={labelCls}>
                  Subject Line
                </label>
                <input
                  id="qr-email-subject"
                  type="text"
                  value={form.emailSubject}
                  onChange={(e) => updateField('emailSubject', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="qr-email-body" className={labelCls}>
                  Pre-filled Email Body
                </label>
                <textarea
                  id="qr-email-body"
                  rows={3}
                  value={form.emailBody}
                  onChange={(e) => updateField('emailBody', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {form.category === 'wifi' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="qr-wifi-ssid" className={labelCls}>
                  Network Name (SSID)
                </label>
                <input
                  id="qr-wifi-ssid"
                  type="text"
                  value={form.wifiSsid}
                  onChange={(e) => updateField('wifiSsid', e.target.value)}
                  placeholder="Office_Guest_5G"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="qr-wifi-sec" className={labelCls}>
                    Security Type
                  </label>
                  <select
                    id="qr-wifi-sec"
                    value={form.wifiSecurity}
                    onChange={(e) =>
                      updateField('wifiSecurity', e.target.value as QrFormState['wifiSecurity'])
                    }
                    className={inputCls}
                  >
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">Open (No Password)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="qr-wifi-pass" className={labelCls}>
                    Password
                  </label>
                  <input
                    id="qr-wifi-pass"
                    type="text"
                    disabled={form.wifiSecurity === 'nopass'}
                    value={form.wifiPassword}
                    onChange={(e) => updateField('wifiPassword', e.target.value)}
                    className={`${inputCls} disabled:opacity-45`}
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.wifiHidden}
                  onChange={(e) => updateField('wifiHidden', e.target.checked)}
                  className="rounded border-violet-400/40 bg-[#100d1b] text-violet-600 focus:ring-violet-500"
                />
                Hidden SSID network
              </label>
            </div>
          )}

          {form.category === 'contact' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="qr-c-first" className={labelCls}>
                  First Name
                </label>
                <input
                  id="qr-c-first"
                  type="text"
                  value={form.contactFirstName}
                  onChange={(e) => updateField('contactFirstName', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="qr-c-last" className={labelCls}>
                  Last Name
                </label>
                <input
                  id="qr-c-last"
                  type="text"
                  value={form.contactLastName}
                  onChange={(e) => updateField('contactLastName', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="qr-c-phone" className={labelCls}>
                  Phone Number
                </label>
                <input
                  id="qr-c-phone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => updateField('contactPhone', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="qr-c-email" className={labelCls}>
                  Email
                </label>
                <input
                  id="qr-c-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="qr-c-company" className={labelCls}>
                  Company
                </label>
                <input
                  id="qr-c-company"
                  type="text"
                  value={form.contactCompany}
                  onChange={(e) => updateField('contactCompany', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="qr-c-web" className={labelCls}>
                  Website
                </label>
                <input
                  id="qr-c-web"
                  type="url"
                  value={form.contactWebsite}
                  onChange={(e) => updateField('contactWebsite', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="qr-c-addr" className={labelCls}>
                  Address
                </label>
                <input
                  id="qr-c-addr"
                  type="text"
                  value={form.contactAddress}
                  onChange={(e) => updateField('contactAddress', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {form.category === 'upi' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="qr-upi-id" className={labelCls}>
                    UPI ID (VPA)
                  </label>
                  <input
                    id="qr-upi-id"
                    type="text"
                    value={form.upiId}
                    onChange={(e) => updateField('upiId', e.target.value)}
                    placeholder="merchant@okicici"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="qr-upi-name" className={labelCls}>
                    Payee Name
                  </label>
                  <input
                    id="qr-upi-name"
                    type="text"
                    value={form.upiPayeeName}
                    onChange={(e) => updateField('upiPayeeName', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="qr-upi-amt" className={labelCls}>
                    Amount (Optional)
                  </label>
                  <input
                    id="qr-upi-amt"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.upiAmount}
                    onChange={(e) => updateField('upiAmount', e.target.value)}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="qr-upi-curr" className={labelCls}>
                    Currency
                  </label>
                  <input
                    id="qr-upi-curr"
                    type="text"
                    value={form.upiCurrency}
                    onChange={(e) => updateField('upiCurrency', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="qr-upi-note" className={labelCls}>
                  Payment Note
                </label>
                <input
                  id="qr-upi-note"
                  type="text"
                  value={form.upiNote}
                  onChange={(e) => updateField('upiNote', e.target.value)}
                  className={inputCls}
                />
              </div>
              <p className="text-xs text-slate-400 flex items-start gap-2 bg-white/[0.03] p-3 rounded-xl border border-white/10">
                <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                QR generation encodes a standard UPI URI. It does not process, settle, or verify payments automatically.
              </p>
            </div>
          )}

          {form.category === 'paytm' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="qr-paytm-id" className={labelCls}>
                    Paytm / UPI Compatible VPA
                  </label>
                  <input
                    id="qr-paytm-id"
                    type="text"
                    value={form.paytmUpiId}
                    onChange={(e) => updateField('paytmUpiId', e.target.value)}
                    placeholder="9876543210@paytm"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="qr-paytm-name" className={labelCls}>
                    Payee Name
                  </label>
                  <input
                    id="qr-paytm-name"
                    type="text"
                    value={form.paytmPayeeName}
                    onChange={(e) => updateField('paytmPayeeName', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="qr-paytm-amt" className={labelCls}>
                    Amount INR (Optional)
                  </label>
                  <input
                    id="qr-paytm-amt"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.paytmAmount}
                    onChange={(e) => updateField('paytmAmount', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="qr-paytm-note" className={labelCls}>
                    Payment Note
                  </label>
                  <input
                    id="qr-paytm-note"
                    type="text"
                    value={form.paytmNote}
                    onChange={(e) => updateField('paytmNote', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 flex items-start gap-2 bg-white/[0.03] p-3 rounded-xl border border-white/10">
                <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                Generates a standard compatible UPI payment URI for your VPA. Official Paytm-verified merchant standees require direct Paytm Business provider integration.
              </p>
            </div>
          )}

          {form.category === 'location' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="qr-loc-lat" className={labelCls}>
                    Latitude
                  </label>
                  <input
                    id="qr-loc-lat"
                    type="text"
                    value={form.locationLat}
                    onChange={(e) => updateField('locationLat', e.target.value)}
                    placeholder="12.9716"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="qr-loc-lng" className={labelCls}>
                    Longitude
                  </label>
                  <input
                    id="qr-loc-lng"
                    type="text"
                    value={form.locationLng}
                    onChange={(e) => updateField('locationLng', e.target.value)}
                    placeholder="77.5946"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="qr-loc-url" className={labelCls}>
                  Or Google Maps Share URL (Overrides Coordinates)
                </label>
                <input
                  id="qr-loc-url"
                  type="url"
                  value={form.locationMapsUrl}
                  onChange={(e) => updateField('locationMapsUrl', e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {form.category === 'event' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="qr-ev-title" className={labelCls}>
                  Event Title
                </label>
                <input
                  id="qr-ev-title"
                  type="text"
                  value={form.eventTitle}
                  onChange={(e) => updateField('eventTitle', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="qr-ev-loc" className={labelCls}>
                  Location
                </label>
                <input
                  id="qr-ev-loc"
                  type="text"
                  value={form.eventLocation}
                  onChange={(e) => updateField('eventLocation', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="qr-ev-start" className={labelCls}>
                    Start Date & Time
                  </label>
                  <input
                    id="qr-ev-start"
                    type="datetime-local"
                    value={form.eventStart}
                    onChange={(e) => updateField('eventStart', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="qr-ev-end" className={labelCls}>
                    End Date & Time
                  </label>
                  <input
                    id="qr-ev-end"
                    type="datetime-local"
                    value={form.eventEnd}
                    onChange={(e) => updateField('eventEnd', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="qr-ev-desc" className={labelCls}>
                  Description
                </label>
                <textarea
                  id="qr-ev-desc"
                  rows={2}
                  value={form.eventDescription}
                  onChange={(e) => updateField('eventDescription', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {form.category === 'image' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="qr-img-url" className={labelCls}>
                  Publicly Accessible Image URL (HTTPS)
                </label>
                <input
                  id="qr-img-url"
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => updateField('imageUrl', e.target.value)}
                  placeholder="https://cdn.example.com/menu-poster.png"
                  className={inputCls}
                />
              </div>
              <div className="rounded-xl border border-dashed border-violet-400/35 p-4 bg-white/[0.02]">
                <label className="flex flex-col items-center gap-2 cursor-pointer text-center">
                  <Upload className="w-5 h-5 text-violet-400" />
                  <span className="text-xs font-medium text-slate-200">
                    Optional: Preview a local image file before hosting
                  </span>
                  <span className="text-[11px] text-slate-400">
                    An Image QR code encodes a hosted image URL — standard QR codes cannot store full photo files inside the matrix itself.
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageFileSelect(f);
                    }}
                  />
                </label>
                {form.imageHostedDataUrl && (
                  <div className="mt-3 flex items-center gap-3 pt-3 border-t border-white/10">
                    <img
                      src={form.imageHostedDataUrl}
                      alt="Local image preview"
                      className="w-14 h-14 object-cover rounded-lg border border-white/15"
                    />
                    <div className="text-xs text-slate-300">
                      <p className="font-medium">Local preview attached</p>
                      <p className="text-[11px] text-slate-400">
                        Upload this asset to your web host or CDN and paste its public URL above.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {form.category === 'social' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="qr-soc-plat" className={labelCls}>
                  Platform
                </label>
                <select
                  id="qr-soc-plat"
                  value={form.socialPlatform}
                  onChange={(e) =>
                    updateField('socialPlatform', e.target.value as QrFormState['socialPlatform'])
                  }
                  className={inputCls}
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="youtube">YouTube</option>
                  <option value="telegram">Telegram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="x">X (Twitter)</option>
                  <option value="other">Other URL</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="qr-soc-url" className={labelCls}>
                  Profile URL or @Handle
                </label>
                <input
                  id="qr-soc-url"
                  type="text"
                  value={form.socialUrl}
                  onChange={(e) => updateField('socialUrl', e.target.value)}
                  placeholder="https://instagram.com/yourbrand or @yourbrand"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {form.category === 'custom' && (
            <div>
              <label htmlFor="qr-custom-payload" className={labelCls}>
                Raw Text or Supported URI Scheme
              </label>
              <textarea
                id="qr-custom-payload"
                rows={4}
                value={form.customPayload}
                onChange={(e) => updateField('customPayload', e.target.value)}
                placeholder="https://..., otpauth://..., geo:..., or custom text"
                className={`${inputCls} font-mono text-xs`}
              />
            </div>
          )}

          {/* Validation Output */}
          {!validation.valid && (
            <div
              data-testid="qr-validation-error"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/35 text-xs text-rose-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{validation.error}</span>
            </div>
          )}

          {validation.valid && (
            <div className="rounded-xl bg-[#0c0916] border border-white/10 p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-slate-400">Encoded QR Payload</p>
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  {payload.length} / 2953 bytes
                </span>
              </div>
              <p
                data-testid="qr-encoded-payload"
                className="text-xs font-mono text-violet-200 break-all"
              >
                {payload}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={!validation.valid || saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.08] border border-violet-400/35 text-white hover:bg-violet-600/30 disabled:opacity-45 transition-all"
            >
              <BookmarkPlus className="w-4 h-4 text-pink-300" />
              {saving ? 'Saving...' : 'Save Project'}
            </button>
            <button
              type="button"
              onClick={onOpenDesignStudio}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-violet-300 hover:text-white transition-colors"
            >
              <Palette className="w-4 h-4" />
              Style Colors, Logo & Frame
            </button>
          </div>
        </div>

        {/* Live Preview & Export Column */}
        <div className="lg:col-span-5 glass-panel-elevated rounded-2xl p-6 space-y-5 sticky top-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-white">Live QR Preview</h2>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              ECC {design.ecc} · {design.dotStyle}
            </span>
          </div>

          <QrPreviewCanvas
            payload={payload || 'https://ultimatebarcodestudio.app'}
            design={design}
            previewSize={248}
            onThumbnailReady={setThumbnailUrl}
          />

          <ExportBar
            defaultSize={defaultExportSize}
            disabled={!validation.valid}
            onExport={handleExport}
            onCopyPayload={handleCopyPayload}
            onCopyImage={handleCopyImage}
            copyLabel="Copy QR Data"
          />
        </div>
      </div>
    </div>
  );
};
