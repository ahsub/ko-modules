/**
 * ko-market-state.js — Market State Engine v2.0
 * ================================================
 * Bestimmt das übergeordnete Markt-Regime aus normalisierten
 * Dark-Pool, Volatilitäts- und Flow-Indikatoren.
 *
 * NEU in v2.0:
 *   - loadHistoryFromAggregator(): lädt 30T-History aus master_market_data.json (KV)
 *     → Z-Scores sofort zuverlässig ab Tag 1, kein inkrementelles Aufwärmen nötig
 *   - restoreLastRegime(): stellt letztes Regime aus localStorage beim Start wieder her
 *   - getRegimeSummary(): kompakte Zusammenfassung für Morning Briefing
 *
 * Regime-Zustände:
 *   BULL_QUIET          → Trendfolge + CSP voll freigegeben
 *   BULL_FRAGILE        → Trendfolge mit engen Stops, CSP drosseln
 *   STRESS_UNSTABLE     → Trendfolge gesperrt, nur defensive MR
 *   POST_PANIC_REVERSION→ Mean Reversion Priorität 1, CSP optimal
 *   NEUTRAL             → Kein klares Signal
 *
 * Datenquellen:
 *   - mseHistory aus master_market_data (Aggregator) — 30T VVIX/SKEW/VIX/VIX3M
 *   - Dark Pool Tab (DIX/GEX-Proxy, live)
 *   - VIX Term Structure (live von Yahoo via CORS-Proxy)
 */

