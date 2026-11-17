import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeIsbn10CheckChar,
  computeMod10CheckDigit,
  validateAndPrepareBarcode,
} from './barcodeValidator';

test('EAN-13 computes and verifies Mod-10 check digit', () => {
  assert.equal(computeMod10CheckDigit('400638133393'), 1);

  const valid13 = validateAndPrepareBarcode('ean13', '4006381333931');
  assert.equal(valid13.valid, true);
  assert.equal(valid13.normalizedValue, '4006381333931');

  const auto12 = validateAndPrepareBarcode('ean13', '400638133393');
  assert.equal(auto12.valid, true);
  assert.equal(auto12.normalizedValue, '4006381333931');

  const badCheck = validateAndPrepareBarcode('ean13', '4006381333939');
  assert.equal(badCheck.valid, false);
  assert.ok(badCheck.error?.includes('Expected 1'));
});

test('UPC-A validates 11 and 12 digit inputs', () => {
  const res = validateAndPrepareBarcode('upca', '036000291452');
  assert.equal(res.valid, true);

  const bad = validateAndPrepareBarcode('upca', '036000291450');
  assert.equal(bad.valid, false);
});

test('ISBN-10 and ISBN-13 validate check digits and convert ISBN-10 to bookland EAN', () => {
  assert.equal(computeIsbn10CheckChar('030640615'), '2');

  const isbn10 = validateAndPrepareBarcode('isbn10', '0-306-40615-2');
  assert.equal(isbn10.valid, true);
  assert.equal(isbn10.bwipText, '9780306406157');

  const isbn13 = validateAndPrepareBarcode('isbn13', '978-0-306-40615-7');
  assert.equal(isbn13.valid, true);
  assert.equal(isbn13.bwipText, '9780306406157');
});

test('CODE 39, ITF, Codabar, and GS1-128 enforce format rules', () => {
  assert.equal(validateAndPrepareBarcode('code39', 'asset-01').valid, true);
  assert.equal(validateAndPrepareBarcode('code39', 'bad@char').valid, false);

  assert.equal(validateAndPrepareBarcode('interleaved2of5', '123456').valid, true);
  assert.equal(validateAndPrepareBarcode('interleaved2of5', '12345').valid, false);

  assert.equal(validateAndPrepareBarcode('codabar', 'A1234B').valid, true);
  assert.equal(validateAndPrepareBarcode('codabar', '1234').valid, false);

  assert.equal(validateAndPrepareBarcode('gs1-128', '(01)09501101530003').valid, true);
  assert.equal(validateAndPrepareBarcode('gs1-128', '09501101530003').valid, false);
});
