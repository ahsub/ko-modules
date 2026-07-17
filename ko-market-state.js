/**
 * ko-market-state.js — Market State Engine v2.2
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

  // ── STRATEGIE-REIHENFOLGE + LABELS: Single Source of Truth ──────────────
  // Konsolidiert 11.07.2026 (Praesentationsfeedback) — vorher gab es VIER
  // unabhaengige Kopien dieser Zuordnung im Frontend (index.html), die bei
  // Aenderungen einzeln nachgezogen werden mussten (Ursache des "undefined"-
  // Labels-Bugs vom 10.07.2026). Ab jetzt: alle Renderer referenzieren
  // KoMarketState.STRATEGY_ORDER / .STRATEGY_LABELS statt eigener Kopien.
  // Reihenfolge thematisch (Axel, 11.07.2026): Trend/Momentum → Mean Reversion
  // → Value/Dividende → Options-Income (Wheel → ATM/NA → Weekly → CC) → Short.
  // Value/Dividend entfernt (17.07.2026, Regime-Coverage-Analyse): keine
  // Timing-Strategien, in KEINEM der 5 Regime Prioritaet-1 — Buy-and-Hold-
  // Konzept gehoert ins spaetere DepotIQ-Modul. VCP ergaenzt (Stage-2-Setup,
  // nahe Momentum/Breakout in der Reihenfolge).
  STRATEGY_ORDER: ['ko', 'momentum', 'breakout', 'vcp', 'swing', 'meanrev',
                   'csp_wheel', 'atmna', 'weekly_income', 'cc', 'collar', 'fading_short'],

  STRATEGY_LABELS: {
    ko:            '⚡ KO-Zertifikat',
    momentum:      '📈 Momentum',
    breakout:      '🚀 Breakout',
    vcp:           '📐 VCP-Setup',
    swing:         '🔄 Swing',
    meanrev:       '↩️ Mean Rev.',
    csp_wheel:     '⚙️ CSP/Wheel',
    atmna:         '🎯 CSP (ATM/NA)',
    weekly_income: '💰 CSP (Weekly)',
    cc:            '📝 Covered Call',
    collar:        '🛡️ Collar/Protective Put',
    fading_short:  '🔻 Fading Short (experimentell)',
  },

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
    if (!series || series.length < 3) return null;   // v: kein Fake-0 bei fehlender History — 0 sähe wie ein echter neutraler Z-Score aus
    const n    = Math.min(series.length, this.LOOKBACK);
    const data = series.slice(-n);
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
    const std  = Math.sqrt(variance);
    if (std === 0) return 0;
    return Math.round(((currentVal - mean) / std) * 100) / 100;
  },

  percentileRank(series, currentVal) {
    if (!series || series.length < 3) return null;   // v: kein Fake-50% bei fehlender History
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
      var kvUrl = 'https://ko-sync.ahildebrand.workers.dev/public/master_market_data';
      var r = await fetch(kvUrl);
      if (!r.ok) throw new Error('KV ' + r.status);
      var resp = await r.json();
      var json = resp.data || resp;   // Worker gibt {key, data, updated_at}

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
    // ── Alle 12 UIQ-Strategien, regelbasiert je Regime (v2.2.0) ──────────────
    // Long-Strategien: momentum, swing, breakout, ko, value, dividend
    // Income-Strategien: csp_wheel, weekly_income, atmna, cc (Covered Call, eigenständig ab 11.07.2026)
    // Bidirektional: meanrev
    // Short-Strategie: fading_short
    var gates = {
      BULL_QUIET: {
        label:       '🟢 BULL QUIET — Stabil & Unterstützt',
        color:       'var(--green)',
        description: 'Volatilität komprimiert · Dealer dämpfen · stetiger Zufluss',
        strategies: {
          momentum:     { active: true,  color: 'green',  note: 'PRIORITÄT 1 — Voll freigegeben, Breakouts bevorzugen' },
          breakout:     { active: true,  color: 'green',  note: 'PRIORITÄT 1 — Ideales Breakout-Umfeld, Vol komprimiert' },
          swing:        { active: true,  color: 'green',  note: 'PRIORITÄT 1 — Pullbacks kaufen, klare Trendstruktur' },
          ko:           { active: true,  color: 'green',  note: 'PRIORITÄT 2 — KO-Hebelprodukte Long freigegeben' },
          csp_wheel:    { active: true,  color: 'green',  note: 'PRIORITÄT 2 — ATM-Strikes aggressiv, kaum Gap-Risiko' },
          atmna:        { active: true,  color: 'green',  note: 'PRIORITÄT 2 — ATM-Strategie in stabilem Umfeld optimal' },
          weekly_income:{ active: true,  color: 'green',  note: 'PRIORITÄT 2 — Covered Calls & Cash-Secured Puts freigegeben' },
          cc:           { active: true,  color: 'green',  note: 'PRIORITÄT 2 — Buy-Write auf Qualitätstitel, hohe Prämien bei geringem Gap-Risiko' },
          vcp:          { active: true,  color: 'green',  note: 'PRIORITÄT 1 — Ideales Contraction→Breakout-Umfeld, Vol komprimiert' },
          collar:       { active: false, color: 'amber',  note: 'NICHT NÖTIG — stabiles Regime, Absicherungskosten unnötig' },
          meanrev:      { active: false, color: 'red',    note: 'NICHT EMPFOHLEN — kein Oversold-Signal in Bullmarkt' },
          fading_short: { active: false, color: 'red',    note: 'GESPERRT — Gegentrend-Short in stabilem Bullmarkt' },
        },
        action: 'Gesamteinschätzung: Trendfolge, Breakouts & aggressive Income-Strategien',
      },
      BULL_FRAGILE: {
        label:       '🟡 BULL FRAGILE — Vorsicht geboten',
        color:       'var(--amber)',
        description: 'Index steigt · aber VVIX & Skew nehmen zu · Air-Pocket Risiko',
        strategies: {
          momentum:     { active: true,  color: 'amber',  note: 'MÖGLICH — engere Trailing-Stops, nur A+ Qualität' },
          swing:        { active: true,  color: 'amber',  note: 'MÖGLICH — nur bei extrem starken Titeln (RS>90)' },
          csp_wheel:    { active: true,  color: 'amber',  note: 'DROSSELN — defensive Strikes (Δ<0.25), kürzere Laufzeit' },
          weekly_income:{ active: true,  color: 'amber',  note: 'EINSCHRÄNKEN — kürzere Laufzeiten, höhere Strikes' },
          cc:           { active: true,  color: 'amber',  note: 'EINSCHRÄNKEN — nur auf bereits gehaltene Qualitätstitel, defensive Strikes' },
          atmna:        { active: true,  color: 'amber',  note: 'EINSCHRÄNKEN — defensiver Strike-Abstand' },
          collar:       { active: true,  color: 'green',  note: 'PRIORITÄT 1 — Genau das Setup fuer das dieses Regime steht: Trend intakt, Air-Pocket-Risiko absichern' },
          vcp:          { active: false, color: 'amber',  note: 'VORSICHT — Contractions moeglich, aber Air-Pocket-Risiko bei Ausbruch' },
          breakout:     { active: false, color: 'red',    note: 'NICHT EMPFOHLEN — Fehlausbrüche möglich bei erhöhter Vol' },
          ko:           { active: false, color: 'red',    note: 'NICHT EMPFOHLEN — Hebelrisiko bei Air-Pocket erhöht' },
          meanrev:      { active: false, color: 'red',    note: 'NICHT EMPFOHLEN — kein klares Oversold-Umfeld' },
          fading_short: { active: false, color: 'red',    note: 'NICHT EMPFOHLEN — Trend intakt, Short-Risiko zu hoch' },
        },
        action: 'Gesamteinschätzung: Engere Stops · Collar/Protective Put auf Bestandspositionen pruefen',
      },
      STRESS_UNSTABLE: {
        label:       '🔴 STRESS UNSTABLE — Defensiv',
        color:       'var(--red)',
        description: 'Gamma-Flip · Dealer beschleunigen Abwärts · Backwardation',
        strategies: {
          fading_short: { active: true,  color: 'green',  note: 'PRIORITÄT 1 — Short-Strategie via KO-Zertifikat Short' },
          meanrev:      { active: true,  color: 'amber',  note: 'MÖGLICH — selektiv Short-Squeeze Rebounds, enger Stop' },
          csp_wheel:    { active: true,  color: 'amber',  note: 'NUR DEFENSIV — Δ<0.15, krisenresistente Value-Titel' },
          cc:           { active: true,  color: 'amber',  note: 'SELEKTIV — nur auf bereits gehaltene Positionen, keine Neupositionen zum Buy-Write' },
          collar:       { active: true,  color: 'amber',  note: 'ZU SPÄT FÜR NEUABSICHERUNG — Put-Praemien bereits stark verteuert (hohe IV); bestehende Collars halten' },
          vcp:          { active: false, color: 'red',    note: 'GESPERRT — keine Contraction-Struktur in Stressphase moeglich' },
          momentum:     { active: false, color: 'red',    note: 'GESPERRT — fallende Messer nicht anfassen' },
          swing:        { active: false, color: 'red',    note: 'GESPERRT — Fehlausbrüche dominant, keine Trendstruktur' },
          breakout:     { active: false, color: 'red',    note: 'GESPERRT — kein nachhaltiger Ausbruch in Stressphase' },
          ko:           { active: false, color: 'red',    note: 'GESPERRT — Long-Hebelprodukte im Downtrend verboten' },
          atmna:        { active: false, color: 'red',    note: 'GESPERRT — erhöhte IV-Risiken, Gap-Gefahr zu hoch' },
          weekly_income:{ active: false, color: 'red',    note: 'GESPERRT — Short-Put-Risiko bei fortgesetztem Downtrend' },
        },
        action: 'Gesamteinschätzung: Positionen absichern (experimentell: Fading-Short pruefen) · Defensive CSPs selektiv',
      },
      POST_PANIC_REVERSION: {
        label:       '🔵 POST-PANIC — Reversion Phase',
        color:       '#06b6d4',
        description: 'Panik ebbt ab · Vol-Crush · Dark Pools akkumulieren massiv',
        strategies: {
          meanrev:      { active: true,  color: 'green',  note: 'PRIORITÄT 1 — Long-Rebounds überverkaufter Qualitätstitel' },
          csp_wheel:    { active: true,  color: 'green',  note: 'PRIORITÄT 1 — erhöhte IV verkaufen, hohe Prämien kassieren' },
          atmna:        { active: true,  color: 'green',  note: 'PRIORITÄT 1 — ATM-Prämien bei hoher IV optimal' },
          weekly_income:{ active: true,  color: 'green',  note: 'PRIORITÄT 2 — Vol-Crush nutzen für Income' },
          cc:           { active: true,  color: 'green',  note: 'PRIORITÄT 2 — erhöhte IV nach Panik für Buy-Write nutzen, hohe Prämien' },
          fading_short: { active: false, color: 'amber',  note: 'REDUZIEREN — Short-Positionen bei Bodenbildung abbauen' },
          collar:       { active: false, color: 'amber',  note: 'ABBAUEN — bestehende Collars nach Vol-Crush aufloesen, Put-Wert gesunken' },
          vcp:          { active: false, color: 'red',    note: 'ZU FRÜH — kein Stage-2-Trend etabliert nach Panik' },
          momentum:     { active: false, color: 'red',    note: 'WARTEN — Bodenbildung abwarten, kein klarer Aufwärtstrend' },
          swing:        { active: false, color: 'red',    note: 'WARTEN — Trendbestätigung abwarten (2-3 Wochen)' },
          breakout:     { active: false, color: 'red',    note: 'ZU FRÜH — kein nachhaltiger Trend nach Panik' },
          ko:           { active: false, color: 'red',    note: 'ZU FRÜH — Long-Hebel erst nach Trendbestätigung' },
        },
        action: 'Gesamteinschätzung: Mean Reversion & Income Priorität 1 · Vol-Crush nutzen',
      },
      NEUTRAL: {
        label:       '⚪ NEUTRAL — Kein klares Signal',
        color:       'var(--text3)',
        description: 'Gemischte Signale · Daten unvollständig oder widersprüchlich',
        strategies: {
          momentum:     { active: true,  color: 'amber',  note: 'SELEKTIV — nur A+ Qualität (RS>90, EPS-Wachstum)' },
          swing:        { active: true,  color: 'amber',  note: 'SELEKTIV — klare technische Struktur erforderlich' },
          csp_wheel:    { active: true,  color: 'amber',  note: 'KONSERVATIV — defensive Strikes, kürzere Laufzeit' },
          weekly_income:{ active: true,  color: 'amber',  note: 'KONSERVATIV — reduziertes Exposure' },
          cc:           { active: true,  color: 'amber',  note: 'KONSERVATIV — nur auf bereits gehaltene Qualitätstitel' },
          atmna:        { active: true,  color: 'amber',  note: 'KONSERVATIV — nur klare Setups' },
          collar:       { active: false, color: 'amber',  note: 'OPTIONAL — bei bereits gehaltenen Gewinn-Positionen als Vorsichtsmassnahme moeglich' },
          vcp:          { active: false, color: 'amber',  note: 'BEOBACHTEN — Contraction-Struktur pruefen, Ausbruch noch unsicher' },
          breakout:     { active: false, color: 'red',    note: 'ABWARTEN — gemischte Signale erhöhen Fehlausbruch-Risiko' },
          ko:           { active: false, color: 'red',    note: 'ABWARTEN — kein klares Trend-Signal für Hebelprodukte' },
          meanrev:      { active: false, color: 'amber',  note: 'SELEKTIV — nur bei extremem Oversold-Signal' },
          fading_short: { active: false, color: 'red',    note: 'NICHT EMPFOHLEN — kein klares Short-Signal' },
        },
        action: 'Gesamteinschätzung: Selektiv vorgehen · Nur höchste Qualität · Kein Leverage',
      },
    };
    return gates[regime] || gates.NEUTRAL;
  },

  // ── CONTEXT-AWARE STRATEGY GATES (MCM v2.1) ────────────────────
  /**
   * Downgrade-Regeln: welcher Faktor-Signal-Zustand stuft welche Strategien herab.
   * Deklarativ + erweiterbar: neuer Faktor = neuer Eintrag, kein Logik-Eingriff.
   * Semantik: green→amber bei 'caution', green/amber→red NUR bei 'risk'.
   * Upgrades gibt es NICHT — der Kontext kann Gates nur verschärfen, nie lockern
   * (konservatives Prinzip: Regime-Routing definiert das Maximum an Freigabe).
   */
  CONTEXT_DOWNGRADE_RULES: [
    // Faktor-ID            betroffene Strategien (Long-Trend/Hebel zuerst)
    { factor: 'treasury_stress',   strategies: ['ko','momentum','breakout','swing','csp_wheel','atmna','weekly_income','cc'] },
    { factor: 'ndx_breadth',       strategies: ['ko','momentum','breakout','swing'] },
    { factor: 'intermarket_score', strategies: ['ko','momentum','breakout','swing','value'] },
    { factor: 'vix',               strategies: ['ko','breakout','atmna'] },
    { factor: 'vvix',              strategies: ['ko','breakout','csp_wheel','weekly_income'] },
    { factor: 'skew',              strategies: ['csp_wheel','atmna','weekly_income'] },
    { factor: 'pcr',               strategies: ['momentum','breakout'] },
    { factor: 'fear_greed',        strategies: ['momentum','breakout','ko'] },
    { factor: 'bull_indicator',    strategies: ['ko','momentum','breakout','swing'] },
    // Calendar-Fenster: alle Neupositions-Strategien vorsichtiger
    { factor: 'fed_window',        strategies: ['ko','momentum','breakout','swing','csp_wheel','atmna','weekly_income'] },
    { factor: 'nfp_window',        strategies: ['ko','breakout'] },
    { factor: 'cpi_window',        strategies: ['ko','breakout','csp_wheel'] },
  ],

  /**
   * Strategie-Gates aus dem VOLLSTÄNDIGEN market_context berechnen.
   * Single Source of Truth: identischer Context geht an die KI.
   *
   * Ablauf:
   *   1. Regime-Basis-Gates (getStrategyGates) — definiert Maximum an Freigabe
   *   2. Downgrade-Pass über CONTEXT_DOWNGRADE_RULES:
   *      caution → green wird amber (Note ergänzt um Grund)
   *      risk    → green/amber wird red (Note ergänzt um Grund)
   *   3. Gate-Objekt bekommt _context-Metadaten (Nachvollziehbarkeit im UI)
   *
   * @param {object} ctx - market_context aus buildMarketContext()
   * @returns {object} gates (Struktur identisch zu getStrategyGates + _context)
   */
  calcStrategyGates(ctx) {
    var regime = (ctx && ctx._regime) || this._lastRegime || 'NEUTRAL';
    var base   = this.getStrategyGates(regime);

    // Deep Copy — Basis-Tabellen nie mutieren
    var gates = JSON.parse(JSON.stringify(base));
    gates._context = {
      generated:     ctx ? ctx._generated : null,
      regime:        regime,
      risk_level:    ctx ? ctx.summary.risk_level : 'unknown',
      downgrades:    [],   // [{strategy, from, to, reason}]
      factors_used:  ctx ? Object.keys(ctx.factors).length : 0,
    };
    if (!ctx || !ctx.factors) return gates; // fail-open auf Regime-Basis (Context fehlt)

    var self = this;
    var registryLabels = (typeof _indicatorRegistry !== 'undefined' && _indicatorRegistry) || {};

    this.CONTEXT_DOWNGRADE_RULES.forEach(function(rule) {
      var f = ctx.factors[rule.factor];
      if (!f || !f.signal || f.signal === 'ok') return;

      var reasonLabel = (registryLabels[rule.factor] && registryLabels[rule.factor].label) || rule.factor;
      var reason = reasonLabel + ': ' + (f.raw != null ? f.raw : f.label) + ' [' + f.signal.toUpperCase() + ']';

      rule.strategies.forEach(function(sKey) {
        var s = gates.strategies[sKey];
        if (!s) return;
        var from = s.color;
        var to   = null;

        if (f.signal === 'caution' && s.color === 'green') to = 'amber';
        if (f.signal === 'risk' && (s.color === 'green' || s.color === 'amber')) to = 'red';

        if (to) {
          s.color = to;
          if (to === 'red') s.active = false;
          s.note = s.note + ' | ⚠ ' + reason;
          gates._context.downgrades.push({ strategy: sKey, from: from, to: to, reason: reason });
        }
      });
    });

    if (gates._context.downgrades.length) {
      console.log('[MSE] calcStrategyGates — ' + gates._context.downgrades.length +
        ' Downgrades durch Context: ' + gates._context.downgrades.map(function(d) {
          return d.strategy + ' ' + d.from + '→' + d.to;
        }).join(', '));
    }
    return gates;
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

console.log('[ko-market-state.js] v2.2 geladen — 4-Regime MSE + Context-Aware Strategy Gates (MCM) + kontextualisierte Regime-Texte (AP D)');
