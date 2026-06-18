/**
 * ko-darkpool.js — Dark Pool & Institutional Flow Analyse
 * Version: 1.1 | ko-scanner v=142+
 * Repository: ahsub/ko-modules
 * Abhängigkeiten: ko-config.js (optional)
 *
 * Datenquellen:
 *   DIX / GEX  → squeezemetrics.com/monitor/static/dix.csv (kostenlos)
 *   PCR        → CBOE via Yahoo Finance ^PCALL
 *   VIX Term   → Yahoo Finance ^VIX + ^VIX3M (Contango/Backwardation)
 *
 * Verwendung:
 *   const result = await KoDarkPool.fetchAll();
 *   const score  = KoDarkPool.score(result);
 *   const signal = KoDarkPool.interpret(score);
 */

var KoDarkPool = {

  // ── KONFIGURATION ─────────────────────────────────────────────────────────
  get corsProxy() {
    return (typeof KoConfig !== 'undefined' && KoConfig.api && KoConfig.api.corsProxy)
      ? KoConfig.api.corsProxy
      : 'https://my-cors-proxy.ahildebrand.workers.dev';
  },

  // Historische DIX-Durchschnitte (Baseline für Normalisierung)
  // Quelle: squeezemetrics langjährige Daten S&P500
  DIX_AVG:  45.0,   // Ø DIX ~45% = neutral
  DIX_HIGH: 50.0,   // >50% = bullisch (Institutionen kaufen verdeckt)
  DIX_LOW:  40.0,   // <40% = bärisch
  GEX_AVG:  0,      // GEX in Mrd USD, 0 = neutral
  GEX_HIGH: 3000,   // >3Mrd = stabilisierend (MM hedgen Long)
  GEX_LOW: -3000,   // <-3Mrd = destabilisierend (MM hedgen Short)

  // ── HILFSFUNKTIONEN ───────────────────────────────────────────────────────
  async _fetch(url) {
    const proxyUrl = this.corsProxy + '/?url=' + encodeURIComponent(url);
    try {
      const r = await fetch(proxyUrl);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r;
    } catch(e) {
      console.warn('[KoDarkPool] fetch error:', url, e.message);
      return null;
    }
  },

  async _fetchJson(url) {
    const r = await this._fetch(url);
    if (!r) return null;
    try { return await r.json(); } catch(e) { return null; }
  },

  async _fetchText(url) {
    const r = await this._fetch(url);
    if (!r) return null;
    try { return await r.text(); } catch(e) { return null; }
  },

  // ── CSV PARSER ────────────────────────────────────────────────────────────
  _parseCSV(text, maxRows) {
    if (!text) return [];
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
    const rows = [];
    const start = Math.max(1, lines.length - (maxRows || 30));
    for (let i = start; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/"/g,''));
      const row = {};
      headers.forEach((h, j) => { row[h] = vals[j]; });
      rows.push(row);
    }
    return rows;
  },

  // ── DIX & GEX von squeezemetrics ─────────────────────────────────────────
  async fetchDIX() {
    const url = 'https://squeezemetrics.com/monitor/static/dix.csv';
    const text = await this._fetchText(url);
    if (!text) return null;

    const rows = this._parseCSV(text, 30);
    if (!rows.length) return null;

    // Letzte Zeile = aktuellster Tag
    const last = rows[rows.length - 1];
    const dix  = parseFloat(last['dix'] || last['DIX']) * 100; // 0-1 → Prozent
    const gex  = parseFloat(last['gex'] || last['GEX']);       // in USD
    const date = last['date'] || last['Date'] || last[Object.keys(last)[0]];

    // 20-Tage Durchschnitt für Trend
    const recent = rows.slice(-20);
    const dixAvg20 = recent.reduce((s, r) => s + parseFloat(r['dix']||r['DIX']||0)*100, 0) / recent.length;
    const gexAvg20 = recent.reduce((s, r) => s + parseFloat(r['gex']||r['GEX']||0), 0) / recent.length;

    return {
      date,
      dix:       Math.round(dix * 10) / 10,
      gex:       Math.round(gex / 1e6) / 1e3, // → Mrd USD
      dixAvg20:  Math.round(dixAvg20 * 10) / 10,
      gexAvg20:  Math.round(gexAvg20 / 1e6) / 1e3,
      dixTrend:  dix > dixAvg20 ? 'steigend' : 'fallend',
      gexTrend:  gex > gexAvg20 ? 'steigend' : 'fallend',
      history:   rows.slice(-10).map(r => ({
        date: r['date'] || r['Date'],
        dix:  Math.round(parseFloat(r['dix']||r['DIX']||0)*1000)/10,
        gex:  Math.round(parseFloat(r['gex']||r['GEX']||0)/1e9*10)/10,
      })),
    };
  },

  // ── PUT/CALL RATIO von CBOE (CSV) ────────────────────────────────────────
  async fetchPCR() {
    // CBOE Total Put/Call Ratio — direkte CSV-Datei
    const url = 'https://www.cboe.com/publish/scheduledtask/mktdata/datahouse/totalpc.csv';
    const text = await this._fetchText(url);
    if (!text) return null;

    // CBOE CSV Format: "DATE","CALL","PUT","TOTAL","P/C Ratio"
    // Erste Zeilen sind Header/Kommentare — letzte Zeilen sind Daten
    const lines = text.trim().split('\n').filter(l => l && !l.startsWith('"DATE') && !l.startsWith('DATE'));
    if (!lines.length) return null;

    const parseRow = (line) => {
      const parts = line.split(',').map(v => v.replace(/"/g,'').trim());
      return { date: parts[0], pcr: parseFloat(parts[4]) };
    };

    const rows = lines.map(parseRow).filter(r => !isNaN(r.pcr));
    if (!rows.length) return null;

    const last    = rows[rows.length - 1];
    const prev    = rows[rows.length - 2] || last;
    const last5   = rows.slice(-5);
    const avg5    = last5.reduce((s,r) => s + r.pcr, 0) / last5.length;

    return {
      date:    last.date,
      pcr:     Math.round(last.pcr * 100) / 100,
      pcrPrev: Math.round(prev.pcr * 100) / 100,
      avg5:    Math.round(avg5 * 100) / 100,
      trend:   last.pcr > prev.pcr ? 'steigend' : 'fallend',
      signal:  last.pcr < 0.7 ? 'ÜBERKAUFT' : last.pcr > 1.0 ? 'ÜBERVERKAUFT' : 'NEUTRAL',
    };
  },

  // ── VIX TERM STRUCTURE ────────────────────────────────────────────────────
  async fetchVIXTerm() {
    const to   = Math.floor(Date.now() / 1000);
    const from = to - 60 * 60 * 24 * 10;

    const fetchVix = async (sym) => {
      const url = 'https://query1.finance.yahoo.com/v7/finance/chart/'
        + encodeURIComponent(sym)
        + '?interval=1d&period1=' + from + '&period2=' + to;
      const j = await this._fetchJson(url);
      const res = j?.chart?.result?.[0];
      if (!res) return null;
      const closes = (res.indicators?.quote?.[0]?.close || []).filter(v => v != null);
      return closes.length ? closes[closes.length - 1] : null;
    };

    const [vix, vix3m] = await Promise.all([
      fetchVix('^VIX'),
      fetchVix('^VIX3M'),
    ]);

    if (!vix || !vix3m) return null;

    const spread    = Math.round((vix3m - vix) * 100) / 100;
    const contango  = spread > 0;  // VIX3M > VIX = normal/Contango = ruhig
    const ratio     = Math.round((vix / vix3m) * 100) / 100;

    return {
      vix:      Math.round(vix * 100) / 100,
      vix3m:    Math.round(vix3m * 100) / 100,
      spread,
      ratio,
      // Contango = normal, Markt ruhig
      // Backwardation (spread<0) = Stress, kurzfristige Angst > langfristige
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
      dix:     dix.status     === 'fulfilled' ? dix.value     : null,
      pcr:     pcr.status     === 'fulfilled' ? pcr.value     : null,
      vixTerm: vixTerm.status === 'fulfilled' ? vixTerm.value : null,
      timestamp: new Date().toISOString(),
    };
  },

  // ── INSTITUTIONAL FLOW SCORE 0-100 ────────────────────────────────────────
  // 100 = maximale institutionelle Kaufbereitschaft (bullisch)
  //   0 = maximale institutionelle Verkaufsbereitschaft (bärisch)
  score(data) {
    if (!data) return null;
    let score = 50; // Neutral-Start
    let components = {};

    // ── DIX Komponente (Gewicht 40%) ──────────────────────────────
    if (data.dix) {
      const dix = data.dix.dix;
      // DIX: 40%=0 Punkte, 45%=50 Punkte, 50%+=100 Punkte
      const dixScore = Math.max(0, Math.min(100,
        ((dix - this.DIX_LOW) / (this.DIX_HIGH - this.DIX_LOW)) * 100
      ));
      // Trend-Bonus: DIX steigend = +5
      const dixTrendBonus = data.dix.dixTrend === 'steigend' ? 5 : -5;
      components.dix = Math.round(dixScore + dixTrendBonus);

      // GEX Komponente (Gewicht 20%)
      const gexGrd = data.dix.gex; // in Mrd
      // GEX positiv = stabilisierend = bullisch
      const gexScore = Math.max(0, Math.min(100,
        50 + (gexGrd / (this.GEX_HIGH / 1e9)) * 25
      ));
      components.gex = Math.round(gexScore);
    }

    // ── PCR Komponente (Gewicht 25%) ──────────────────────────────
    if (data.pcr) {
      const pcr = data.pcr.pcr;
      // PCR contrarian: hoch = bullisch (Angst = Kaufgelegenheit)
      // PCR >1.2 → 100, PCR 0.8 → 50, PCR <0.5 → 0
      const pcrScore = Math.max(0, Math.min(100,
        ((pcr - 0.5) / (1.2 - 0.5)) * 100
      ));
      components.pcr = Math.round(pcrScore);
    }

    // ── VIX Term Komponente (Gewicht 15%) ─────────────────────────
    if (data.vixTerm) {
      // Contango + niedriger Ratio = bullisch
      const vixScore = data.vixTerm.structure === 'CONTANGO'
        ? (data.vixTerm.ratio < 0.85 ? 80 : data.vixTerm.ratio < 0.92 ? 60 : 40)
        : (data.vixTerm.ratio > 1.0 ? 10 : 20);
      components.vixTerm = Math.round(vixScore);
    }

    // ── Gewichteter Gesamt-Score ───────────────────────────────────
    const weights = { dix: 0.40, gex: 0.20, pcr: 0.25, vixTerm: 0.15 };
    let totalWeight = 0;
    let weightedSum = 0;

    Object.keys(weights).forEach(k => {
      if (components[k] != null) {
        weightedSum  += components[k] * weights[k];
        totalWeight  += weights[k];
      }
    });

    const finalScore = totalWeight > 0
      ? Math.round(weightedSum / totalWeight)
      : 50;

    return {
      total:      finalScore,
      components,
      weights,
      bullish:    finalScore >= 60,
      bearish:    finalScore <= 40,
    };
  },

  // ── SIGNAL INTERPRETATION ─────────────────────────────────────────────────
  interpret(scoreObj, data) {
    if (!scoreObj) return { label: '–', color: 'var(--text3)', emoji: '❓', desc: 'Keine Daten' };

    const s = scoreObj.total;

    let label, color, emoji, desc;

    if      (s >= 75) { label='STARK BULLISCH'; color='var(--green)';  emoji='🟢'; }
    else if (s >= 60) { label='BULLISCH';       color='var(--green)';  emoji='🟢'; }
    else if (s >= 45) { label='NEUTRAL';         color='var(--amber)';  emoji='🟡'; }
    else if (s >= 30) { label='BÄRISCH';         color='var(--red)';    emoji='🔴'; }
    else              { label='STARK BÄRISCH';  color='var(--red)';    emoji='🔴'; }

    // Beschreibung aus Komponenten ableiten
    const parts = [];
    if (data?.dix) {
      parts.push('DIX ' + data.dix.dix + '% (' + data.dix.dixTrend + ')');
    }
    if (data?.pcr) {
      parts.push('PCR ' + data.pcr.pcr + ' → ' + data.pcr.signal);
    }
    if (data?.vixTerm) {
      parts.push('VIX-Kurve: ' + data.vixTerm.structure);
    }
    desc = parts.join(' · ') || 'Keine Daten verfügbar';

    return { label, color, emoji, desc, score: s };
  },

  // ── CACHE ─────────────────────────────────────────────────────────────────
  _cache: null,
  _cacheTime: 0,
  CACHE_MINUTES: 30,

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

  clearCache() {
    this._cache = null;
    this._cacheTime = 0;
  },
};

console.log('[ko-darkpool.js] v1.1 geladen');
