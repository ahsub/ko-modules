/**
 * ko-market-state.js — Market State Engine v1.0
 * ================================================
 * Bestimmt das übergeordnete Markt-Regime aus normalisierten
 * Dark-Pool, Volatilitäts- und Flow-Indikatoren.
 *
 * Version: 1.0 | UnderlyingIQ v=163+
 * Repository: ahsub/ko-modules
 *
 * Regime-Zustände:
 *   BULL_QUIET          → Trendfolge + CSP voll freigegeben
 *   BULL_FRAGILE        → Trendfolge mit engen Stops, CSP drosseln
 *   STRESS_UNSTABLE     → Trendfolge gesperrt, nur defensive MR
 *   POST_PANIC_REVERSION→ Mean Reversion Priorität 1, CSP optimal
 *   NEUTRAL             → Kein klares Signal
 *
 * Datenquellen (über Dark Pool Tab bereits geladen):
 *   - VIX Term Structure (Contango/Backwardation)
 *   - VVIX (Volatilität der Volatilität)
 *   - SKEW (Tail-Risk Hedging)
 *   - DIX-Proxy (Institutional Flow)
 *   - GEX-Proxy (Gamma Exposure)
 */

var KoMarketState = {

  // ── KONFIGURATION ──────────────────────────────────────────────
  LOOKBACK: 20,  // Tage für Z-Score Normalisierung

  // Schwellenwerte nach Geminis Blueprint
  THRESHOLDS: {
    vixTermContango:     1.05,   // VIX3M/VIX > 1.05 = Contango
    vixTermFlat:         0.98,   // VIX3M/VIX < 0.98 = Backwardation
    vvixHighStress:      1.5,    // Z-Score VVIX > 1.5 = Panik
    vvixLowStress:      -1.0,   // Z-Score VVIX < -1 = Sorglosigkeit
    gexShortGamma:      -1.0,   // Z-Score GEX < -1 = Beschleuniger
    dixAccumulation:     0.5,   // Z-Score DIX > 0.5 = Akkumulation
    skewHighHedging:    80,     // Perzentil SKEW > 80 = starkes Hedging
  },

  // History-Puffer für Z-Score Berechnung
  _history: {
    vvix: [], gex: [], dix: [], skew: [], vixRatio: [],
  },

  // Letztes berechnetes Regime
  _lastRegime: null,
  _lastMetrics: null,
  _lastUpdate: null,

  // ── Z-SCORE BERECHNUNG ─────────────────────────────────────────
  zScore(series, currentVal) {
    if (!series || series.length < 5) return 0;
    const n    = Math.min(series.length, this.LOOKBACK);
    const data = series.slice(-n);
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
    const std  = Math.sqrt(variance);
    if (std === 0) return 0;
    return Math.round(((currentVal - mean) / std) * 100) / 100;
  },

  percentileRank(series, currentVal) {
    if (!series || series.length < 5) return 50;
    const n    = Math.min(series.length, this.LOOKBACK);
    const data = series.slice(-n);
    const below = data.filter(v => v <= currentVal).length;
    return Math.round((below / data.length) * 100);
  },

  // ── HISTORY UPDATEN ────────────────────────────────────────────
  addDataPoint(rawData) {
    const h = this._history;
    const push = (arr, val) => {
      if (val != null && !isNaN(val)) {
        arr.push(val);
        if (arr.length > 60) arr.shift(); // Max 60 Tage
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
    const h = this._history;
    return {
      // Rohdaten
      vvix_raw:      rawData.vvix,
      gex_raw:       rawData.gex,
      dix_raw:       rawData.dix,
      skew_raw:      rawData.skew,
      vixRatio:      rawData.vixRatio,

      // Z-Scores (rollierend 20T)
      vvix_z20:  this.zScore(h.vvix,  rawData.vvix),
      gex_z20:   this.zScore(h.gex,   rawData.gex),
      dix_z20:   this.zScore(h.dix,   rawData.dix),

      // Perzentil-Rang für SKEW
      skew_pct20: this.percentileRank(h.skew, rawData.skew),

      // VIX Term Structure
      term_structure: rawData.vixRatio > this.THRESHOLDS.vixTermContango ? 'CONTANGO'
                    : rawData.vixRatio < this.THRESHOLDS.vixTermFlat     ? 'BACKWARDATION'
                    : 'FLAT',
    };
  },

  // ── REGIME BESTIMMUNG (Geminis Blueprint) ──────────────────────
  determineRegime(metrics) {
    const { vvix_z20, gex_z20, dix_z20, skew_pct20, vixRatio, term_structure } = metrics;
    const T = this.THRESHOLDS;

    // ── 1. STRESS_UNSTABLE (Krise dominiert alles) ───────────────
    // Backwardation ODER (VVIX Panik UND Short Gamma)
    if (term_structure === 'BACKWARDATION' ||
        (vvix_z20 > T.vvixHighStress && gex_z20 < T.gexShortGamma)) {
      return 'STRESS_UNSTABLE';
    }

    // ── 2. POST_PANIC_REVERSION ───────────────────────────────────
    // Kurve normalisiert sich, Käufer akkumulieren im Dark Pool
    if (term_structure === 'FLAT' &&
        dix_z20 > T.dixAccumulation &&
        vvix_z20 < 0) {
      return 'POST_PANIC_REVERSION';
    }

    // ── 3. BULL_FRAGILE ───────────────────────────────────────────
    // Markt steigt, aber Absicherung läuft heiß
    if (term_structure === 'CONTANGO' &&
        skew_pct20 > T.skewHighHedging &&
        vvix_z20 > 0.8) {
      return 'BULL_FRAGILE';
    }

    // ── 4. BULL_QUIET ─────────────────────────────────────────────
    // Standardzustand im Bullenmarkt
    if (term_structure === 'CONTANGO' &&
        gex_z20 > 0 &&
        dix_z20 >= -0.5) {
      return 'BULL_QUIET';
    }

    return 'NEUTRAL';
  },

  // ── STRATEGY ROUTER ────────────────────────────────────────────
  getStrategyGates(regime) {
    const gates = {
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
          csp_wheel: { active: true,  priority: 2, note: 'DROSSELN — defensive Strikes wählen (Δ<0.25)' },
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
          momentum:  { active: true,  priority: 2, note: 'Selektiv — nur A+ Qualität' },
          swing:     { active: true,  priority: 2, note: 'Selektiv' },
          csp_wheel: { active: true,  priority: 2, note: 'Konservative Strikes' },
          meanrev:   { active: true,  priority: 2, note: 'Selektiv' },
          breakout:  { active: true,  priority: 2, note: 'Selektiv' },
        },
        action: 'Selektiv vorgehen · Nur höchste Qualität handeln',
      },
    };
    return gates[regime] || gates.NEUTRAL;
  },

  // ── HAUPT-FUNKTION ─────────────────────────────────────────────
  analyze(rawData) {
    // History updaten
    this.addDataPoint(rawData);

    // Normalisieren
    const metrics = this.normalizeMetrics(rawData);

    // Regime bestimmen
    const regime  = this.determineRegime(metrics);
    const gates   = this.getStrategyGates(regime);

    // Ergebnis speichern
    this._lastRegime  = regime;
    this._lastMetrics = metrics;
    this._lastUpdate  = new Date().toISOString();

    return {
      regime,
      metrics,
      gates,
      // Für globalen Zugriff
      color:       gates.color,
      label:       gates.label,
      description: gates.description,
      action:      gates.action,
      strategies:  gates.strategies,
    };
  },

  // ── BADGE TEXT für Scanner ─────────────────────────────────────
  getBadgeText() {
    if (!this._lastRegime) return '— Regime';
    return this.getStrategyGates(this._lastRegime).label;
  },

  // ── STRATEGIE ERLAUBT? ─────────────────────────────────────────
  isStrategyActive(strategyKey) {
    if (!this._lastRegime) return true; // Default: alles erlaubt
    const gates = this.getStrategyGates(this._lastRegime);
    return gates.strategies[strategyKey]?.active ?? true;
  },

  // ── STRATEGIE HINWEIS ──────────────────────────────────────────
  getStrategyNote(strategyKey) {
    if (!this._lastRegime) return '';
    const gates = this.getStrategyGates(this._lastRegime);
    return gates.strategies[strategyKey]?.note ?? '';
  },

  // ── PERSIST & RESTORE (localStorage) ─────────────────────────
  saveHistory() {
    try {
      localStorage.setItem('ko_mse_history', JSON.stringify(this._history));
    } catch(e) {}
  },

  loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem('ko_mse_history') || '{}');
      if (saved.vvix) this._history = saved;
    } catch(e) {}
  },
};

// History beim Laden wiederherstellen
KoMarketState.loadHistory();

console.log('[ko-market-state.js] v1.0 geladen — 4-Regime Market State Engine');
