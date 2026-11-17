import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQrPayload,
  buildUpiUri,
  createDefaultQrFormState,
  validateQrForm,
} from './qrPayload';

test('website QR normalizes URL and validates correctly', () => {
  const form = createDefaultQrFormState();
  form.category = 'website';
  form.websiteUrl = 'example.com/launch';
  assert.equal(validateQrForm(form).valid, true);
  assert.equal(buildQrPayload(form), 'https://example.com/launch');

  form.websiteUrl = 'not-a-domain';
  assert.equal(validateQrForm(form).valid, false);
});

test('UPI URI formats standard parameters cleanly', () => {
  const uri = buildUpiUri({
    upiId: 'merchant@okicici',
    payeeName: 'Apex Coffee Roasters',
    amount: '249.50',
    currency: 'INR',
    note: 'Order #104',
  });
  assert.equal(
    uri,
    'upi://pay?pa=merchant%40okicici&pn=Apex%20Coffee%20Roasters&am=249.50&cu=INR&tn=Order%20%23104'
  );
});

test('WiFi QR string escapes special characters and respects hidden flag', () => {
  const form = createDefaultQrFormState();
  form.category = 'wifi';
  form.wifiSsid = 'Office;Net';
  form.wifiPassword = 'pass:word';
  form.wifiSecurity = 'WPA';
  form.wifiHidden = true;

  const payload = buildQrPayload(form);
  assert.equal(payload, 'WIFI:T:WPA;S:Office\\;Net;P:pass\\:word;H:true;;');
});

test('Contact vCard 3.0 includes required fields', () => {
  const form = createDefaultQrFormState();
  form.category = 'contact';
  const vcard = buildQrPayload(form);
  assert.ok(vcard.startsWith('BEGIN:VCARD\nVERSION:3.0'));
  assert.ok(vcard.includes('FN:Aarav Mehta'));
  assert.ok(vcard.includes('END:VCARD'));
});

test('Image QR rejects empty URL even if file upload was local-only', () => {
  const form = createDefaultQrFormState();
  form.category = 'image';
  form.imageUrl = '';
  form.imageHostedDataUrl = 'data:image/png;base64,abc';
  const res = validateQrForm(form);
  assert.equal(res.valid, false);
  assert.ok(res.error?.includes('public HTTPS image URL'));
});
