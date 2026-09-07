// Calendar enhancement, Session 3 (section 5 — "keep text readable and
// accessible") — picks black or white text for a given background hex
// using the standard WCAG relative-luminance approximation, so a light
// service color (e.g. Light Blue, Gold) doesn't get white-on-light text.
export function getContrastTextColor(hex: string): "#000000" | "#ffffff" {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "#ffffff";

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return luminance > 0.5 ? "#000000" : "#ffffff";
}
