// Pixel centers (in the @mirawision/usa-map-react SVG's 959x593 viewBox
// coordinate space) for each state's on-map flag icon overlay in
// StateRegistrationMap. Computed once from the rendered map's actual path
// bounding boxes (not hand-guessed) so icons land centered on their state.
export const MAP_VIEWBOX_WIDTH = 959;
export const MAP_VIEWBOX_HEIGHT = 593;

export const stateMapCentroids: Record<string, { x: number; y: number }> = {
  AK: { x: 113.7, y: 511.2 },
  HI: { x: 289.9, y: 546.4 },
  AL: { x: 653.9, y: 415.1 },
  AR: { x: 547.9, y: 373.7 },
  AZ: { x: 193.8, y: 365.1 },
  CA: { x: 83.6, y: 267.4 },
  CO: { x: 317.1, y: 272.4 },
  CT: { x: 858.7, y: 179.9 },
  DE: { x: 827.5, y: 241.4 },
  FL: { x: 718.4, y: 511.8 },
  GA: { x: 714.4, y: 404.8 },
  IA: { x: 523, y: 214.5 },
  ID: { x: 193.1, y: 111.4 },
  IL: { x: 590.4, y: 259.8 },
  IN: { x: 644.4, y: 255.5 },
  KS: { x: 439.8, y: 291 },
  KY: { x: 658.8, y: 299.9 },
  LA: { x: 565.9, y: 456.3 },
  MA: { x: 874, y: 159.3 },
  MD: { x: 797.3, y: 250.2 },
  ME: { x: 895.9, y: 87 },
  MI: { x: 632.9, y: 143.4 },
  MN: { x: 520.1, y: 116.7 },
  MO: { x: 542.9, y: 294.6 },
  MS: { x: 594, y: 419 },
  MT: { x: 273.5, y: 86.8 },
  NC: { x: 767.3, y: 332.2 },
  ND: { x: 414.2, y: 92.1 },
  NE: { x: 419.2, y: 223.2 },
  NH: { x: 868.9, y: 121.9 },
  NJ: { x: 834.5, y: 216.9 },
  NM: { x: 296.9, y: 373.5 },
  NV: { x: 132.5, y: 251.9 },
  NY: { x: 808, y: 155.4 },
  OH: { x: 700.1, y: 236.4 },
  OK: { x: 432.6, y: 361.2 },
  OR: { x: 96, y: 118.4 },
  PA: { x: 782.3, y: 210.9 },
  RI: { x: 877.9, y: 171.8 },
  SC: { x: 752.1, y: 380.3 },
  SD: { x: 412.9, y: 163.2 },
  TN: { x: 657.7, y: 341 },
  TX: { x: 404.3, y: 452.5 },
  UT: { x: 216, y: 248.5 },
  VA: { x: 768.4, y: 282.4 },
  VT: { x: 846.2, y: 126.8 },
  WA: { x: 116.2, y: 48.8 },
  WI: { x: 575.1, y: 152 },
  WV: { x: 748.5, y: 263.9 },
  WY: { x: 293.8, y: 180.9 },
  DC: { x: 801.4, y: 251.8 },
};

// States packed too tightly (the Northeast corridor + DC) for a legible flag
// icon at map scale — @mirawision/usa-map-react's own stylesheet already
// shrinks the text label font specifically for this same set of states to
// avoid clutter. They still show their flag in the hover/click tooltip.
export const CROWDED_MAP_STATES = new Set([
  "RI",
  "DE",
  "CT",
  "NH",
  "VT",
  "MA",
  "MD",
  "NJ",
  "DC",
]);
