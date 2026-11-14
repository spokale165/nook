// Compatibility scoring — the heart of Nook's matching.
// Compares the current user's profile against a candidate and returns a
// percentage plus the top reasons they'd get along. Pure function: easy to
// tune, easy to unit-test, and identical on the client and (if you want) the server.

export function compat(user, c) {
  let score = 0;
  let max = 0;
  const reasons = [];

  max += 22;
  if (user.smoke === c.smoke) {
    score += 22;
    if (!c.smoke) reasons.push('both non-smokers');
  }

  max += 14;
  if (user.pets === c.pets) {
    score += 14;
    if (c.pets) reasons.push('both good with pets');
  }

  max += 16;
  if (user.sleep === c.sleep || user.sleep === 'flex' || c.sleep === 'flex') {
    score += 16;
    if (user.sleep === c.sleep && c.sleep !== 'flex') {
      reasons.push(c.sleep === 'early' ? 'both early risers' : 'both night owls');
    }
  }

  const near = (a, b, w) => {
    max += w;
    score += w * (1 - Math.abs(a - b) / 4);
    return Math.abs(a - b) <= 1;
  };
  if (near(user.clean, c.clean, 18) && c.clean >= 4) reasons.push('similar on tidiness');
  near(user.social, c.social, 14);
  near(user.guests, c.guests, 10);

  max += 12;
  const bd = Math.abs((user.budget || 0) - (c.budget || 0));
  score += 12 * Math.max(0, 1 - bd / 12000);
  if (bd <= 3000) reasons.push('budgets line up');

  max += 14;
  const userAreas = user.areas || [];
  const cAreas = c.areas || [];
  if (userAreas.some((h) => cAreas.includes(h))) {
    score += 14;
    reasons.push('areas overlap');
  }

  return {
    pct: Math.round(Math.max(28, Math.min(99, (score / max) * 100))),
    reasons: reasons.slice(0, 3),
  };
}
