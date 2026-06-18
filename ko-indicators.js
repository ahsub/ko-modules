/**
 * ko-indicators.js — Technische Indikatoren
 * Reine Mathematik, kein API-Call, kein DOM
 * Version: 1.0
 */

const KoIndicators = {

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

  // ── ATR ─────────────────────────────────────────────────────────
  calcATR(closes, period = 14) {
    if (!closes || closes.length < period + 1) return null;
    const trs = [];
    for (let i = 1; i < closes.length; i++) {
      trs.push(Math.abs(closes[i] - closes[i - 1]));
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

  // ── ADX ─────────────────────────────────────────────────────────
  calcADX(closes, period = 14) {
    if (!closes || closes.length < period * 2) return null;
    const n   = closes.length;
    const dms = [];
    for (let i = 1; i < n; i++) {
      const up   = closes[i] - closes[i - 1];
      const down = closes[i - 1] - closes[i];
      dms.push({ plus: Math.max(0, up), minus: Math.max(0, down) });
    }
    let sumP = 0, sumM = 0;
    for (let i = 0; i < period; i++) { sumP += dms[i].plus; sumM += dms[i].minus; }
    const dxVals = [];
    for (let i = period; i < dms.length; i++) {
      sumP = sumP - sumP / period + dms[i].plus;
      sumM = sumM - sumM / period + dms[i].minus;
      const diP = sumP + sumM > 0 ? sumP / (sumP + sumM) * 100 : 0;
      const diM = sumP + sumM > 0 ? sumM / (sumP + sumM) * 100 : 0;
      const dx  = diP + diM > 0 ? Math.abs(diP - diM) / (diP + diM) * 100 : 0;
      dxVals.push(dx);
    }
    if (dxVals.length < period) return null;
    const adx     = dxVals.slice(-period).reduce((a, b) => a + b, 0) / period;
    const adxPrev = dxVals.slice(-period * 2, -period).reduce((a, b) => a + b, 0) / period;
    return {
      value:  Math.round(adx * 10) / 10,
      prev:   Math.round(adxPrev * 10) / 10,
      trend:  adx > adxPrev ? 'rising' : 'falling',
      strong: adx > 25,
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
