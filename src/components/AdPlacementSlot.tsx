import React from 'react';
import { AppSettings } from '../types/studio';

interface AdPlacementSlotProps {
  zone: 'header' | 'sidebar' | 'content';
  settings: AppSettings;
}

/**
 * Google AdSense-ready placement slot.
 * Disabled by default: renders nothing until the site owner enables AdSense
 * and configures their publisher ID in Settings. Never renders fake ads.
 */
export const AdPlacementSlot: React.FC<AdPlacementSlotProps> = ({ zone, settings }) => {
  if (!settings.adsenseEnabled || !settings.adsenseSlots[zone]) {
    return null;
  }

  const dimensions =
    zone === 'header'
      ? 'h-[90px] w-full'
      : zone === 'sidebar'
      ? 'h-[250px] w-full'
      : 'h-[110px] w-full';

  return (
    <aside
      aria-label={`AdSense ${zone} placement`}
      data-ad-zone={zone}
      data-ad-client={settings.adsensePublisherId || 'unconfigured'}
      className={`${dimensions} rounded-xl border border-dashed border-violet-400/25 bg-white/[0.02] flex flex-col items-center justify-center text-center px-4`}
    >
      <p className="text-xs font-medium text-slate-400">
        Reserved AdSense Slot ({zone})
      </p>
      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
        {settings.adsensePublisherId
          ? `Publisher: ${settings.adsensePublisherId}`
          : 'Configure Publisher ID in Settings before publishing'}
      </p>
    </aside>
  );
};
