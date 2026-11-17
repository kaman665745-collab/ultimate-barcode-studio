import { QrCategory, QrFormState } from '../types/studio';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export function sanitizeText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

export function normalizeUrl(raw: string): string {
  const cleaned = sanitizeText(raw);
  if (!cleaned) return '';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(cleaned)) {
    return cleaned;
  }
  return `https://${cleaned}`;
}

export function isValidHttpUrl(raw: string): boolean {
  try {
    const normalized = normalizeUrl(raw);
    const parsed = new URL(normalized);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.hostname.includes('.')
    );
  } catch {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^+\d]/g, '');
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 16;
}

export function isValidUpiId(upiId: string): boolean {
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/.test(upiId.trim());
}

export function escapeWifiField(val: string): string {
  return val.replace(/([\\;,:""])/g, '\\$1');
}

export function escapeVCardField(val: string): string {
  return val.replace(/\r?\n/g, '\\n').replace(/([,;\\])/g, '\\$1');
}

export function formatIcsDate(isoDateTime: string): string {
  if (!isoDateTime) return '';
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

export function buildUpiUri(params: {
  upiId: string;
  payeeName: string;
  amount?: string;
  currency?: string;
  note?: string;
}): string {
  const pa = sanitizeText(params.upiId);
  const pn = sanitizeText(params.payeeName);
  const am = sanitizeText(params.amount || '');
  const cu = sanitizeText(params.currency || 'INR') || 'INR';
  const tn = sanitizeText(params.note || '');

  const queryParts: string[] = [];
  queryParts.push(`pa=${encodeURIComponent(pa)}`);
  queryParts.push(`pn=${encodeURIComponent(pn)}`);
  if (am && !Number.isNaN(Number(am)) && Number(am) > 0) {
    queryParts.push(`am=${encodeURIComponent(Number(am).toFixed(2).replace(/\.00$/, ''))}`);
  }
  queryParts.push(`cu=${encodeURIComponent(cu)}`);
  if (tn) {
    queryParts.push(`tn=${encodeURIComponent(tn)}`);
  }

  return `upi://pay?${queryParts.join('&')}`;
}

export function buildVCard(form: QrFormState): string {
  const first = sanitizeText(form.contactFirstName);
  const last = sanitizeText(form.contactLastName);
  const fullName = [first, last].filter(Boolean).join(' ');
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCardField(last)};${escapeVCardField(first)};;;`,
    `FN:${escapeVCardField(fullName)}`,
  ];

  if (sanitizeText(form.contactCompany)) {
    lines.push(`ORG:${escapeVCardField(sanitizeText(form.contactCompany))}`);
  }
  if (sanitizeText(form.contactPhone)) {
    lines.push(`TEL;TYPE=CELL:${normalizePhone(form.contactPhone)}`);
  }
  if (sanitizeText(form.contactEmail)) {
    lines.push(`EMAIL:${sanitizeText(form.contactEmail)}`);
  }
  if (sanitizeText(form.contactWebsite)) {
    lines.push(`URL:${normalizeUrl(form.contactWebsite)}`);
  }
  if (sanitizeText(form.contactAddress)) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVCardField(sanitizeText(form.contactAddress))};;;;`);
  }

  lines.push('END:VCARD');
  return lines.join('\n');
}

export function buildWifiString(form: QrFormState): string {
  const ssid = escapeWifiField(sanitizeText(form.wifiSsid));
  const security = form.wifiSecurity;
  const pass = security === 'nopass' ? '' : escapeWifiField(form.wifiPassword);
  const hidden = form.wifiHidden ? 'H:true;' : '';
  return `WIFI:T:${security};S:${ssid};P:${pass};${hidden};`;
}

