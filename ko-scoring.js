/**
 * ko-scoring.js — Composite Score & Signal-Qualität
 * Version: 1.2 | ko-scanner v=159+
 * Repository: ahsub/ko-modules
 * Abhängigkeiten: ko-config.js, ko-indicators.js
 */

var KoScoring = {

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

console.log('[ko-scoring.js] geladen');

// ── SWING-TRADING SCORE ────────────────────────────────────────────────────
// Wird nach dem calcADX/calcStochastic/detectMarketStructure Aufruf genutzt

KoScoring.calcSwingScore = function(params) {
  const {
    adx, plusDI, minusDI,
    stochK, stochD, stochBullCross,
    price, ema50, ema200, atr,
    macdHist, macdHistPrev,
    obvSlope,
    daysToEarnings,
    marketStructure,
    rsi,
  } = params;

  let score = 0;
  const reasons = [];
  const warnings = [];

  // ── 1. ADX Trendstärke-Filter (+25 Punkte) ──────────────────────
  if (adx != null) {
    if (adx > 30) {
      score += 25;
      reasons.push('ADX ' + adx + ' — starker Trend');
    } else if (adx > 25) {
      score += 18;
      reasons.push('ADX ' + adx + ' — Trend vorhanden');
    } else if (adx < 20) {
      score -= 15;
      warnings.push('ADX ' + adx + ' — Seitwärts/Chop-Zone');
    }
    // DI-Richtung prüfen
    if (plusDI != null && minusDI != null && plusDI > minusDI) {
      score += 5;
      reasons.push('+DI>' + '-DI (' + plusDI + '/' + minusDI + ')');
    }
  }

  // ── 2. Market Structure + EMA50 Pullback-Zone (+20 Punkte) ──────
  if (marketStructure && ema50 && atr && price) {
    const distToEMA50 = (price - ema50) / atr;

    if (marketStructure === 'BULLISH') {
      score += 10;
      reasons.push('Marktstruktur: BULLISH (HH/HL)');

      // Ideale Pullback-Zone: 0 bis 1.5 ATR über EMA50
      if (distToEMA50 >= 0 && distToEMA50 <= 1.5) {
        score += 15;
        reasons.push('Pullback-Zone: ' + distToEMA50.toFixed(1) + ' ATR über EMA50');
      } else if (distToEMA50 < 0 && distToEMA50 > -0.5) {
        score += 8;
        reasons.push('Leicht unter EMA50 — Rebound-Zone');
      }
    } else if (marketStructure === 'BEARISH') {
      warnings.push('Marktstruktur: BEARISH (LH/LL) — kein Long-Setup');
      score -= 10;
    } else if (marketStructure === 'CONTRACTION') {
      reasons.push('Kontraktion — Ausbruch vorbereitet');
      score += 5;
    }
  }

  // ── 3. MACD Momentum-Wende (+20 Punkte) ─────────────────────────
  if (macdHist != null && macdHistPrev != null) {
    // Histogramm dreht nach oben (von negativ kommend = stärkste Form)
    if (macdHist > macdHistPrev && macdHistPrev < 0 && macdHist < 0) {
      score += 20;
      reasons.push('MACD-Wende aus negativem Bereich');
    } else if (macdHist > macdHistPrev && macdHist > 0) {
      score += 12;
      reasons.push('MACD-Histogramm steigend');
    } else if (macdHist < macdHistPrev) {
      score -= 5;
      warnings.push('MACD-Histogramm fallend');
    }
  }

  // ── 4. Stochastik Crossover in Extremzone (+15 Punkte) ──────────
  if (stochK != null) {
    if (stochBullCross && stochK < 25) {
      score += 15;
      reasons.push('Stoch Bull-Cross überverkauft (' + stochK + ')');
    } else if (stochK < 20) {
      score += 8;
      reasons.push('Stochastik überverkauft (' + stochK + ')');
    } else if (stochK > 80) {
      score -= 8;
      warnings.push('Stochastik überkauft (' + stochK + ')');
    }
  }

  // ── 5. OBV Volumenbestätigung (+10 Punkte) ───────────────────────
  if (obvSlope != null) {
    if (obvSlope > 0) {
      score += 10;
      reasons.push('OBV steigend — Volumenbestätigung');
    } else {
      score -= 5;
      warnings.push('OBV fallend — Volumen schwach');
    }
  }

  // ── 6. Earnings-Sicherheitspuffer (+10 Punkte) ───────────────────
  if (daysToEarnings != null) {
    if (daysToEarnings > 14) {
      score += 10;
      reasons.push('Earnings in ' + daysToEarnings + ' Tagen — sicher');
    } else if (daysToEarnings <= 3) {
      score = 0; // Hartes Ausschlusskriterium
      warnings.push('EARNINGS IN ' + daysToEarnings + ' TAGEN — kein Trade!');
    } else {
      warnings.push('Earnings in ' + daysToEarnings + ' Tagen — Vorsicht');
    }
  }

  // ── RSI-Kontext (Bonus/Malus) ────────────────────────────────────
  if (rsi != null) {
    if (rsi < 35 && rsi > 20) { score += 5; reasons.push('RSI ' + rsi + ' — Rebound-Potential'); }
    if (rsi > 75) { score -= 5; warnings.push('RSI ' + rsi + ' — überkauft'); }
  }

  score = Math.max(0, Math.min(100, score));

  // Qualitätsstufe
  const grade = score >= 75 ? 'STARK'
              : score >= 55 ? 'GUT'
              : score >= 35 ? 'MODERAT'
              : 'SCHWACH';

  return {
    score,
    grade,
    reasons,
    warnings,
    bullish: score >= 55,
  };
};

console.log('[ko-scoring.js] Swing-Score hinzugefügt');
