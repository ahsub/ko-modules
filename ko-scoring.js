/**
 * ko-scoring.js — Composite Score & Signal-Qualität
 * Version: 1.0
 * Abhängigkeiten: ko-config.js, ko-indicators.js
 */

const KoScoring = {

  // ── DEFAULT GEWICHTE ─────────────────────────────────────────────
  defaultWeights: {
    tech:    30,
    sepa:    25,
    bp:      15,
    sticky:  15,
    vol:     10,
    rs:       5,
  },

  // ── SCORE LABEL / COLOR ──────────────────────────────────────────
  getLabel(score) {
    if (score >= 90) return { label: 'A+', color: '#22c55e' };
    if (score >= 80) return { label: 'A',  color: '#4ade80' };
    if (score >= 70) return { label: 'B+', color: '#86efac' };
    if (score >= 60) return { label: 'B',  color: '#fbbf24' };
    if (score >= 50) return { label: 'C+', color: '#f97316' };
    if (score >= 40) return { label: 'C',  color: '#ef4444' };
    return                  { label: 'D',  color: '#991b1b' };
  },

  // ── SIGNAL-QUALITÄTS-FAKTOR ──────────────────────────────────────
  // Multiplikativer Faktor: reduziert Score wenn Überhitzung + Trendbruch
  calcSignalQuality({ overheatScore, pBull2Bear, breadth }) {
    const oh = overheatScore != null ? overheatScore : 0;
    const pb = pBull2Bear    != null ? pBull2Bear    : 0;
    const br = breadth       != null ? breadth       : 60;

    const ohFactor = oh < 30 ? 1.0 : oh < 50 ? 0.7 : oh < 75 ? 0.4 : 0.1;
    const pbFactor = pb < 0.08 ? 1.0 : pb < 0.15 ? 0.7 : pb < 0.25 ? 0.4 : 0.2;
    const brFactor = br > 70  ? 1.0 : br > 50  ? 0.8 : br > 35  ? 0.5 : 0.2;

    return Math.round(ohFactor * pbFactor * brFactor * 100) / 100;
  },

  // ── ADJUSTED SCORE ────────────────────────────────────────────────
  calcAdjustedScore(compositeScore, overheatScore) {
    if (!overheatScore) return compositeScore;
    const oh = overheatScore;
    const ohF = oh < 30 ? 1.0 : oh < 50 ? 0.7 : oh < 75 ? 0.4 : 0.1;
    return Math.round(compositeScore * ohF);
  },

  // ── BULL-COUNT ────────────────────────────────────────────────────
  // Basis-Bullish-Signale: MA50, MACD, OBV
  calcBullCount(raw) {
    const above50  = raw.price > raw.ma50;
    const macdBull = raw.macd_hist != null && raw.macd_hist_prev != null
      ? (raw.macd_hist > raw.macd_hist_prev && raw.macd_hist > 0)
      : null;
    const obvBull  = raw.obv_slope_5d != null ? raw.obv_slope_5d > 0 : null;
    return [above50, macdBull, obvBull].filter(v => v === true).length;
  },

  // ── SEPA SCORE (Minervini) ────────────────────────────────────────
  calcSEPA(raw) {
    // Aus computeFromRaw extrahiert
    if (!raw) return 0;
    let score = 0;
    if (raw.price > raw.ma50)   score++;
    if (raw.price > raw.ma150)  score++;
    if (raw.price > raw.ma200)  score++;
    if (raw.ma50  > raw.ma150)  score++;
    if (raw.ma150 > raw.ma200)  score++;
    if (raw.ma200_slope > 0)    score++;
    // 52W Range
    if (raw.dist52wLow  != null && raw.dist52wLow  >= 25) score++;
    if (raw.dist52wHigh != null && raw.dist52wHigh >= -25) score++;
    return score; // 0-8
  },

  // ── FEATURE-FLAG CHECK ────────────────────────────────────────────
  isEnabled(feature) {
    return typeof KoConfig === 'undefined' || KoConfig.isEnabled(feature);
  },

  // ── VOLLSTÄNDIGER COMPUTE (für neue Projekte) ─────────────────────
  // Berechnet alle Scores aus rohen Daten
  compute(raw, markov, overheat) {
    if (!raw) return null;

    const bullCount = this.calcBullCount(raw);
    const sepa      = this.calcSEPA(raw);
    const weights   = (typeof KoConfig !== 'undefined')
      ? KoConfig.scoring?.weights || this.defaultWeights
      : this.defaultWeights;

    // Composite Score
    let score = 0;
    if (bullCount === 3) score += weights.tech || 30;
    else if (bullCount === 2) score += (weights.tech || 30) * 0.6;
    else if (bullCount === 1) score += (weights.tech || 30) * 0.2;

    score += Math.round((sepa / 8) * (weights.sepa || 25));

    if (markov) {
      const sticky = markov.bullSticky || markov.sticky || 0;
      score += Math.round((sticky / 100) * (weights.sticky || 15));
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const { label, color } = this.getLabel(score);

    // Adjusted Score
    const adjustedScore = overheat
      ? this.calcAdjustedScore(score, overheat.score)
      : score;

    return {
      compositeScore: score,
      adjustedScore,
      scoreLabel:  label,
      scoreColor:  color,
      scoreGrade:  label,
      bullCount,
      sepaScore:   sepa,
    };
  },
};