export function buildEventIcs(form: QrFormState): string {
  const title = sanitizeText(form.eventTitle);
  const location = sanitizeText(form.eventLocation);
  const description = sanitizeText(form.eventDescription);
  const dtStart = formatIcsDate(form.eventStart);
  const dtEnd = formatIcsDate(form.eventEnd);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${escapeVCardField(title)}`,
  ];
  if (location) lines.push(`LOCATION:${escapeVCardField(location)}`);
  if (dtStart) lines.push(`DTSTART:${dtStart}`);
  if (dtEnd) lines.push(`DTEND:${dtEnd}`);
  if (description) lines.push(`DESCRIPTION:${escapeVCardField(description)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\n');
}

export function validateQrForm(form: QrFormState): ValidationResult {
  switch (form.category) {
    case 'website': {
      if (!sanitizeText(form.websiteUrl)) {
        return { valid: false, error: 'Enter a website URL to generate a QR code.' };
      }
      if (!isValidHttpUrl(form.websiteUrl)) {
        return { valid: false, error: 'Enter a valid domain or URL (e.g., https://example.com).' };
      }
      return { valid: true };
    }
    case 'text': {
      const txt = sanitizeText(form.textContent);
      if (!txt) return { valid: false, error: 'Enter custom text or notes.' };
      if (txt.length > 2000) {
        return {
          valid: true,
          warning: 'Text is over 2,000 characters; high density may require a larger print size.',
        };
      }
      return { valid: true };
    }
    case 'phone': {
      if (!sanitizeText(form.phoneNumber)) {
        return { valid: false, error: 'Enter a phone number.' };
      }
      if (!isValidPhone(form.phoneNumber)) {
        return { valid: false, error: 'Enter a valid phone number (6–16 digits).' };
      }
      return { valid: true };
    }
    case 'whatsapp': {
      if (!sanitizeText(form.whatsappPhone)) {
        return { valid: false, error: 'Enter a WhatsApp phone number with country code.' };
      }
      if (!isValidPhone(form.whatsappPhone)) {
        return { valid: false, error: 'Enter a valid WhatsApp number (include country code).' };
      }
      return { valid: true };
    }
    case 'sms': {
      if (!sanitizeText(form.smsPhone)) {
        return { valid: false, error: 'Enter a recipient phone number.' };
      }
      if (!isValidPhone(form.smsPhone)) {
        return { valid: false, error: 'Enter a valid phone number (6–16 digits).' };
      }
      return { valid: true };
    }
    case 'email': {
      if (!sanitizeText(form.emailAddress)) {
        return { valid: false, error: 'Enter a recipient email address.' };
      }
      if (!isValidEmail(form.emailAddress)) {
        return { valid: false, error: 'Enter a valid email address (e.g., name@domain.com).' };
      }
      return { valid: true };
    }
    case 'wifi': {
      if (!sanitizeText(form.wifiSsid)) {
        return { valid: false, error: 'Enter the WiFi network name (SSID).' };
      }
      if (form.wifiSecurity !== 'nopass' && form.wifiPassword.length < 4) {
        return { valid: false, error: 'Enter a WiFi password (minimum 4 characters for secured networks).' };
      }
      return { valid: true };
    }
    case 'contact': {
      const hasName = Boolean(sanitizeText(form.contactFirstName) || sanitizeText(form.contactLastName));
      if (!hasName) {
        return { valid: false, error: 'Enter at least a first or last name for the contact card.' };
      }
      if (form.contactEmail && !isValidEmail(form.contactEmail)) {
        return { valid: false, error: 'Contact email format is invalid.' };
      }
      if (form.contactWebsite && !isValidHttpUrl(form.contactWebsite)) {
        return { valid: false, error: 'Contact website URL is invalid.' };
      }
      return { valid: true };
    }
    case 'upi': {
      if (!sanitizeText(form.upiId)) {
        return { valid: false, error: 'Enter a valid UPI ID (e.g., merchant@okicici).' };
      }
      if (!isValidUpiId(form.upiId)) {
        return { valid: false, error: 'UPI ID must follow the handle@bank format.' };
      }
      if (!sanitizeText(form.upiPayeeName)) {
        return { valid: false, error: 'Enter the Payee / Business name.' };
      }
      if (form.upiAmount && (Number.isNaN(Number(form.upiAmount)) || Number(form.upiAmount) < 0)) {
        return { valid: false, error: 'Amount must be a positive number.' };
      }
      return { valid: true };
    }
    case 'paytm': {
      if (!sanitizeText(form.paytmUpiId)) {
        return { valid: false, error: 'Enter a compatible Paytm / UPI VPA (e.g., 9876543210@paytm).' };
      }
      if (!isValidUpiId(form.paytmUpiId)) {
        return { valid: false, error: 'UPI address must follow the handle@provider format.' };
      }
      if (!sanitizeText(form.paytmPayeeName)) {
        return { valid: false, error: 'Enter the Payee name.' };
      }
      return { valid: true };
    }
    case 'location': {
      const mapsUrl = sanitizeText(form.locationMapsUrl);
      if (mapsUrl) {
        if (!isValidHttpUrl(mapsUrl)) {
          return { valid: false, error: 'Google Maps URL is invalid.' };
        }
        return { valid: true };
      }
      const lat = Number(form.locationLat);
      const lng = Number(form.locationLng);
      if (!form.locationLat || !form.locationLng || Number.isNaN(lat) || Number.isNaN(lng)) {
        return { valid: false, error: 'Enter latitude and longitude, or provide a Google Maps URL.' };
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return { valid: false, error: 'Latitude must be -90..90 and longitude -180..180.' };
      }
      return { valid: true };
    }
    case 'event': {
      if (!sanitizeText(form.eventTitle)) {
        return { valid: false, error: 'Enter an event title.' };
      }
      if (!form.eventStart) {
        return { valid: false, error: 'Select an event start date and time.' };
      }
      if (form.eventEnd && new Date(form.eventEnd) < new Date(form.eventStart)) {
        return { valid: false, error: 'Event end date cannot be earlier than start date.' };
      }
      return { valid: true };
    }
    case 'image': {
      const url = sanitizeText(form.imageUrl);
      if (!url) {
        if (form.imageHostedDataUrl) {
          return {
            valid: false,
            error:
              'QR codes cannot reliably hold raw image files directly. Upload to an image host and paste the public HTTPS image URL.',
          };
        }
        return { valid: false, error: 'Enter a publicly accessible image URL (https://...).' };
      }
      if (!isValidHttpUrl(url)) {
        return { valid: false, error: 'Enter a valid public image URL starting with https:// or http://.' };
      }
      return { valid: true };
    }
    case 'social': {
      if (!sanitizeText(form.socialUrl)) {
        return { valid: false, error: 'Enter a social profile URL or username.' };
      }
      if (!isValidHttpUrl(buildSocialUrl(form.socialPlatform, form.socialUrl))) {
        return { valid: false, error: 'Enter a valid social URL or handle.' };
      }
      return { valid: true };
    }
    case 'custom': {
      if (!sanitizeText(form.customPayload)) {
        return { valid: false, error: 'Enter any valid text or supported URI.' };
      }
      return { valid: true };
    }
  }
}

export function buildSocialUrl(
  platform: QrFormState['socialPlatform'],
  rawInput: string
): string {
  const cleaned = sanitizeText(rawInput);
  if (!cleaned) return '';
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  const handle = cleaned.replace(/^@/, '');
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'facebook':
      return `https://facebook.com/${handle}`;
    case 'youtube':
      return `https://youtube.com/@${handle}`;
    case 'telegram':
      return `https://t.me/${handle}`;
    case 'linkedin':
      return `https://linkedin.com/in/${handle}`;
    case 'x':
      return `https://x.com/${handle}`;
    default:
      return normalizeUrl(cleaned);
  }
}

