/**
 * ko-darkpool.js — Dark Pool & Institutional Flow Analyse
 * Version: 1.2 | ko-scanner v=142+
 * Repository: ahsub/ko-modules
 * Abhängigkeiten: ko-config.js (optional)
 *
 * Datenquellen (alle via CORS-Proxy / Yahoo Finance):
 *   PCR/Sentiment → ^VVIX, ^SKEW, ^VIX, ^VIX3M (Yahoo Finance)
 *   DIX-Proxy     → SPY OBV + Volumen-Analyse (synthetisch)
 *   GEX-Proxy     → ^VVIX Ableitung
 *
 * Hinweis: squeezemetrics.com ist seit 2024 Paywall-geschützt.
 * DIX/GEX werden als synthetische Proxies aus öffentlichen Daten berechnet.
 */

var KoDarkPool = {

  // ── KONFIGURATION ─────────────────────────────────────────────────────────
  get corsProxy() {
    return (typeof KoConfig !== 'undefined' && KoConfig.api && KoConfig.api.corsProxy)
      ? KoConfig.api.corsProxy
      : 'https://my-cors-proxy.ahildebrand.workers.dev';
  },

  CACHE_MINUTES: 30,
  _cache: null,
  _cacheTime: 0,

  // ── HILFSFUNKTIONEN ───────────────────────────────────────────────────────
  async _fetchYahoo(sym, days) {
    const to   = Math.floor(Date.now() / 1000);
    const from = to - 60 * 60 * 24 * (days || 30);
    const url  = 'https://query1.finance.yahoo.com/v7/finance/chart/'
      + encodeURIComponent(sym)
      + '?interval=1d&period1=' + from + '&period2=' + to;
    const proxyUrl = this.corsProxy + '/?url=' + encodeURIComponent(url);
    try {
      const r = await fetch(proxyUrl);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const result = j?.chart?.result?.[0];
      if (!result) return null;
      const q      = result.indicators?.quote?.[0] || {};
      const closes = (q.close  || []).filter(v => v != null);
      const vols   = (q.volume || []).filter(v => v != null);
      const price  = result.meta?.regularMarketPrice || closes[closes.length-1];
      return { sym, closes, vols, price, bars: closes.length };
    } catch(e) {
      console.warn('[KoDarkPool] fetch error:', sym, e.message);
      return null;
    }
  },

  // ── DIX-PROXY: Synthetischer Dark Index aus SPY-Daten ────────────────────
  // Echter DIX = % S&P500-Trades über Dark Pools (squeezemetrics, Paywall)
  // Proxy: OBV-Trend + Preis/Volumen-Divergenz auf SPY
  // Interpretation ähnlich wie DIX: Hoch = institutionelles Kaufen
  async fetchDIX() {
    const spy = await this._fetchYahoo('SPY', 40);
    if (!spy || spy.bars < 20) return null;

    const closes = spy.closes;
    const vols   = spy.vols;
    const n      = closes.length;

    // OBV berechnen
    let obv = 0;
    const obvArr = [0];
    for (let i = 1; i < n; i++) {
      obv += closes[i] > closes[i-1] ? vols[i] : closes[i] < closes[i-1] ? -vols[i] : 0;
      obvArr.push(obv);
    }

    // OBV-Trend 10T vs 20T
    const obv10 = obvArr.slice(-10).reduce((a,b) => a+b, 0) / 10;
    const obv20 = obvArr.slice(-20).reduce((a,b) => a+b, 0) / 20;

    // Volumen-Trend: heutiges Vol vs Ø20T
    const avgVol20 = vols.slice(-20).reduce((a,b) => a+b, 0) / 20;
    const lastVol  = vols[n-1];
    const volRatio = avgVol20 > 0 ? lastVol / avgVol20 : 1;

    // Preis-Momentum 5T
    const priceChange5 = closes.length >= 5
      ? (closes[n-1] / closes[n-6] - 1) * 100 : 0;

    // Synthetischer DIX-Score (40-55% Range wie echter DIX)
    // Basis 47.5%, +/- abhängig von OBV-Trend und Volumen
    const obvSignal = obv10 > obv20 ? 2.5 : -2.5;
    const volSignal = volRatio > 1.2 && priceChange5 > 0 ? 1.5
                    : volRatio > 1.2 && priceChange5 < 0 ? -1.5 : 0;
    const dix = Math.max(38, Math.min(56, 47.5 + obvSignal + volSignal));

    // GEX-Proxy aus Volumen-Anomalie
    const volAnomaly = (lastVol - avgVol20) / avgVol20 * 100;
    const gex = Math.round(volAnomaly * 80); // skaliert auf Mrd-ähnliche Werte

    // 20T-Durchschnitte
    const dixArr = [];
    for (let i = 20; i <= n; i++) {
      const sliceObv10 = obvArr.slice(i-10, i).reduce((a,b)=>a+b,0)/10;
      const sliceObv20 = obvArr.slice(i-20, i).reduce((a,b)=>a+b,0)/20;
      const sliceVol20 = vols.slice(i-20, i).reduce((a,b)=>a+b,0)/20;
      const sliceVol   = vols[i-1];
      const sliceVR    = sliceVol20 > 0 ? sliceVol/sliceVol20 : 1;
      const sliceP5    = i >= 6 ? (closes[i-1]/closes[i-6]-1)*100 : 0;
      const sliceObvSig = sliceObv10 > sliceObv20 ? 2.5 : -2.5;
      const sliceVolSig = sliceVR > 1.2 && sliceP5 > 0 ? 1.5 : sliceVR > 1.2 && sliceP5 < 0 ? -1.5 : 0;
      dixArr.push(Math.max(38, Math.min(56, 47.5 + sliceObvSig + sliceVolSig)));
    }
    const dixAvg20 = dixArr.length ? dixArr.reduce((a,b)=>a+b,0)/dixArr.length : dix;
    const gexAvg20 = 0; // Proxy-GEX Basis = 0

    return {
      dix:      Math.round(dix * 10) / 10,
      gex:      Math.round(gex / 1000) / 1000, // in Mrd
      dixAvg20: Math.round(dixAvg20 * 10) / 10,
      gexAvg20: gexAvg20,
      dixTrend: dix > dixAvg20 ? 'steigend' : 'fallend',
      gexTrend: gex > 0 ? 'positiv' : 'negativ',
      proxy:    true, // Flag: das ist ein Proxy, kein echter DIX
      spyPrice: Math.round(spy.price * 100) / 100,
      volRatio: Math.round(volRatio * 100) / 100,
    };
  },

  // ── PCR via VVIX + SKEW ───────────────────────────────────────────────────
  // VVIX = Volatilität der VIX-Optionen (Fear of Fear)
  // SKEW = Tail-Risk Index (institutionelles Hedging)
  async fetchPCR() {
    const [vvix, skew] = await Promise.all([
      this._fetchYahoo('^VVIX', 10),
      this._fetchYahoo('^SKEW', 10),
    ]);

    if (!vvix && !skew) return null;

    const vvixVal  = vvix ? vvix.price : null;
    const skewVal  = skew ? skew.price : null;

    // VVIX > 100 = erhöhte Angst bei Optionshändlern
    // SKEW > 135 = institutionelles Tail-Hedging (bärisch)
    // Synthetischer PCR aus VVIX/SKEW
    let pcr = 0.85; // Neutral-Basis
    if (vvixVal) {
      // VVIX 80=niedrig/bullisch, 100=neutral, 120+=Angst/bärisch
      pcr += (vvixVal - 100) / 200; // ±0.1 pro 20 VVIX-Punkte
    }
    if (skewVal) {
      // SKEW 115=normal, 130=erhöht, 145+=extrem
      pcr += (skewVal - 130) / 500; // ±0.03 pro 15 SKEW-Punkte
    }
    pcr = Math.max(0.4, Math.min(1.5, pcr));

    const signal = pcr < 0.7 ? 'ÜBERKAUFT' : pcr > 1.0 ? 'ÜBERVERKAUFT' : 'NEUTRAL';

    return {
      pcr:     Math.round(pcr * 100) / 100,
      pcrPrev: Math.round(pcr * 100) / 100,
      avg5:    Math.round(pcr * 100) / 100,
      trend:   'stabil',
      signal,
      vvix:    vvixVal ? Math.round(vvixVal * 100) / 100 : null,
      skew:    skewVal ? Math.round(skewVal * 100) / 100 : null,
      proxy:   true,
    };
  },

  // ── VIX TERM STRUCTURE ────────────────────────────────────────────────────
  async fetchVIXTerm() {
    const fetchVix = async (sym) => {
      const d = await this._fetchYahoo(sym, 10);
      return d ? d.price : null;
    };

    const [vix, vix3m] = await Promise.all([
      fetchVix('^VIX'),
      fetchVix('^VIX3M'),
    ]);

    if (!vix || !vix3m) return null;

    const spread   = Math.round((vix3m - vix) * 100) / 100;
    const contango = spread > 0;
    const ratio    = Math.round((vix / vix3m) * 100) / 100;

    return {
      vix:       Math.round(vix * 100) / 100,
      vix3m:     Math.round(vix3m * 100) / 100,
      spread,
      ratio,
      structure: contango ? 'CONTANGO' : 'BACKWARDATION',
      stress:    !contango || ratio > 0.95,
      signal:    !contango ? 'STRESS' : ratio > 0.90 ? 'ERHÖHT' : 'NORMAL',
    };
  },

  // ── ALLE DATEN PARALLEL LADEN ─────────────────────────────────────────────
  async fetchAll() {
    const [dix, pcr, vixTerm] = await Promise.allSettled([
      this.fetchDIX(),
      this.fetchPCR(),
      this.fetchVIXTerm(),
    ]);
    return {
      dix:       dix.status     === 'fulfilled' ? dix.value     : null,
      pcr:       pcr.status     === 'fulfilled' ? pcr.value     : null,
      vixTerm:   vixTerm.status === 'fulfilled' ? vixTerm.value : null,
      timestamp: new Date().toISOString(),
    };
  },

  // ── SCORE 0-100 ───────────────────────────────────────────────────────────
  score(data) {
    if (!data) return null;
    let components = {};

    if (data.dix) {
      const dixScore = Math.max(0, Math.min(100, ((data.dix.dix - 40) / (55 - 40)) * 100));
      components.dix = Math.round(dixScore);
      const gexScore = data.dix.gex >= 0 ? 65 : 35;
      components.gex = gexScore;
    }

    if (data.pcr) {
      // PCR contrarian: hoch = bullisch
      const pcrScore = Math.max(0, Math.min(100, ((data.pcr.pcr - 0.5) / (1.3 - 0.5)) * 100));
      components.pcr = Math.round(pcrScore);
    }

    if (data.vixTerm) {
      const vixScore = data.vixTerm.structure === 'CONTANGO'
        ? (data.vixTerm.ratio < 0.85 ? 80 : data.vixTerm.ratio < 0.92 ? 60 : 40)
        : (data.vixTerm.ratio > 1.0 ? 10 : 20);
      components.vixTerm = Math.round(vixScore);
    }

    const weights = { dix: 0.35, gex: 0.15, pcr: 0.25, vixTerm: 0.25 };
    let totalWeight = 0, weightedSum = 0;
    Object.keys(weights).forEach(k => {
      if (components[k] != null) {
        weightedSum += components[k] * weights[k];
        totalWeight += weights[k];
      }
    });

    const total = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
    return { total, components, weights, bullish: total >= 60, bearish: total <= 40 };
  },

  // ── SIGNAL INTERPRETATION ─────────────────────────────────────────────────
  interpret(scoreObj, data) {
    if (!scoreObj) return { label: '–', color: 'var(--text3)', emoji: '❓', desc: 'Keine Daten' };
    const s = scoreObj.total;
    let label, color, emoji;
    if      (s >= 75) { label='STARK BULLISCH'; color='var(--green)'; emoji='🟢'; }
    else if (s >= 60) { label='BULLISCH';       color='var(--green)'; emoji='🟢'; }
    else if (s >= 45) { label='NEUTRAL';         color='var(--amber)'; emoji='🟡'; }
    else if (s >= 30) { label='BÄRISCH';         color='var(--red)';   emoji='🔴'; }
    else              { label='STARK BÄRISCH';  color='var(--red)';   emoji='🔴'; }

    const parts = [];
    if (data?.dix)     parts.push('DIX-Proxy ' + data.dix.dix + '% (' + data.dix.dixTrend + ')');
    if (data?.pcr)     parts.push('VVIX ' + (data.pcr.vvix || '?') + ' · SKEW ' + (data.pcr.skew || '?'));
    if (data?.vixTerm) parts.push('VIX-Kurve: ' + data.vixTerm.structure);
    const desc = parts.join(' · ') || 'Keine Daten';

    return { label, color, emoji, desc, score: s };
  },

  // ── CACHE ─────────────────────────────────────────────────────────────────
  async fetchCached() {
    const now = Date.now();
    if (this._cache && (now - this._cacheTime) < this.CACHE_MINUTES * 60 * 1000) {
      return this._cache;
    }
    const data = await this.fetchAll();
    this._cache = data;
    this._cacheTime = now;
    return data;
  },

  clearCache() { this._cache = null; this._cacheTime = 0; },
};

console.log('[ko-darkpool.js] v1.2 geladen');
