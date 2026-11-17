import React from 'react';
import {
  QrCode,
  Barcode,
  IndianRupee,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export const HelpCenterView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Help Center & Technical Guide</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Standards, scan reliability tips, batch sheets, UPI guidance, and cloud sync security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <article className="glass-panel rounded-2xl p-6 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-violet-400" />
            <h2 className="font-display text-base font-bold text-white">QR Scan Reliability</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Keep a contrast ratio above 4:1 between QR modules and background. Dark modules on a light background offer universal camera compatibility. When embedding a center logo, always select Error Correction Level H (30%) and keep the logo below 30% of the matrix area.
          </p>
        </article>

        <article className="glass-panel rounded-2xl p-6 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <Barcode className="w-5 h-5 text-pink-400" />
            <h2 className="font-display text-base font-bold text-white">Barcode Standards & GS1</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            EAN-13, EAN-8, UPC-A, ITF-14, and ISBN-13 inputs are mathematically validated using standard Mod-10 check digits. Generating a valid barcode symbol does not register or license a GTIN/ISBN number—official retail identifiers must be obtained from GS1 or your national ISBN agency.
          </p>
        </article>

        <article className="glass-panel rounded-2xl p-6 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <IndianRupee className="w-5 h-5 text-purple-400" />
            <h2 className="font-display text-base font-bold text-white">UPI Payment QR Rules</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The UPI Studio builds standard <code className="font-mono text-pink-200">upi://pay</code> URIs compatible with GPay, PhonePe, Paytm, and BHIM. QR generation alone never settles or verifies transactions; always confirm payment notifications inside your bank or official merchant app.
          </p>
        </article>

        <article className="glass-panel rounded-2xl p-6 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-violet-300" />
            <h2 className="font-display text-base font-bold text-white">How Image QR Codes Work</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Standard QR codes hold up to ~3 KB of text, which cannot fit raw high-resolution photographs. Image QR codes encode a publicly accessible HTTPS URL pointing to your hosted image or PDF poster so any smartphone opens it immediately.
          </p>
        </article>

        <article className="glass-panel rounded-2xl p-6 space-y-2.5 md:col-span-2">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-pink-300" />
            <h2 className="font-display text-base font-bold text-white">Batch Label Sheets & Client-Side Scanner</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            In Batch &amp; Scanner, paste CSV rows (<code className="font-mono text-pink-200">Label, Value</code>) or import a CSV/TXT file to generate multi-page A4 label sheet PDFs (12 labels per page, up to 50 items per batch). The built-in Scanner decodes uploaded QR/barcode images and live camera frames locally in your browser without uploading media to external servers.
          </p>
        </article>
      </div>

      <article className="glass-panel rounded-2xl p-6 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="font-display text-base font-bold text-white">Guest Privacy & Owner-Isolated Cloud Sync</h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          All QR generation, barcode rendering, exports, and image scanning execute directly in your browser. Visitors in Guest Mode can create and download codes without signing up. When you sign in with Google or verified Email/Password, your saved projects, favorites, and history sync exclusively to your private Cloud Firestore workspace protected by strict per-user security rules.
        </p>
      </article>
    </div>
  );
};