export function buildQrPayload(form: QrFormState): string {
  switch (form.category) {
    case 'website':
      return normalizeUrl(form.websiteUrl);
    case 'text':
      return sanitizeText(form.textContent);
    case 'phone':
      return `tel:${normalizePhone(form.phoneNumber)}`;
    case 'whatsapp': {
      const num = form.whatsappPhone.replace(/\D/g, '');
      const msg = sanitizeText(form.whatsappMessage);
      return msg
        ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/${num}`;
    }
    case 'sms': {
      const num = normalizePhone(form.smsPhone);
      const body = sanitizeText(form.smsMessage);
      return body ? `SMSTO:${num}:${body}` : `SMSTO:${num}`;
    }
    case 'email': {
      const addr = sanitizeText(form.emailAddress);
      const params: string[] = [];
      if (sanitizeText(form.emailSubject)) {
        params.push(`subject=${encodeURIComponent(sanitizeText(form.emailSubject))}`);
      }
      if (sanitizeText(form.emailBody)) {
        params.push(`body=${encodeURIComponent(sanitizeText(form.emailBody))}`);
      }
      return params.length ? `mailto:${addr}?${params.join('&')}` : `mailto:${addr}`;
    }
    case 'wifi':
      return buildWifiString(form);
    case 'contact':
      return buildVCard(form);
    case 'upi':
      return buildUpiUri({
        upiId: form.upiId,
        payeeName: form.upiPayeeName,
        amount: form.upiAmount,
        currency: form.upiCurrency || 'INR',
        note: form.upiNote,
      });
    case 'paytm':
      return buildUpiUri({
        upiId: form.paytmUpiId,
        payeeName: form.paytmPayeeName,
        amount: form.paytmAmount,
        currency: 'INR',
        note: form.paytmNote,
      });
    case 'location': {
      const url = sanitizeText(form.locationMapsUrl);
      if (url) return normalizeUrl(url);
      return `https://maps.google.com/?q=${form.locationLat.trim()},${form.locationLng.trim()}`;
    }
    case 'event':
      return buildEventIcs(form);
    case 'image':
      return normalizeUrl(form.imageUrl);
    case 'social':
      return buildSocialUrl(form.socialPlatform, form.socialUrl);
    case 'custom':
      return sanitizeText(form.customPayload);
  }
}

