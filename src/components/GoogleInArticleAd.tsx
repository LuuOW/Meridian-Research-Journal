import React, { useEffect, useRef } from "react";

interface GoogleInArticleAdProps {
  slotId?: string;
  className?: string;
}

export function GoogleInArticleAd({
  slotId = "2342440882",
  className = ""
}: GoogleInArticleAdProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const isPushed = useRef(false);

  useEffect(() => {
    if (isPushed.current) return;
    try {
      if (typeof window !== "undefined") {
        const adsWindow = window as any;
        adsWindow.adsbygoogle = adsWindow.adsbygoogle || [];
        adsWindow.adsbygoogle.push({});
        isPushed.current = true;
      }
    } catch (err) {
      console.debug("In-article AdSense slot push deferred or blocked:", err);
    }
  }, []);

  return (
    <div className={`my-8 w-full flex flex-col items-center justify-center ${className}`}>
      <span className="text-[9px] font-mono font-bold tracking-widest text-gray-400 dark:text-neutral-500 uppercase mb-2 select-none">
        SPONSORED RESEARCH DIGEST
      </span>
      <div className="w-full max-w-2xl min-h-[120px] bg-gray-50/40 dark:bg-neutral-900/30 rounded-xl border border-dashed border-gray-200 dark:border-neutral-800/80 p-3 flex items-center justify-center overflow-hidden">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", textAlign: "center", width: "100%" }}
          data-ad-layout="in-article"
          data-ad-format="fluid"
          data-ad-client="ca-pub-7734562716191044"
          data-ad-slot={slotId}
        />
      </div>
    </div>
  );
}
