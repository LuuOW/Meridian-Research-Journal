import React, { useEffect, useRef } from "react";

interface GoogleAdSlotProps {
  slotId?: string;
  adFormat?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
  label?: string;
}

export function GoogleAdSlot({
  slotId = "default-slot",
  adFormat = "auto",
  className = "",
  label = "SPONSORED SCHOLARLY INSIGHT"
}: GoogleAdSlotProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const isPushed = useRef(false);

  useEffect(() => {
    // Only execute if not previously pushed on this mount
    if (isPushed.current) return;
    try {
      if (typeof window !== "undefined") {
        const adsWindow = window as any;
        adsWindow.adsbygoogle = adsWindow.adsbygoogle || [];
        adsWindow.adsbygoogle.push({});
        isPushed.current = true;
      }
    } catch (err) {
      // Gracefully catch ad-blocker or script block exceptions without crashing UI
      console.debug("AdSense slot push deferred or blocked:", err);
    }
  }, []);

  return (
    <div className={`my-8 w-full flex flex-col items-center justify-center ${className}`}>
      {/* Discrete compliance tag */}
      <span className="text-[9px] font-mono font-bold tracking-widest text-gray-400 dark:text-neutral-500 uppercase mb-2 select-none">
        {label}
      </span>

      <div className="w-full max-w-2xl min-h-[90px] bg-gray-50/50 dark:bg-neutral-900/40 rounded-xl border border-dashed border-gray-200 dark:border-neutral-800 p-2 flex items-center justify-center overflow-hidden">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", textAlign: "center", width: "100%" }}
          data-ad-client="ca-pub-7734562716191044"
          data-ad-slot={slotId}
          data-ad-format={adFormat}
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
