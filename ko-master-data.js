/**
 * ko-master-data.js — Master Market Data Loader
 * Version: 1.0 | ko-scanner v=148+
 * Repository: ahsub/ko-modules
 *
 * Lädt die zentral berechnete master_market_data.json aus Cloudflare KV.
 * Ersetzt im neuen Architektur-Modell die direkte Yahoo-Finance-Abfrage
 * für Massen-Scans (S&P500, Nasdaq100, ETFs, Krypto).
 *
 * Fallback: Wenn KV nicht verfügbar, weiterhin Live-Scan via CORS-Proxy.
 */

var KoMasterData = {

  // ── KONFIGURATION ─────────────────────────────────────────────────────────
  KV_KEY:        'master_market_data',
  CACHE_MINUTES: 60,  // Wie lange die lokale Kopie gültig ist

  get syncUrl() {
    return (typeof KoConfig !== 'undefined' && KoConfig.api && KoConfig.api.koSync)
      ? KoConfig.api.koSync
      : 'https://ko-sync.ahildebrand.workers.dev';
  },

  _cache:     null,
  _cacheTime: 0,
  _loading:   false,

  // ── HAUPT-LADE-FUNKTION ───────────────────────────────────────────────────
  async load(forceReload) {
    const now = Date.now();

    // Cache prüfen
    if (!forceReload && this._cache &&
        (now - this._cacheTime) < this.CACHE_MINUTES * 60 * 1000) {
      console.log('[KoMasterData] Aus Cache geladen');
      return this._cache;
    }

    try {
      console.log('[KoMasterData] Lade master_market_data aus Cloudflare KV...');
      const url = this.syncUrl + '/get?key=' + this.KV_KEY;
      const r   = await fetch(url, { cache: 'no-store' });

      if (!r.ok) throw new Error('HTTP ' + r.status);

      const data = await r.json();
      if (!data || !data.meta) throw new Error('Ungültiges Datenformat');

      this._cache     = data;
      this._cacheTime = now;

      const age = this._getAgeMinutes(data.meta.generated);
      console.log(
        `[KoMasterData] Geladen — ${data.meta.total} Ticker | ` +
        `${(JSON.stringify(data).length / 1024).toFixed(0)} KB | ` +
        `Alter: ${age} Min`
      );
      return data;

    } catch(e) {
      console.warn('[KoMasterData] KV-Laden fehlgeschlagen:', e.message);
      return null;
    }
  },

  // ── TICKER SUCHE ──────────────────────────────────────────────────────────
  getTicker(sym) {
    if (!this._cache || !this._cache.tickers) return null;
    return this._cache.tickers.find(t => t.sym === sym) || null;
  },

  // ── FILTER-FUNKTIONEN ─────────────────────────────────────────────────────
  getTop40() {
    return this._cache?.top40 || [];
  },

  getMeanReversion() {
    return this._cache?.meanReversion || [];
  },

  getByGrade(grade) {
    if (!this._cache?.tickers) return [];
    return this._cache.tickers.filter(t => t.grade === grade);
  },

  getByMinScore(minScore) {
    if (!this._cache?.tickers) return [];
    return this._cache.tickers
      .filter(t => t.score >= minScore)
      .sort((a, b) => b.score - a.score);
  },

  getBullishTickers(minBullSignals = 2) {
    if (!this._cache?.tickers) return [];
    return this._cache.tickers
      .filter(t => (t.bullSignals || 0) >= minBullSignals && (t.score || 0) >= 50)
      .sort((a, b) => b.score - a.score);
  },

  getCryptoTickers() {
    if (!this._cache?.tickers) return [];
    return this._cache.tickers.filter(t => t.sym.endsWith('-USD'));
  },

  getSectorETFs() {
    const etfList = ['SPY','QQQ','IWM','XLK','XLF','XLE','XLV','XLI','XLY',
                     'XLP','XLU','XLRE','XLB','XLC','SMH','SOXX','ARKK','GLD','TLT'];
    if (!this._cache?.tickers) return [];
    return this._cache.tickers.filter(t => etfList.includes(t.sym));
  },

  // ── MARKT-DATEN ───────────────────────────────────────────────────────────
  getDIX() { return this._cache?.market?.dixGex || null; },
  getPCR() { return this._cache?.market?.pcr    || null; },
  getVIXTerm() { return this._cache?.market?.vixTerm || null; },

  // ── META ──────────────────────────────────────────────────────────────────
  getMeta() { return this._cache?.meta || null; },

  isStale() {
    if (!this._cache?.meta?.generated) return true;
    return this._getAgeMinutes(this._cache.meta.generated) > 60 * 8; // >8h = veraltet
  },

  _getAgeMinutes(isoString) {
    try {
      const generated = new Date(isoString).getTime();
      return Math.round((Date.now() - generated) / 60000);
    } catch(e) { return 999; }
  },

  // ── STATUS ANZEIGE (für UI) ───────────────────────────────────────────────
  getStatusBadge() {
    if (!this._cache) return { text: 'Nicht geladen', color: 'var(--text3)', emoji: '⚫' };
    const age   = this._getAgeMinutes(this._cache.meta?.generated);
    const total = this._cache.meta?.total || 0;
    if      (age < 120) return { text: `${total} Ticker · ${age} Min alt`, color: 'var(--green)', emoji: '🟢' };
    else if (age < 480) return { text: `${total} Ticker · ${Math.round(age/60)}h alt`, color: 'var(--amber)', emoji: '🟡' };
    else                return { text: `Veraltet (${Math.round(age/60)}h)`, color: 'var(--red)', emoji: '🔴' };
  },

  clearCache() {
    this._cache     = null;
    this._cacheTime = 0;
    console.log('[KoMasterData] Cache geleert');
  },
};

console.log('[ko-master-data.js] v1.0 geladen');
