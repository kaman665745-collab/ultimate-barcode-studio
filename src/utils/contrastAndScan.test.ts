import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDesignReliability, contrastRatio } from './contrastAndScan';
import { QRDesignConfig } from '../types/studio';

const baseDesign: QRDesignConfig = {
  foregroundColor: '#110d1b',
  backgroundColor: '#ffffff',
  transparentBg: false,
  gradient: {
    enabled: false,
    type: 'linear',
    rotation: 45,
    colorStops: ['#7c3aed', '#ec4899'],
  },
  dotStyle: 'rounded',
  cornerSquareStyle: 'extra-rounded',
  cornerDotStyle: 'dot',
  frameStyle: 'none',
  frameColor: '#7c3aed',
  frameTextColor: '#ffffff',
  frameText: 'SCAN ME',
  caption: '',
  size: 320,
  margin: 16,
  ecc: 'M',
  logoSize: 0.25,
  logoMargin: 6,
  logoHideBackgroundDots: true,
};

test('high contrast dark-on-white design is reliable', () => {
  assert.ok(contrastRatio('#000000', '#ffffff') > 20);
  const report = analyzeDesignReliability(baseDesign, true);
  assert.equal(report.status, 'reliable');
  assert.equal(report.warnings.length, 0);
});

test('low contrast and oversized logo trigger risk warnings', () => {
  const badDesign: QRDesignConfig = {
    ...baseDesign,
    foregroundColor: '#dcdcdc',
    backgroundColor: '#ffffff',
    logoDataUrl: 'data:image/png;base64,fake',
    logoSize: 0.42,
    ecc: 'L',
  };
  const report = analyzeDesignReliability(badDesign, false);
  assert.equal(report.status, 'risk');
  assert.ok(report.warnings.length >= 2);
});
