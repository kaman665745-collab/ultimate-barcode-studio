import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEmail,
  mapFirebaseAuthError,
  validateEmailOnly,
  validateProfileUpdate,
  validateRegisterForm,
  validateSignInForm,
} from './authValidation';
import {
  BLUEPRINT_LIMITS,
  isValidFirestoreId,
  sanitizeHistoryForFirestore,
  sanitizeProjectForFirestore,
  stripUndefinedDeep,
} from './firestoreSanitizer';

test('email and sign-in validation rejects malformed inputs and accepts valid credentials', () => {
  assert.equal(isValidEmail('alice@studio.dev'), true);
  assert.equal(isValidEmail('not-an-email'), false);

  assert.equal(validateEmailOnly('').valid, false);
  assert.equal(validateSignInForm('alice@studio.dev', '123').valid, false);
  assert.equal(validateSignInForm('alice@studio.dev', 'secret123').valid, true);
});

test('registration validation enforces display name, password complexity, and matching confirmation', () => {
  assert.equal(validateRegisterForm('A', 'a@b.com', 'Password1', 'Password1').valid, false);
  assert.equal(validateRegisterForm('Alice', 'a@b.com', 'short1', 'short1').valid, false);
  assert.equal(validateRegisterForm('Alice', 'a@b.com', 'onlyletters', 'onlyletters').valid, false);
  assert.equal(validateRegisterForm('Alice', 'a@b.com', 'Password1', 'Password2').valid, false);
  assert.equal(validateRegisterForm('Alice', 'a@b.com', 'Password1', 'Password1').valid, true);
});

test('profile validation verifies photo URL protocol and display name length', () => {
  assert.equal(validateProfileUpdate('Alice', 'javascript:alert(1)').valid, false);
  assert.equal(validateProfileUpdate('Alice', 'https://example.com/avatar.png').valid, true);
  assert.equal(validateProfileUpdate('Alice', '').valid, true);
});

test('mapFirebaseAuthError translates auth error codes into user-friendly guidance', () => {
  assert.match(
    mapFirebaseAuthError({ code: 'auth/invalid-credential' }),
    /Invalid email or password/i
  );
  assert.match(
    mapFirebaseAuthError({ code: 'auth/operation-not-allowed' }),
    /Firebase Console/i
  );
  assert.match(
    mapFirebaseAuthError({ code: 'auth/email-already-in-use' }),
    /already exists/i
  );
});

test('firestoreSanitizer enforces blueprint IDs, clamps strings, strips undefined, and blocks oversized thumbnails', () => {
  assert.equal(isValidFirestoreId('user_123-abc'), true);
  assert.equal(isValidFirestoreId('bad/id$here'), false);

  const cleaned = stripUndefinedDeep({ a: 1, b: undefined, nested: { c: 'ok', d: undefined } });
  assert.deepEqual(cleaned, { a: 1, nested: { c: 'ok' } });

  const longPayload = 'x'.repeat(5000);
  const hugeThumb = 'data:image/png;base64,' + 'A'.repeat(250000);

  const sanitizedProj = sanitizeProjectForFirestore('uid_alpha_1', {
    id: 'bad/id$1',
    name: 'My QR',
    kind: 'qr',
    category: 'website',
    payload: longPayload,
    favorite: true,
    thumbnailDataUrl: hugeThumb,
    qrDesign: {
      foregroundColor: '#000000',
      backgroundColor: '#ffffff',
      transparentBg: false,
      gradient: { enabled: false, type: 'linear', rotation: 0, colorStops: ['#000', '#111'] },
      dotStyle: 'square',
      cornerSquareStyle: 'square',
      cornerDotStyle: 'square',
      cornerSquareColor: undefined,
      frameStyle: 'none',
      frameColor: '#000000',
      frameTextColor: '#ffffff',
      frameText: '',
      caption: '',
      size: 256,
      margin: 16,
      ecc: 'Q',
      logoSize: 0.25,
      logoMargin: 4,
      logoHideBackgroundDots: true,
      logoDataUrl: undefined,
    },
    createdAt: 1,
    updatedAt: 2,
  });

  assert.equal(isValidFirestoreId(sanitizedProj.id), true);
  assert.equal(sanitizedProj.ownerId, 'uid_alpha_1');
  assert.equal(sanitizedProj.payload.length, BLUEPRINT_LIMITS.MAX_PAYLOAD);
  assert.equal(sanitizedProj.thumbnailDataUrl, undefined);
  assert.equal('cornerSquareColor' in (sanitizedProj.qrDesign || {}), false);

  const sanitizedHist = sanitizeHistoryForFirestore('uid_alpha_1', {
    id: 'hist-1',
    action: 'downloaded',
    kind: 'barcode',
    title: 'EAN Label',
    category: 'ean13',
    payload: '4006381333931',
    format: 'PDF',
    timestamp: 100,
  });

  assert.equal(sanitizedHist.format, 'PDF');
  assert.equal(sanitizedHist.ownerId, 'uid_alpha_1');
});
