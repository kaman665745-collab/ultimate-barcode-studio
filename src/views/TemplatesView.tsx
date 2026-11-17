import React, { useState } from 'react';
import {
  MARKETPLACE_TEMPLATES,
  MarketplaceTemplate,
  TemplateCategory,
} from '../data/presets';
import { QrPreviewCanvas } from '../components/QrPreviewCanvas';
import { BarcodePreviewCanvas } from '../components/BarcodePreviewCanvas';
import { Search, Wand2 } from 'lucide-react';

interface TemplatesViewProps {
  onApplyTemplate: (template: MarketplaceTemplate) => void;
}

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'All',
  'Business QR',
  'Shop QR',
  'Restaurant QR',
  'Payment QR',
  'Personal QR',
  'Social Media QR',
  'Product Barcodes',
  'Event QR',
];

export const TemplatesView: React.FC<TemplatesViewProps> = ({ onApplyTemplate }) => {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const q = searchQuery.trim().toLowerCase();
  const visibleTemplates = MARKETPLACE_TEMPLATES.filter((t) => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    if (!matchesCat) return false;
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.subtitle.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Template Marketplace</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Curated, high-contrast QR and barcode templates ready to customize in one click.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Search templates"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-[#100d1b] border border-violet-400/25 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {TEMPLATE_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white'
                  : 'bg-white/[0.04] border border-white/10 text-slate-300 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Template Grid */}
      {visibleTemplates.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm font-medium text-white">No templates match &ldquo;{searchQuery}&rdquo;</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-500"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleTemplates.map((tpl) => (
            <article
              key={tpl.id}
              className="glass-panel rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-violet-400/40 transition-all"
            >
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-medium text-pink-300">{tpl.category}</p>
                  <h2 className="font-display text-base font-bold text-white mt-0.5">
                    {tpl.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">{tpl.subtitle}</p>
                </div>

                <div className="flex justify-center py-2">
                  {tpl.kind === 'qr' && tpl.qrDesign ? (
                    <QrPreviewCanvas
                      payload={tpl.samplePayload}
                      design={tpl.qrDesign}
                      previewSize={164}
                      showReliabilityBadge={false}
                    />
                  ) : tpl.barcodeConfig ? (
                    <BarcodePreviewCanvas config={tpl.barcodeConfig} />
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onApplyTemplate(tpl)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 transition-all"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Apply Design
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
