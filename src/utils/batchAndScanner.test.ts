import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BATCH_ITEMS, parseBatchItems } from './batchProcessor';
import { classifyDecodedPayload } from './scannerParser';

test('parseBatchItems parses CSV label/value rows and validates barcode symbologies', () => {
  const input = [
    'Coffee Beans, 4006381333931',
    'Bad EAN, 12345',
    'https://example.com',
  ].join('\n');

  const bcResult = parseBatchItems(input, 'barcode', 'ean13');
  assert.equal(bcResult.items.length, 3);
  assert.equal(bcResult.items[0].label, 'Coffee Beans');
  assert.equal(bcResult.items[0].valid, true);
  assert.equal(bcResult.items[1].valid, false);
  assert.equal(bcResult.items[2].valid, false);

  const qrResult = parseBatchItems('Table 1, https://menu.cafe/t1\nTable 2, https://menu.cafe/t2', 'qr');
  assert.equal(qrResult.items.length, 2);
  assert.equal(qrResult.items[0].valid, true);
  assert.equal(qrResult.items[1].label, 'Table 2');
});

test('parseBatchItems enforces MAX_BATCH_ITEMS cap and reports truncated count', () => {
  const lines = Array.from({ length: MAX_BATCH_ITEMS + 7 }, (_, i) => `Row ${i + 1}, DATA-${i + 1}`).join('\n');
  const res = parseBatchItems(lines, 'qr');
  assert.equal(res.items.length, MAX_BATCH_ITEMS);
  assert.equal(res.truncatedCount, 7);
});

test('classifyDecodedPayload identifies UPI, WiFi, vCard, URL, and numeric GTIN strings', () => {
  const upi = classifyDecodedPayload('upi://pay?pa=cafe@okicici&pn=Apex%20Cafe&am=150.00&cu=INR');
  assert.equal(upi.type, 'upi');
  assert.equal(upi.details[0].value, 'cafe@okicici');

  const wifi = classifyDecodedPayload('WIFI:T:WPA;S:Studio5G;P:pass1234;H:false;;');
  assert.equal(wifi.type, 'wifi');
  assert.equal(wifi.details[0].value, 'Studio5G');

  const vcard = classifyDecodedPayload('BEGIN:VCARD\nVERSION:3.0\nFN:Alex Rivera\nTEL:+14155550198\nEND:VCARD');
  assert.equal(vcard.type, 'vcard');
  assert.equal(vcard.details[0].value, 'Alex Rivera');

  const ean = classifyDecodedPayload('4006381333931');
  assert.equal(ean.type, 'product-code');

  const url = classifyDecodedPayload('https://ultimatebarcodestudio.app/docs');
  assert.equal(url.type, 'url');
  assert.equal(url.safeActionUrl, 'https://ultimatebarcodestudio.app/docs');
});
