// Small presentational helpers shared across screens.

export const GRADS = [
  ['#e5704f', '#f2a65a'], ['#6a8caf', '#9fc0d9'], ['#7a9a6d', '#b7cf94'],
  ['#b06f9a', '#e0a7c4'], ['#d9a441', '#f0d08a'], ['#5f8f8a', '#a7cbc6'],
  ['#c97b5a', '#e8b58f'], ['#8a7bb0', '#c0b2dd'],
];

export const grad = (i) =>
  `linear-gradient(135deg,${GRADS[i % GRADS.length][0]},${GRADS[i % GRADS.length][1]})`;

export const initials = (n) =>
  (n || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// Illustrated placeholder "room photo" (used only as a fallback when a listing
// has no uploaded photos yet). Real listings render the user's uploaded images.
const ROOMPAL = [
  ['#f3d9c6', '#e5704f', '#d8b48f', '#bfe0ef'],
  ['#dde5ee', '#6a8caf', '#c3cedb', '#f2dfc9'],
  ['#e5ecd9', '#7a9a6d', '#cdbfa0', '#cfe6ef'],
  ['#efe0ea', '#b06f9a', '#d8c6cf', '#d9ecef'],
];
export function roomArtDataUri(seed = 0) {
  const p = ROOMPAL[seed % ROOMPAL.length];
  const [wall, accent, floor, glass] = p;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 240' preserveAspectRatio='xMidYMid slice'><rect width='400' height='240' fill='${wall}'/><rect y='170' width='400' height='70' fill='${floor}'/><rect x='40' y='44' width='96' height='84' rx='4' fill='${glass}'/><rect x='40' y='44' width='96' height='84' rx='4' fill='none' stroke='${wall}' stroke-width='6'/><line x1='88' y1='44' x2='88' y2='128' stroke='${wall}' stroke-width='4'/><rect x='158' y='128' width='208' height='62' rx='7' fill='${accent}'/><rect x='158' y='104' width='78' height='40' rx='8' fill='#fff' opacity='.9'/><circle cx='360' cy='96' r='15' fill='${accent}' opacity='.8'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
