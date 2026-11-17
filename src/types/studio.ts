export type NavSection =
  | 'dashboard'
  | 'create-qr'
  | 'create-barcode'
  | 'upi-studio'
  | 'design-studio'
  | 'saved'
  | 'templates'
  | 'history'
  | 'settings'
  | 'help'
  | 'account'
  | 'batch-scan';

export type QrCategory =
  | 'website'
  | 'text'
  | 'phone'
  | 'whatsapp'
  | 'sms'
  | 'email'
  | 'wifi'
  | 'contact'
  | 'upi'
  | 'paytm'
  | 'location'
  | 'event'
  | 'image'
  | 'social'
  | 'custom';

export type DotStyle =
  | 'square'
  | 'dots'
  | 'rounded'
  | 'extra-rounded'
  | 'classy'
  | 'classy-rounded';

export type CornerSquareStyle = 'square' | 'dot' | 'extra-rounded';
export type CornerDotStyle = 'square' | 'dot';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
export type FrameStyle =
  | 'none'
  | 'clean-card'
  | 'bottom-banner'
  | 'top-badge'
  | 'neon-violet'
  | 'luxury-gold'
  | 'merchant-stand';

export type GradientType = 'linear' | 'radial';

export interface QrGradientConfig {
  enabled: boolean;
  type: GradientType;
  rotation: number; // degrees
  colorStops: [string, string];
}

export interface QRDesignConfig {
  foregroundColor: string;
  backgroundColor: string;
  transparentBg: boolean;
  gradient: QrGradientConfig;
  dotStyle: DotStyle;
  cornerSquareStyle: CornerSquareStyle;
  cornerDotStyle: CornerDotStyle;
  cornerSquareColor?: string;
  cornerDotColor?: string;
  frameStyle: FrameStyle;
  frameColor: string;
  frameTextColor: string;
  frameText: string;
  caption: string;
  size: number;
  margin: number;
  ecc: ErrorCorrectionLevel;
  logoDataUrl?: string;
  logoSize: number; // 0.15 to 0.45
  logoMargin: number;
  logoHideBackgroundDots: boolean;
  logoBackgroundColor?: string;
  presetId?: string;
}

export type BarcodeStandard =
  | 'code128'
  | 'code39'
  | 'code93'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'upce'
  | 'itf14'
  | 'interleaved2of5'
  | 'codabar'
  | 'isbn10'
  | 'isbn13'
  | 'gs1-128';

export interface BarcodeConfig {
  standard: BarcodeStandard;
  value: string;
  scale: number; // 1 to 6
  height: number; // mm in bwip-js (8 to 40)
  includeText: boolean;
  textSize: number; // 8 to 18
  barColor: string;
  backgroundColor: string;
  transparentBg: boolean;
  padding: number;
}

export interface QrFormState {
  category: QrCategory;
  websiteUrl: string;
  textContent: string;
  phoneNumber: string;
  whatsappPhone: string;
  whatsappMessage: string;
  smsPhone: string;
  smsMessage: string;
  emailAddress: string;
  emailSubject: string;
  emailBody: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiSecurity: 'WPA' | 'WEP' | 'nopass';
  wifiHidden: boolean;
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  contactEmail: string;
  contactCompany: string;
  contactWebsite: string;
  contactAddress: string;
  upiId: string;
  upiPayeeName: string;
  upiAmount: string;
  upiNote: string;
  upiCurrency: string;
  paytmUpiId: string;
  paytmPayeeName: string;
  paytmAmount: string;
  paytmNote: string;
  locationLat: string;
  locationLng: string;
  locationMapsUrl: string;
  eventTitle: string;
  eventLocation: string;
  eventStart: string;
  eventEnd: string;
  eventDescription: string;
  imageUrl: string;
  imageHostedDataUrl?: string;
  socialPlatform: 'instagram' | 'facebook' | 'youtube' | 'telegram' | 'linkedin' | 'x' | 'other';
  socialUrl: string;
  customPayload: string;
}

export interface UpiPosterConfig {
  upiId: string;
  payeeName: string;
  shopName: string;
  amount: string;
  note: string;
  template: 'classic-violet' | 'merchant-gold' | 'minimal-white' | 'pink-modern';
  showAppsStrip: boolean;
}

export interface SavedProject {
  id: string;
  name: string;
  kind: 'qr' | 'barcode';
  category: QrCategory | BarcodeStandard;
  payload: string;
  qrForm?: Partial<QrFormState>;
  qrDesign?: QRDesignConfig;
  barcodeConfig?: BarcodeConfig;
  favorite: boolean;
  thumbnailDataUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryEntry {
  id: string;
  action: 'created' | 'downloaded' | 'updated';
  kind: 'qr' | 'barcode';
  title: string;
  category: string;
  payload: string;
  format?: 'PNG' | 'SVG' | 'JPEG' | 'PDF';
  timestamp: number;
  projectSnapshot?: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt' | 'favorite'>;
}

export interface AppSettings {
  defaultExportFormat: 'PNG' | 'SVG' | 'JPEG' | 'PDF';
  defaultExportSize: number;
  defaultEcc: ErrorCorrectionLevel;
  defaultMargin: number;
  adsenseEnabled: boolean;
  adsensePublisherId: string;
  adsenseSlots: {
    header: boolean;
    sidebar: boolean;
    content: boolean;
  };
}

export type ExportFormat = 'PNG' | 'SVG' | 'JPEG' | 'PDF';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}