var KoMarketState = {

  // ── KONFIGURATION ──────────────────────────────────────────────
  LOOKBACK: 20,

  THRESHOLDS: {
    vixTermContango:     1.05,
    vixTermFlat:         0.98,
    vvixHighStress:      1.5,
    vvixLowStress:      -1.0,
    gexShortGamma:      -1.0,
    dixAccumulation:     0.5,
    skewHighHedging:    80,
  },

  _history: {
    vvix: [], gex: [], dix: [], skew: [], vixRatio: [],
  },

  _lastRegime:  null,
  _lastMetrics: null,
  _lastUpdate:  null,
  _historySource: 'incremental',  // 'aggregator' | 'incremental'

  // ── Z-SCORE & PERZENTIL ────────────────────────────────────────
  zScore(series, currentVal) {
    if (!series || series.length < 3) return 0;
    const n    = Math.min(series.length, this.LOOKBACK);
    const data = series.slice(-n);
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
    const std  = Math.sqrt(variance);
    if (std === 0) return 0;
    return Math.round(((currentVal - mean) / std) * 100) / 100;
  },

  percentileRank(series, currentVal) {
    if (!series || series.length < 3) return 50;
    const n    = Math.min(series.length, this.LOOKBACK);
    const data = series.slice(-n);
    const below = data.filter(v => v <= currentVal).length;
    return Math.round((below / data.length) * 100);
  },

  // ── HISTORY AUS AGGREGATOR LADEN (v2.0 NEU) ───────────────────
  /**
   * Lädt die 30T-History aus master_market_data.mseHistory (Cloudflare KV).
   * Füllt _history.vvix, .skew, .vixRatio mit echten Tagesdaten.
   * Wird einmalig beim App-Start aufgerufen (vor dem ersten analyze()).
   */
  async loadHistoryFromAggregator() {
    try {
      var kvUrl = 'https://ko-sync.ahildebrand.workers.dev/get?key=master_market_data';
      var r = await fetch(kvUrl);
      if (!r.ok) throw new Error('KV ' + r.status);
      var json = await r.json();

      var mseH = json?.market?.mseHistory;
      if (!mseH || !mseH.dates || mseH.dates.length < 5) {
        console.warn('[MSE v2] mseHistory nicht im KV oder zu kurz — Fallback auf inkrementell');
        return false;
      }

      // Arrays bereinigen (null-Werte filtern)
      var clean = function(arr) {
        return (arr || []).filter(function(v) { return v != null && !isNaN(v); });
      };

      this._history.vvix     = clean(mseH.vvix);
      this._history.skew     = clean(mseH.skew);
      this._history.vix      = clean(mseH.vix);
      this._history.vixRatio = clean(mseH.vixRatio);
      // GEX/DIX bleiben inkrementell (kein Aggregator-Data)

      this._historySource = 'aggregator';
      console.log('[MSE v2] History aus Aggregator geladen — ' + mseH.dates.length + ' Tage | VVIX-Punkte: ' + this._history.vvix.length + ' | SKEW: ' + this._history.skew.length);
      return true;
    } catch(e) {
      console.warn('[MSE v2] loadHistoryFromAggregator Fehler:', e.message);
      return false;
    }
  },

  // ── LETZTES REGIME WIEDERHERSTELLEN ───────────────────────────
  /**
   * Stellt _lastRegime + _lastMetrics aus localStorage wieder her.
   * Damit ist das Badge sofort nach App-Start befüllt (kein Morning Briefing nötig).
   */
  restoreLastRegime() {
    try {
      var saved = localStorage.getItem('ko_mse_last_result');
      if (!saved) return false;
      var obj = JSON.parse(saved);
      // Nur wiederherstellen wenn nicht älter als 18 Stunden
      if (obj._lastUpdate) {
        var age = (Date.now() - new Date(obj._lastUpdate).getTime()) / 3600000;
        if (age > 18) {
          console.log('[MSE v2] Gespeichertes Regime zu alt (' + age.toFixed(1) + 'h) — ignoriert');
          return false;
        }
      }
      this._lastRegime  = obj._lastRegime  || null;
      this._lastMetrics = obj._lastMetrics || null;
      this._lastUpdate  = obj._lastUpdate  || null;
      console.log('[MSE v2] Regime wiederhergestellt: ' + this._lastRegime + ' (vor ' + (obj._lastUpdate ? new Date(obj._lastUpdate).toLocaleTimeString('de-DE') : '?') + ')');
      return true;
    } catch(e) { return false; }
  },

  // ── HISTORY UPDATEN ────────────────────────────────────────────
  addDataPoint(rawData) {
    var h    = this._history;
    var push = function(arr, val) {
      if (val != null && !isNaN(val)) {
        arr.push(val);
        if (arr.length > 60) arr.shift();
      }
    };
    push(h.vvix,     rawData.vvix);
    push(h.gex,      rawData.gex);
    push(h.dix,      rawData.dix);
    push(h.skew,     rawData.skew);
    push(h.vixRatio, rawData.vixRatio);
  },

  // ── NORMALISIERUNG ─────────────────────────────────────────────
  normalizeMetrics(rawData) {
    var h = this._history;
    return {
      vvix_raw:      rawData.vvix,
      gex_raw:       rawData.gex,
      dix_raw:       rawData.dix,
      skew_raw:      rawData.skew,
      vixRatio:      rawData.vixRatio,

      vvix_z20:   this.zScore(h.vvix,     rawData.vvix),
      gex_z20:    this.zScore(h.gex,      rawData.gex),
      dix_z20:    this.zScore(h.dix,      rawData.dix),
      skew_pct20: this.percentileRank(h.skew, rawData.skew),

      term_structure: rawData.vixRatio > this.THRESHOLDS.vixTermContango ? 'CONTANGO'
                    : rawData.vixRatio < this.THRESHOLDS.vixTermFlat     ? 'BACKWARDATION'
                    : rawData.vixRatio != null                            ? 'FLAT'
                    : 'UNKNOWN',

      // Metainfo für Debug
      _historyLengths: {
        vvix: h.vvix.length, skew: h.skew.length,
        gex:  h.gex.length,  dix:  h.dix.length, vixRatio: (h.vixRatio||[]).length,
      },
      _historySource: this._historySource,
    };
  },

  // ── REGIME BESTIMMUNG (Geminis Blueprint) ──────────────────────
  determineRegime(metrics) {
    var vvix_z20    = metrics.vvix_z20;
    var gex_z20     = metrics.gex_z20;
    var dix_z20     = metrics.dix_z20;
    var skew_pct20  = metrics.skew_pct20;
    var vixRatio    = metrics.vixRatio;
    var term        = metrics.term_structure;
    var T           = this.THRESHOLDS;

    // 1. STRESS_UNSTABLE
    if (term === 'BACKWARDATION' ||
        (vvix_z20 > T.vvixHighStress && gex_z20 < T.gexShortGamma)) {
      return 'STRESS_UNSTABLE';
    }
    // 2. POST_PANIC_REVERSION
    if (term === 'FLAT' && dix_z20 > T.dixAccumulation && vvix_z20 < 0) {
      return 'POST_PANIC_REVERSION';
    }
    // 3. BULL_FRAGILE
    if (term === 'CONTANGO' && skew_pct20 > T.skewHighHedging && vvix_z20 > 0.8) {
      return 'BULL_FRAGILE';
    }
    // 4. BULL_QUIET
    if (term === 'CONTANGO' && gex_z20 > 0 && dix_z20 >= -0.5) {
      return 'BULL_QUIET';
    }
    return 'NEUTRAL';
  },

  // ── STRATEGY ROUTER ────────────────────────────────────────────
  getStrategyGates(regime) {
    var gates = {
      BULL_QUIET: {
        label:       '🟢 BULL QUIET — Stabil & Unterstützt',
        color:       'var(--green)',
        description: 'Volatilität komprimiert · Dealer dämpfen · stetiger Zufluss',
        strategies: {
          momentum:  { active: true,  priority: 1, note: 'Voll freigegeben — Breakouts bevorzugen' },
          swing:     { active: true,  priority: 1, note: 'Voll freigegeben — Pullbacks kaufen' },
          csp_wheel: { active: true,  priority: 2, note: 'ATM-Strikes aggressiv — kaum Gap-Risiko' },
          meanrev:   { active: false, priority: 3, note: 'Nicht empfohlen — kein Oversold-Signal' },
          breakout:  { active: true,  priority: 1, note: 'Ideales Breakout-Umfeld' },
        },
        action: 'Trendfolge & aggressive CSPs · Breakouts bevorzugen',
      },
      BULL_FRAGILE: {
        label:       '🟡 BULL FRAGILE — Vorsicht geboten',
        color:       'var(--amber)',
        description: 'Index steigt · aber VVIX & Skew nehmen zu · Air-Pocket Risiko',
        strategies: {
          momentum:  { active: true,  priority: 2, note: 'Freigegeben — aber engere Trailing-Stops' },
          swing:     { active: true,  priority: 2, note: 'Nur bei extrem starken Titeln (A+)' },
          csp_wheel: { active: true,  priority: 2, note: 'DROSSELN — defensive Strikes (Δ<0.25)' },
          meanrev:   { active: false, priority: 3, note: 'Nicht empfohlen' },
          breakout:  { active: false, priority: 3, note: 'Vorsicht — Fehlausbrüche möglich' },
        },
        action: 'Engere Stops · Defensive CSP-Strikes · Nur A+-Qualität',
      },
      STRESS_UNSTABLE: {
        label:       '🔴 STRESS UNSTABLE — Defensiv',
        color:       'var(--red)',
        description: 'Gamma-Flip · Dealer beschleunigen Abwärts · Backwardation',
        strategies: {
          momentum:  { active: false, priority: 0, note: 'GESPERRT — fallende Messer' },
          swing:     { active: false, priority: 0, note: 'GESPERRT — Fehlausbrüche dominant' },
          csp_wheel: { active: true,  priority: 3, note: 'Nur Δ<0.15 auf krisenresistente Value-Titel' },
          meanrev:   { active: true,  priority: 1, note: 'Selektiv für Short-Squeeze Rebounds' },
          breakout:  { active: false, priority: 0, note: 'GESPERRT' },
        },
        action: 'Positionen absichern · Nur defensive CSPs · MR selektiv',
      },
      POST_PANIC_REVERSION: {
        label:       '🔵 POST-PANIC — Reversion Phase',
        color:       '#06b6d4',
        description: 'Panik ebbt ab · Vol-Crush · Dark Pools akkumulieren massiv',
        strategies: {
          momentum:  { active: false, priority: 2, note: 'Warten auf Bodenbildung' },
          swing:     { active: false, priority: 2, note: 'Warten auf Trendbestätigung' },
          csp_wheel: { active: true,  priority: 1, note: 'OPTIMAL — erhöhte IV verkaufen · hohe Prämien' },
          meanrev:   { active: true,  priority: 1, note: 'PRIORITÄT 1 — Long-Rebounds überverkaufter Titel' },
          breakout:  { active: false, priority: 3, note: 'Zu früh — kein nachhaltiger Trend' },
        },
        action: 'Mean Reversion Priorität 1 · CSP-Prämien einsammeln · Vol-Crush nutzen',
      },
      NEUTRAL: {
        label:       '⚪ NEUTRAL — Kein klares Signal',
        color:       'var(--text3)',
        description: 'Gemischte Signale · Daten unvollständig',
        strategies: {
          momentum:  { active: true, priority: 2, note: 'Selektiv — nur A+ Qualität' },
          swing:     { active: true, priority: 2, note: 'Selektiv' },
          csp_wheel: { active: true, priority: 2, note: 'Konservative Strikes' },
          meanrev:   { active: true, priority: 2, note: 'Selektiv' },
          breakout:  { active: true, priority: 2, note: 'Selektiv' },
        },
        action: 'Selektiv vorgehen · Nur höchste Qualität handeln',
      },
    };
    return gates[regime] || gates.NEUTRAL;
  },

  // ── HAUPT-FUNKTION ─────────────────────────────────────────────
  analyze(rawData) {
    this.addDataPoint(rawData);
    var metrics  = this.normalizeMetrics(rawData);
    var regime   = this.determineRegime(metrics);
    var gates    = this.getStrategyGates(regime);

    this._lastRegime  = regime;
    this._lastMetrics = metrics;
    this._lastUpdate  = new Date().toISOString();

    // Persistieren für App-Neustart
    try {
      localStorage.setItem('ko_mse_last_result', JSON.stringify({
        _lastRegime:  regime,
        _lastMetrics: metrics,
        _lastUpdate:  this._lastUpdate,
      }));
    } catch(e) {}

    return {
      regime,
      metrics,
      gates,
      color:       gates.color,
      label:       gates.label,
      description: gates.description,
      action:      gates.action,
      strategies:  gates.strategies,
    };
  },

  // ── KOMPAKTE ZUSAMMENFASSUNG für Morning Briefing ──────────────
  getRegimeSummary() {
    if (!this._lastRegime) return 'Kein Regime-Daten verfügbar.';
    var gates   = this.getStrategyGates(this._lastRegime);
    var m       = this._lastMetrics || {};
    var src     = this._historySource === 'aggregator' ? '(30T-History)' : '(inkrementell)';
    return gates.label + '\n' + gates.description + '\n' +
      'VVIX Z: ' + (m.vvix_z20 != null ? m.vvix_z20.toFixed(2) : '—') +
      ' | SKEW Pct: ' + (m.skew_pct20 != null ? m.skew_pct20 + '%' : '—') +
      ' | Term: ' + (m.term_structure || '—') + ' ' + src + '\n' +
      'Aktion: ' + gates.action;
  },

  // ── HILFSFUNKTIONEN ────────────────────────────────────────────
  getBadgeText() {
    if (!this._lastRegime) return '— Regime';
    return this.getStrategyGates(this._lastRegime).label;
  },

  isStrategyActive(strategyKey) {
    if (!this._lastRegime) return true;
    var gates = this.getStrategyGates(this._lastRegime);
    return (gates.strategies[strategyKey] || {}).active !== false;
  },

  getStrategyNote(strategyKey) {
    if (!this._lastRegime) return '';
    var gates = this.getStrategyGates(this._lastRegime);
    return (gates.strategies[strategyKey] || {}).note || '';
  },

  // ── PERSIST & RESTORE (History) ───────────────────────────────
  saveHistory() {
    try {
      // Aggregator-History nicht überschreiben (kommt täglich frisch)
      if (this._historySource !== 'aggregator') {
        localStorage.setItem('ko_mse_history', JSON.stringify(this._history));
      }
    } catch(e) {}
  },

  loadHistory() {
    try {
      var saved = JSON.parse(localStorage.getItem('ko_mse_history') || '{}');
      if (saved.vvix && saved.vvix.length > 0) this._history = saved;
    } catch(e) {}
  },
};

// ── INITIALISIERUNG ────────────────────────────────────────────────────────
// 1. localStorage History laden (Fallback für ersten Tag)
KoMarketState.loadHistory();

// 2. Letztes Regime sofort wiederherstellen (Badge befüllen ohne Morning Briefing)
KoMarketState.restoreLastRegime();

// 3. Aggregator-History asynchron nachladen (überschreibt inkrementelle History)
//    Wird beim nächsten analyze()-Aufruf (Morning Briefing) wirksam
KoMarketState.loadHistoryFromAggregator().then(function(ok) {
  if (ok) console.log('[MSE v2] Aggregator-History bereit — Z-Scores sofort zuverlässig');
});

console.log('[ko-market-state.js] v2.0 geladen — 4-Regime MSE mit Aggregator-History');
