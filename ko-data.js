/**
 * ko-data.js — Datenbeschaffung
 * Version: 1.1 | ko-scanner v=132+
 * Repository: ahsub/ko-modules
 * Abhängigkeiten: ko-config.js (optional)
 *
 * Zentraler Datenzugriff für alle Projekte.
 * Alle Funktionen geben null zurück wenn deaktiviert.
 */

var KoData = {

  // ── KONFIGURATION ─────────────────────────────────────────────
  get corsProxy() {
    return (typeof KoConfig !== 'undefined' && KoConfig.api && KoConfig.api.corsProxy)
      ? KoConfig.api.corsProxy
      : 'https://my-cors-proxy.ahildebrand.workers.dev';
  },

  // ── HILFSFUNKTIONEN ───────────────────────────────────────────
  async _fetch(url, opts) {
    const proxyUrl = this.corsProxy + '/?url=' + encodeURIComponent(url);
    try {
      const r = await fetch(proxyUrl, opts || {});
      if (!r.ok) return null;
      return await r.json();
    } catch(e) {
      console.warn('[KoData] fetch error:', url, e.message);
      return null;
    }
  },

  _yahooUrl(sym, interval, days) {
    const to   = Math.floor(Date.now() / 1000);
    const from = to - 60 * 60 * 24 * (days || 260);
    return 'https://query1.finance.yahoo.com/v7/finance/chart/'
      + encodeURIComponent(sym)
      + '?interval=' + (interval || '1d')
      + '&period1=' + from
      + '&period2=' + to
      + '&includePrePost=false';
  },

  // ── TICKER OHLCV ──────────────────────────────────────────────
  async fetchTicker(sym, interval, days) {
    const j = await this._fetch(this._yahooUrl(sym, interval || '1d', days || 260));
    const res = j?.chart?.result?.[0];
    if (!res) return null;
    const q      = res.indicators.quote[0];
    const closes = (q.close  || []).filter(v => v != null);
    const volumes= (q.volume || []).filter(v => v != null);
    const timestamps = res.timestamp || [];
    return {
      sym,
      closes,
      volumes,
      timestamps,
      price:  closes[closes.length - 1],
      meta:   res.meta || {},
    };
  },

  // ── OPTIONS CHAIN ────────────────────────────────────────────
  async fetchOptions(sym) {
    const url = 'https://query1.finance.yahoo.com/v7/finance/options/'
      + encodeURIComponent(sym);
    const j = await this._fetch(url);
    const chain = j?.optionChain?.result?.[0];
    if (!chain) return null;
    return {
      sym,
      spot:  chain.quote?.regularMarketPrice || 0,
      calls: chain.options?.[0]?.calls || [],
      puts:  chain.options?.[0]?.puts  || [],
    };
  },

  // ── VIX ──────────────────────────────────────────────────────
  async fetchVIX() {
    const data = await this.fetchTicker('^VIX', '1d', 10);
    return data ? data.price : null;
  },

  // ── FEAR & GREED (alternative.me, 17.07.2026) ───────────────
  // CNN-Endpunkt blockiert CORS-Proxy mit 418 (Bot-Detection).
  // alternative.me liefert denselben Fear & Greed Index,
  // hat korrekte CORS-Header und braucht keinen Proxy.
  async fetchCnnFearGreed() {
    try {
      const r = await fetch('https://api.alternative.me/fng/?limit=1', { cache: 'no-store' });
      if (!r.ok) return null;
      const j = await r.json();
      const entry = j?.data?.[0];
      if (!entry) return null;
      const score = parseInt(entry.value, 10);
      // alternative.me rating → deutschen Text mappen
      const ratingMap = {
        'Extreme Fear':  'Extreme Angst',
        'Fear':          'Angst',
        'Neutral':       'Neutral',
        'Greed':         'Gier',
        'Extreme Greed': 'Extreme Gier',
      };
      return {
        score:  score,
        rating: ratingMap[entry.value_classification] || entry.value_classification,
      };
    } catch(e) {
      console.warn('[KoData] Fear & Greed fetch error:', e.message);
      return null;
    }
  },

  // ── SEKTOR ETF ───────────────────────────────────────────────
  async fetchSectorETF(sym, days) {
    return this.fetchTicker(sym, '1d', days || 280);
  },

  // ── EARNINGS ─────────────────────────────────────────────────
  // Vereinfachter Wrapper — volle Implementierung im Scanner
  async fetchEarnings(sym) {
    // Delegiert an Scanner-Funktion falls vorhanden
    if (typeof fetchEarningsDate === 'function') {
      return fetchEarningsDate(sym);
    }
    return null;
  },

  // ── BATCH FETCH ──────────────────────────────────────────────
  // Mehrere Ticker parallel mit Rate-Limiting
  async fetchBatch(syms, interval, days, concurrency) {
    concurrency = concurrency || 3;
    const results = {};
    for (let i = 0; i < syms.length; i += concurrency) {
      const batch = syms.slice(i, i + concurrency);
      const fetched = await Promise.all(
        batch.map(sym => this.fetchTicker(sym, interval, days)
          .then(d => ({ sym, data: d }))
          .catch(() => ({ sym, data: null }))
        )
      );
      fetched.forEach(({ sym, data }) => { results[sym] = data; });
      if (i + concurrency < syms.length) {
        await new Promise(r => setTimeout(r, 300)); // Rate limit
      }
    }
    return results;
  },
};

console.log('[ko-data.js] geladen');