export const QR_CATEGORY_META: Record<
  QrCategory,
  { label: string; shortDesc: string; sampleTitle: string }
> = {
  website: { label: 'Website URL', shortDesc: 'Links, landing pages & portals', sampleTitle: 'Studio Website' },
  text: { label: 'Plain Text', shortDesc: 'Notes, codes & instructions', sampleTitle: 'Text Snippet' },
  phone: { label: 'Phone Call', shortDesc: 'One-tap direct dial link', sampleTitle: 'Support Line' },
  whatsapp: { label: 'WhatsApp', shortDesc: 'Chat link with pre-filled message', sampleTitle: 'WhatsApp Order' },
  sms: { label: 'SMS Message', shortDesc: 'Pre-addressed text message', sampleTitle: 'SMS Opt-In' },
  email: { label: 'Email', shortDesc: 'Address, subject & body pre-fill', sampleTitle: 'Contact Email' },
  wifi: { label: 'WiFi Access', shortDesc: 'Instant WPA/WEP network join', sampleTitle: 'Guest WiFi' },
  contact: { label: 'Contact vCard', shortDesc: 'Digital business card (vCard 3.0)', sampleTitle: 'Executive vCard' },
  upi: { label: 'UPI Payment', shortDesc: 'Standard Indian UPI payment URI', sampleTitle: 'UPI Checkout' },
  paytm: { label: 'Paytm / VPA', shortDesc: 'Compatible UPI VPA payment link', sampleTitle: 'Paytm UPI Link' },
  location: { label: 'Location / Maps', shortDesc: 'GPS coordinates or Google Maps link', sampleTitle: 'Store Location' },
  event: { label: 'Calendar Event', shortDesc: 'iCalendar (.ics) schedule invite', sampleTitle: 'Launch Event' },
  image: { label: 'Image Link', shortDesc: 'Hosted image URL QR encoder', sampleTitle: 'Hosted Poster' },
  social: { label: 'Social Media', shortDesc: 'Instagram, YouTube, X, LinkedIn', sampleTitle: 'Social Profile' },
  custom: { label: 'Custom URI', shortDesc: 'Any raw text or deep-link URI', sampleTitle: 'Custom Payload' },
};

export function createDefaultQrFormState(): QrFormState {
  return {
    category: 'website',
    websiteUrl: 'https://ultimatebarcodestudio.app',
    textContent: 'Ultimate Barcode Studio — Production QR Sample',
    phoneNumber: '+14155550198',
    whatsappPhone: '919876543210',
    whatsappMessage: 'Hello! I scanned your QR code and would like more details.',
    smsPhone: '+14155550198',
    smsMessage: 'Hi, please send me the brochure.',
    emailAddress: 'hello@example.com',
    emailSubject: 'Inquiry via QR Code',
    emailBody: 'Hello team, reaching out regarding your product.',
    wifiSsid: 'Studio_Guest_5G',
    wifiPassword: 'StudioGuestPassword2026',
    wifiSecurity: 'WPA',
    wifiHidden: false,
    contactFirstName: 'Aarav',
    contactLastName: 'Mehta',
    contactPhone: '+919876543210',
    contactEmail: 'aarav@designlab.example',
    contactCompany: 'DesignLab Collective',
    contactWebsite: 'https://designlab.example',
    contactAddress: '420 Violet Avenue, Bengaluru',
    upiId: 'merchant@okicici',
    upiPayeeName: 'Apex Coffee Roasters',
    upiAmount: '249',
    upiNote: 'Fresh Roast Order',
    upiCurrency: 'INR',
    paytmUpiId: '9876543210@paytm',
    paytmPayeeName: 'Apex Store',
    paytmAmount: '',
    paytmNote: 'Counter Payment',
    locationLat: '12.9716',
    locationLng: '77.5946',
    locationMapsUrl: '',
    eventTitle: 'Product Design Showcase 2026',
    eventLocation: 'Grand Violet Hall, Mumbai',
    eventStart: '2026-12-10T10:00',
    eventEnd: '2026-12-10T18:00',
    eventDescription: 'Live showcase of packaging, retail branding, and scannable systems.',
    imageUrl: 'https://example.com/assets/menu-poster.png',
    socialPlatform: 'instagram',
    socialUrl: 'https://instagram.com/ultimatebarcodestudio',
    customPayload: 'otpauth://totp/StudioDemo?secret=JBSWY3DPEHPK3PXP',
  };
}
