export interface LightState {
  lightX: number;
  lightY: number;
  angle: number;
  tiltX: number;
  tiltY: number;
  shadowX: number;
  shadowY: number;
}

export interface CardRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Normalizes cursor position relative to element center in range [-1, 1].
 */
export function calculateNormalizedCursor(
  clientX: number,
  clientY: number,
  rect: CardRect
): { normX: number; normY: number } {
  if (rect.width <= 0 || rect.height <= 0) {
    return { normX: 0, normY: 0 };
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const rawNormX = (clientX - centerX) / (rect.width / 2);
  const rawNormY = (clientY - centerY) / (rect.height / 2);

  const normX = Math.max(-1, Math.min(1, rawNormX));
  const normY = Math.max(-1, Math.min(1, rawNormY));

  return { normX, normY };
}

/**
 * Computes ray-traced lighting, specular angle, 3D tilt, and directional shadow projection.
 */
export function computeRayTracedLightState(
  normX: number,
  normY: number,
  maxTiltDegrees = 4,
  maxShadowDistance = 20
): LightState {
  // Light percentages [0% to 100%]
  const lightX = Math.round(((normX + 1) / 2) * 100);
  const lightY = Math.round(((normY + 1) / 2) * 100);

  // Specular angle in degrees [0° to 360°]
  const rawAngle = (Math.atan2(normY, normX) * 180) / Math.PI + 90;
  const angle = Math.round((rawAngle + 360) % 360);

  // 3D perspective tilt (opposite Y creates natural dynamic perspective)
  const tiltX = Math.round(-normY * maxTiltDegrees) || 0;
  const tiltY = Math.round(normX * maxTiltDegrees) || 0;

  // Ray projected shadow travels opposite to cursor light source
  const shadowX = Math.round(-normX * maxShadowDistance) || 0;
  const shadowY = Math.round(-normY * maxShadowDistance + 8) || 0;

  return {
    lightX,
    lightY,
    angle,
    tiltX,
    tiltY,
    shadowX,
    shadowY
  };
}

/**
 * Returns default resting light state for un-hovered cards.
 */
export function getDefaultLightState(): LightState {
  return {
    lightX: 50,
    lightY: 50,
    angle: 45,
    tiltX: 0,
    tiltY: 0,
    shadowX: 0,
    shadowY: 12
  };
}
