export type DecodedPayloadType =
  | 'url'
  | 'upi'
  | 'wifi'
  | 'vcard'
  | 'email'
  | 'phone'
  | 'sms'
  | 'geo'
  | 'product-code'
  | 'text';

export interface DecodedAnalysis {
  type: DecodedPayloadType;
  typeLabel: string;
  raw: string;
  details: { label: string; value: string }[];
  safeActionUrl?: string;
}

export function classifyDecodedPayload(rawText: string): DecodedAnalysis {
  const raw = rawText.trim();

  if (/^upi:\/\/pay/i.test(raw)) {
    const queryIdx = raw.indexOf('?');
    const params = new URLSearchParams(queryIdx >= 0 ? raw.slice(queryIdx + 1) : '');
    const details: { label: string; value: string }[] = [];
    if (params.get('pa')) details.push({ label: 'UPI ID (VPA)', value: params.get('pa')! });
    if (params.get('pn')) details.push({ label: 'Payee Name', value: params.get('pn')! });
    if (params.get('am')) details.push({ label: 'Amount', value: `${params.get('cu') || 'INR'} ${params.get('am')}` });
    if (params.get('tn')) details.push({ label: 'Note', value: params.get('tn')! });
    return { type: 'upi', typeLabel: 'UPI Payment URI', raw, details };
  }

  if (/^WIFI:/i.test(raw)) {
    const ssidMatch = raw.match(/S:([^;]*)/i);
    const secMatch = raw.match(/T:([^;]*)/i);
    const hiddenMatch = raw.match(/H:([^;]*)/i);
    const details: { label: string; value: string }[] = [];
    if (ssidMatch?.[1]) details.push({ label: 'Network (SSID)', value: ssidMatch[1] });
    if (secMatch?.[1]) details.push({ label: 'Security', value: secMatch[1] });
    if (hiddenMatch?.[1]) details.push({ label: 'Hidden Network', value: hiddenMatch[1] });
    return { type: 'wifi', typeLabel: 'WiFi Network Configuration', raw, details };
  }

  if (/^BEGIN:VCARD/i.test(raw)) {
    const fn = raw.match(/FN:([^\r\n]+)/i)?.[1];
    const tel = raw.match(/TEL[^:]*:([^\r\n]+)/i)?.[1];
    const email = raw.match(/EMAIL[^:]*:([^\r\n]+)/i)?.[1];
    const org = raw.match(/ORG:([^\r\n]+)/i)?.[1];
    const details: { label: string; value: string }[] = [];
    if (fn) details.push({ label: 'Name', value: fn });
    if (tel) details.push({ label: 'Phone', value: tel });
    if (email) details.push({ label: 'Email', value: email });
    if (org) details.push({ label: 'Organization', value: org });
    return { type: 'vcard', typeLabel: 'vCard Contact', raw, details };
  }

  if (/^https?:\/\//i.test(raw)) {
    let host = raw;
    try {
      host = new URL(raw).hostname;
    } catch {
      // keep raw
    }
    return {
      type: 'url',
      typeLabel: 'Website URL',
      raw,
      details: [{ label: 'Domain', value: host }],
      safeActionUrl: raw,
    };
  }

  if (/^mailto:/i.test(raw)) {
    return {
      type: 'email',
      typeLabel: 'Email Link',
      raw,
      details: [{ label: 'Recipient', value: raw.replace(/^mailto:/i, '').split('?')[0] }],
    };
  }

  if (/^tel:/i.test(raw)) {
    return {
      type: 'phone',
      typeLabel: 'Phone Number',
      raw,
      details: [{ label: 'Number', value: raw.replace(/^tel:/i, '') }],
    };
  }

  if (/^smsto:|^sms:/i.test(raw)) {
    return {
      type: 'sms',
      typeLabel: 'SMS Message',
      raw,
      details: [{ label: 'Target', value: raw.replace(/^smsto:|^sms:/i, '').split(':')[0] }],
    };
  }

  if (/^geo:/i.test(raw)) {
    return {
      type: 'geo',
      typeLabel: 'Geographic Coordinates',
      raw,
      details: [{ label: 'Coordinates', value: raw.replace(/^geo:/i, '') }],
    };
  }

  if (/^\d{8}$|^\d{12,14}$/.test(raw)) {
    return {
      type: 'product-code',
      typeLabel: 'Numeric Product Identifier',
      raw,
      details: [{ label: 'Digits', value: `${raw.length} digits` }],
    };
  }

  return {
    type: 'text',
    typeLabel: 'Plain Text / Custom Data',
    raw,
    details: [{ label: 'Character Count', value: `${raw.length}` }],
  };
}
