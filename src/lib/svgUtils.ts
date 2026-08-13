/**
 * Utility functions for SVG banner animation enhancement and PNG export preparation.
 */

export const SVG_ANIMATION_STYLES = `
  @keyframes mrdWaveFlow {
    0% { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: -120; }
  }
  @keyframes mrdWaveFlowRev {
    0% { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: 120; }
  }
  @keyframes mrdPulseGlow {
    0%, 100% { opacity: 0.4; transform: scale(1); filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.6)); }
    50% { opacity: 1; transform: scale(1.25); filter: drop-shadow(0 0 16px rgba(236, 72, 153, 0.9)); }
  }
  @keyframes mrdFloat {
    0%, 100% { transform: translateY(0px) translateX(0px); }
    50% { transform: translateY(-10px) translateX(6px); }
  }
  @keyframes mrdSpinCenter {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes mrdShimmerGrid {
    0%, 100% { opacity: 0.05; }
    50% { opacity: 0.22; }
  }
  @keyframes mrdBeamPulse {
    0%, 100% { opacity: 0.3; stroke-width: 1.5; }
    50% { opacity: 0.9; stroke-width: 3.5; }
  }

  .mrd-anim-wave-1 {
    stroke-dasharray: 12, 6;
    animation: mrdWaveFlow 3.5s linear infinite;
  }
  .mrd-anim-wave-2 {
    stroke-dasharray: 8, 4;
    animation: mrdWaveFlowRev 5s linear infinite;
  }
  .mrd-anim-pulse {
    animation: mrdPulseGlow 3s ease-in-out infinite;
    transform-origin: center;
    transform-box: fill-box;
  }
  .mrd-anim-float {
    animation: mrdFloat 4.5s ease-in-out infinite;
    transform-origin: center;
    transform-box: fill-box;
  }
  .mrd-anim-spin {
    animation: mrdSpinCenter 18s linear infinite;
    transform-origin: center;
    transform-box: fill-box;
  }
  .mrd-anim-grid {
    animation: mrdShimmerGrid 4s ease-in-out infinite;
  }
  .mrd-anim-beam {
    animation: mrdBeamPulse 2.5s ease-in-out infinite;
  }
`;

/**
 * Ensures an SVG string contains embedded CSS keyframe animations and moving element classes.
 * Converts static banner SVGs into dynamic moving vector artwork.
 */
export function ensureAnimatedSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== "string") return rawSvg;

  // Check if style animation keyframes already exist
  const hasKeyframes = rawSvg.includes("mrdWaveFlow") || rawSvg.includes("@keyframes");

  let svg = rawSvg;

  // 1. Inject CSS animation style block into <defs> or top of <svg>
  if (!hasKeyframes) {
    const styleBlock = `<style id="mrd-svg-animations">${SVG_ANIMATION_STYLES}</style>`;

    if (svg.includes("<defs>")) {
      svg = svg.replace("<defs>", `<defs>\n    ${styleBlock}`);
    } else if (svg.includes("</defs>")) {
      svg = svg.replace("</defs>", `  ${styleBlock}\n  </defs>`);
    } else {
      // Insert right after opening <svg ...> tag
      svg = svg.replace(/(<svg[^>]*>)/i, `$1\n  <defs>\n    ${styleBlock}\n  </defs>`);
    }
  }

  // 2. Enhance SVG elements with animation classes if not already annotated
  // Enhance paths (waveforms, laser lines)
  svg = svg.replace(/<path\b(?![^>]*class=)([^>]*>)/gi, (match, p1) => {
    if (p1.includes('stroke-dasharray="4,2"') || p1.includes("stroke-dasharray")) {
      return `<path class="mrd-anim-wave-2" ${p1}`;
    }
    return `<path class="mrd-anim-wave-1" ${p1}`;
  });

  // Enhance circles (quantum nodes, interference circles)
  svg = svg.replace(/<circle\b(?![^>]*class=)([^>]*>)/gi, (match, p1) => {
    return `<circle class="mrd-anim-pulse mrd-anim-float" ${p1}`;
  });

  // Enhance coordinate grid groups
  svg = svg.replace(/<g\b(?![^>]*class=)([^>]*stroke="[#a-f0-9]+"[^>]*opacity="0\.08"[^>]*>)/gi, (match, p1) => {
    return `<g class="mrd-anim-grid" ${p1}`;
  });

  // Enhance isometric / center groups
  svg = svg.replace(/<g\b(?![^>]*class=)([^>]*transform="translate\([^)]+\)"[^>]*>)/gi, (match, p1) => {
    return `<g class="mrd-anim-float" ${p1}`;
  });

  return svg;
}

/**
 * Prepares an SVG string for crisp HTML5 canvas rendering during PNG export.
 */
export function prepareSvgForPngExport(svgString: string, width = 1200, height = 675): string {
  let cleaned = ensureAnimatedSvg(svgString);

  // Pre-escape unescaped ampersands
  cleaned = cleaned.replace(/&(?!(amp|lt|gt|quot|apos|#\d+);)/g, "&amp;");

  // Remove external import declarations or external url references that taint canvas
  cleaned = cleaned
    .replace(/@import\s+[^;]+;/gi, "")
    .replace(/@font-face\s*\{[^}]*\}/gi, "")
    .replace(/url\(['"]?https?:\/\/[^'")]*['"]?\)/gi, "none");

  // Ensure root width and height attributes exist for crisp rendering
  cleaned = cleaned.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    let newAttrs = attrs;
    if (!/width=/i.test(newAttrs)) {
      newAttrs += ` width="${width}"`;
    } else {
      newAttrs = newAttrs.replace(/width="[^"]*"/i, `width="${width}"`);
    }

    if (!/height=/i.test(newAttrs)) {
      newAttrs += ` height="${height}"`;
    } else {
      newAttrs = newAttrs.replace(/height="[^"]*"/i, `height="${height}"`);
    }

    if (!/xmlns=/i.test(newAttrs)) {
      newAttrs += ` xmlns="http://www.w3.org/2000/svg"`;
    }

    return `<svg ${newAttrs}>`;
  });

  return cleaned;
}
