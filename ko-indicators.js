/**
 * ko-indicators.js — Technische Indikatoren
 * Reine Mathematik, kein API-Call, kein DOM
 * Version: 1.2 | ko-scanner v=159+
 * Repository: ahsub/ko-modules
 * Abhängigkeiten: keine
 *
 * NEU in v1.2:
 *   - calcADX: echte True Range mit Highs/Lows (Wilder's Smoothing)
 *   - calcStochastic: Slow Stochastik (14/3/3)
 *   - detectMarketStructure: Swing-Hoch/Tief (Williams Fractals)
 */

var KoIndicators = {

  // ── EMA ─────────────────────────────────────────────────────────
  calcEMA(closes, period) {
    if (!closes || closes.length < period) return null;
    const k = 2 / (period + 1);
    let ema  = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < closes.length; i++) {
      ema = closes[i] * k + ema * (1 - k);
    }
    return ema;
  },

  calcEMASeries(closes, period) {
    if (!closes || closes.length < period) return [];
    const k = 2 / (period + 1);
    const series = [];
    let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    series.push(ema);
    for (let i = period; i < closes.length; i++) {
      ema = closes[i] * k + ema * (1 - k);
      series.push(ema);
    }
    return series;
  },

  // ── RSI ─────────────────────────────────────────────────────────
  calcRSI(closes, period = 14) {
    if (!closes || closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const d = closes[i] - closes[i - 1];
      if (d > 0) gains += d; else losses -= d;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + Math.max(0, d))  / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
    }
    if (avgLoss === 0) return 100;
    return Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 10) / 10;
  },

  calcRSIDivergence(closes, lookback = 20) {
    if (!closes || closes.length < lookback * 2 + 14) return null;
    const n = closes.length;
    const rsiNow  = this.calcRSI(closes.slice(n - 14 - lookback));
    const rsiPrev = this.calcRSI(closes.slice(n - 14 - lookback * 2, n - lookback));
    if (rsiNow == null || rsiPrev == null) return null;
    const recentMax  = Math.max(...closes.slice(n - lookback));
    const previousMax= Math.max(...closes.slice(n - lookback * 2, n - lookback));
    const priceDiff  = (recentMax - previousMax) / previousMax * 100;
    const rsiDiff    = rsiNow - rsiPrev;
    return {
      bearish:   priceDiff > 2 && rsiDiff < -3,
      priceDiff: Math.round(priceDiff * 10) / 10,
      rsiDiff:   Math.round(rsiDiff * 10) / 10,
      rsiNow, rsiPrev,
    };
  },

  // ── MACD ────────────────────────────────────────────────────────
  calcMACD(closes, fast = 12, slow = 26, signal = 9) {
    if (!closes || closes.length < slow + signal) return null;
    const emaFast = this.calcEMASeries(closes, fast);
    const emaSlow = this.calcEMASeries(closes, slow);
    const offset  = emaFast.length - emaSlow.length;
    const macdLine= emaSlow.map((v, i) => emaFast[i + offset] - v);
    const signalLine = this.calcEMASeries(macdLine, signal);
    const n = signalLine.length;
    const hist    = signalLine.map((v, i) => macdLine[macdLine.length - n + i] - v);
    return {
      macd:      macdLine[macdLine.length - 1],
      signal:    signalLine[n - 1],
      histogram: hist[hist.length - 1],
      histPrev:  hist[hist.length - 2] ?? null,
    };
  },

  // ── ATR (mit Highs/Lows) ────────────────────────────────────────
  calcATR(highs, lows, closes, period = 14) {
    // Fallback: wenn nur closes übergeben (alte Aufrufe)
    if (!Array.isArray(lows)) {
      period = lows || 14;
      const c = highs;
      if (!c || c.length < period + 1) return null;
      const trs = [];
      for (let i = 1; i < c.length; i++) trs.push(Math.abs(c[i] - c[i-1]));
      return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
    }
    if (!closes || closes.length < period + 1) return null;
    const trs = [];
    for (let i = 1; i < closes.length; i++) {
      const h = highs[i] ?? closes[i];
      const l = lows[i]  ?? closes[i];
      const tr = Math.max(
        h - l,
        Math.abs(h - closes[i - 1]),
        Math.abs(l - closes[i - 1])
      );
      trs.push(tr);
    }
    return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  },

  // ── BOLLINGER BANDS ─────────────────────────────────────────────
  calcBollinger(closes, period = 20, mult = 2) {
    if (!closes || closes.length < period) return null;
    const n      = closes.length;
    const slice  = closes.slice(n - period);
    const sma    = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, v) => a + (v - sma) ** 2, 0) / period;
    const std    = Math.sqrt(variance);
    const upper  = sma + mult * std;
    const lower  = sma - mult * std;
    const price  = closes[n - 1];
    const pos    = std > 0 ? (price - lower) / (upper - lower) : 0.5;
    return { upper, lower, mid: sma, price, pos: Math.round(pos * 100) / 100, std };
  },

  // ── ADX v2: Echte True Range mit Highs/Lows (Wilder's Smoothing) ──
  calcADX(highs, lows, closes, period = 14) {
    // Fallback für alte Aufrufe mit nur closes
    if (!Array.isArray(lows)) {
      period = lows || 14;
      highs = highs; lows = highs; closes = highs;
    }
    if (!closes || closes.length < period * 2) return null;

    const tr = [], plusDM = [], minusDM = [];

    for (let i = 1; i < closes.length; i++) {
      const h = highs[i] ?? closes[i];
      const l = lows[i]  ?? closes[i];
      const ph = highs[i-1] ?? closes[i-1];
      const pl = lows[i-1]  ?? closes[i-1];

      // True Range
      tr.push(Math.max(h - l, Math.abs(h - closes[i-1]), Math.abs(l - closes[i-1])));

      // Directional Movement
      const upMove   = h - ph;
      const downMove = pl - l;
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    // Wilder's Smoothing Init
    let sTR  = tr.slice(0, period).reduce((a, b) => a + b, 0);
    let sPDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
    let sMDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

    const dxVals = [];
    let lastPlusDI = 0, lastMinusDI = 0;

    for (let i = period; i < tr.length; i++) {
      sTR  = sTR  - sTR  / period + tr[i];
      sPDM = sPDM - sPDM / period + plusDM[i];
      sMDM = sMDM - sMDM / period + minusDM[i];

      const pDI = sTR > 0 ? (sPDM / sTR) * 100 : 0;
      const mDI = sTR > 0 ? (sMDM / sTR) * 100 : 0;
      lastPlusDI  = pDI;
      lastMinusDI = mDI;

      const diSum  = pDI + mDI;
      const dx     = diSum > 0 ? (Math.abs(pDI - mDI) / diSum) * 100 : 0;
      dxVals.push(dx);
    }

    if (dxVals.length < period) return null;

    // ADX = Wilder-Smoothing der DX-Werte
    let adx = dxVals.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < dxVals.length; i++) {
      adx = (adx * (period - 1) + dxVals[i]) / period;
    }

    const adxPrev = dxVals.slice(Math.max(0, dxVals.length - period * 2), dxVals.length - period);
    const adxPrevVal = adxPrev.length ? adxPrev.reduce((a,b) => a+b, 0) / adxPrev.length : adx;

    return {
      value:    Math.round(adx * 10) / 10,
      prev:     Math.round(adxPrevVal * 10) / 10,
      plusDI:   Math.round(lastPlusDI * 10) / 10,
      minusDI:  Math.round(lastMinusDI * 10) / 10,
      trend:    adx > adxPrevVal ? 'rising' : 'falling',
      strong:   adx > 25,
      // Trend-Richtung aus DI-Kreuzung
      bullTrend: lastPlusDI > lastMinusDI,
    };
  },

  // ── STOCHASTIK (Slow 14/3/3) ────────────────────────────────────
  calcStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    if (!closes || closes.length < kPeriod + dPeriod * 2) return null;

    // Fast %K
    const fastK = [];
    for (let i = kPeriod - 1; i < closes.length; i++) {
      const wH = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
      const wL = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
      fastK.push(wH === wL ? 50 : ((closes[i] - wL) / (wH - wL)) * 100);
    }

    // Slow %K = SMA(fastK, dPeriod)
    const slowK = [];
    for (let i = dPeriod - 1; i < fastK.length; i++) {
      slowK.push(fastK.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod);
    }

    if (slowK.length < dPeriod) return null;

    // Slow %D = SMA(slowK, dPeriod)
    const k = slowK[slowK.length - 1];
    const kPrev = slowK[slowK.length - 2] ?? k;
    const d = slowK.slice(-dPeriod).reduce((a, b) => a + b, 0) / dPeriod;
    const dPrev = slowK.length >= dPeriod + 1
      ? slowK.slice(-(dPeriod + 1), -1).reduce((a, b) => a + b, 0) / dPeriod
      : d;

    // Crossover-Erkennung
    const bullCross = k > d && kPrev <= dPrev;   // %K kreuzt %D nach oben
    const bearCross = k < d && kPrev >= dPrev;   // %K kreuzt %D nach unten

    return {
      k:          Math.round(k * 10) / 10,
      d:          Math.round(d * 10) / 10,
      kPrev:      Math.round(kPrev * 10) / 10,
      oversold:   k < 20,
      overbought: k > 80,
      bullCross,  // Kaufsignal: Cross in überverkaufter Zone
      bearCross,  // Verkaufssignal: Cross in überkaufter Zone
      signal:     k < 20 ? 'ÜBERVERKAUFT' : k > 80 ? 'ÜBERKAUFT' : 'NEUTRAL',
    };
  },

  // ── MARKET STRUCTURE (Williams Fractals) ────────────────────────
  detectMarketStructure(highs, lows, wing = 2) {
    if (!highs || highs.length < wing * 2 + 3) return null;

    const swingHighs = [];
    const swingLows  = [];

    // Scanne von hinten — brauchen wing Bars rechts zur Bestätigung
    for (let i = highs.length - wing - 1; i >= wing; i--) {
      // Swing High: höher als wing Bars links und rechts
      let isHigh = true;
      for (let j = 1; j <= wing; j++) {
        if (highs[i] <= highs[i - j] || highs[i] <= highs[i + j]) { isHigh = false; break; }
      }
      if (isHigh) swingHighs.push({ idx: i, val: highs[i] });

      // Swing Low: tiefer als wing Bars links und rechts
      let isLow = true;
      for (let j = 1; j <= wing; j++) {
        if (lows[i] >= lows[i - j] || lows[i] >= lows[i + j]) { isLow = false; break; }
      }
      if (isLow) swingLows.push({ idx: i, val: lows[i] });

      if (swingHighs.length >= 3 && swingLows.length >= 3) break;
    }

    // Marktstruktur aus letzten 2 Swing-Highs und -Lows
    let structure = 'NEUTRAL';
    let pullbackZone = false;

    if (swingHighs.length >= 2 && swingLows.length >= 2) {
      const hh = swingHighs[0].val > swingHighs[1].val;  // Higher High
      const hl = swingLows[0].val  > swingLows[1].val;   // Higher Low
      const lh = swingHighs[0].val < swingHighs[1].val;  // Lower High
      const ll = swingLows[0].val  < swingLows[1].val;   // Lower Low

      if (hh && hl) structure = 'BULLISH';   // Aufwärtstrend intakt
      if (lh && ll) structure = 'BEARISH';   // Abwärtstrend intakt
      if (hh && ll) structure = 'EXPANSION'; // Volatilitäts-Expansion
      if (lh && hl) structure = 'CONTRACTION'; // Kontraktion/Dreieck
    }

    // Pullback-Zone: Preis zwischen letztem Swing-Low und -High
    const lastHigh = swingHighs[0]?.val ?? null;
    const lastLow  = swingLows[0]?.val  ?? null;
    const price    = highs[highs.length - 1]; // Näherung
    if (lastHigh && lastLow) {
      const range = lastHigh - lastLow;
      const pos   = range > 0 ? (price - lastLow) / range : 0.5;
      // Pullback = Preis im unteren Drittel nach Bullish-Struktur
      pullbackZone = structure === 'BULLISH' && pos < 0.4;
    }

    return {
      structure,
      lastSwingHigh: lastHigh ? Math.round(lastHigh * 100) / 100 : null,
      lastSwingLow:  lastLow  ? Math.round(lastLow  * 100) / 100 : null,
      swingHighCount: swingHighs.length,
      swingLowCount:  swingLows.length,
      pullbackZone,   // true = ideale Swing-Long Einstiegszone
      bullish: structure === 'BULLISH',
      bearish: structure === 'BEARISH',
    };
  },

  // ── DISTRIBUTION DAYS ───────────────────────────────────────────
  calcDistributionDays(closes, volumes, lookback = 25) {
    if (!closes || !volumes || closes.length < lookback) return 0;
    const n       = closes.length;
    const recentC = closes.slice(n - lookback);
    const recentV = volumes.slice(n - lookback);
    const avgVol  = recentV.filter(Boolean).reduce((a, b) => a + b, 0) / recentV.length;
    let distDays  = 0;
    for (let i = 1; i < recentC.length; i++) {
      const chg = (recentC[i] - recentC[i - 1]) / recentC[i - 1];
      if (chg <= -0.002 && (recentV[i] || 0) > avgVol * 1.1) distDays++;
    }
    return distDays;
  },

  // ── OBV ─────────────────────────────────────────────────────────
  calcOBVSlope(closes, volumes, period = 5) {
    if (!closes || !volumes || closes.length < period + 1) return null;
    const n = closes.length;
    let obv = 0;
    const obvSeries = [0];
    for (let i = 1; i < n; i++) {
      const d = closes[i] - closes[i - 1];
      obv += d > 0 ? (volumes[i] || 0) : d < 0 ? -(volumes[i] || 0) : 0;
      obvSeries.push(obv);
    }
    const recent = obvSeries.slice(-period);
    const slope  = (recent[recent.length - 1] - recent[0]) / period;
    return slope;
  },

  // ── EMA STACK ───────────────────────────────────────────────────
  calcEMAStack(closes) {
    const ema10  = this.calcEMA(closes, 10);
    const ema20  = this.calcEMA(closes, 20);
    const ema50  = this.calcEMA(closes, 50);
    const ema200 = this.calcEMA(closes, 200);
    const price  = closes[closes.length - 1];
    if (!ema10 || !ema20 || !ema50) return null;
    return {
      ema10, ema20, ema50, ema200, price,
      bullStack: price > ema10 && ema10 > ema20 && ema20 > ema50,
      ema200dist: ema200 ? Math.round((price - ema200) / ema200 * 1000) / 10 : null,
    };
  },
};

console.log('[ko-indicators.js] v1.2 geladen — ADX, Stochastik, Market Structure');
