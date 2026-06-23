/**
 * ko-strategies.js — UnderlyingIQ Strategy Definitions
 * ══════════════════════════════════════════════════════════════════
 * Version: 1.0.0
 * Repository: ahsub/ko-modules
 *
 * Zweck:
 *   Zentrale Strategie-Definitionen die sowohl im Frontend (UnderlyingIQ)
 *   als auch im Python-Aggregator (market_aggregator.py) und zukünftigen
 *   Projekten verwendet werden können.
 *
 * Enthält:
 *   - Strategie-Labels (DE/EN)
 *   - Score-Thresholds pro Strategie
 *   - Regime-Affinitäten
 *   - BaFin-konforme Beschreibungen
 *   - Farb- und Icon-Mapping für UI
 *
 * Verwendung (Browser):
 *   <script src="https://cdn.jsdelivr.net/gh/ahsub/ko-modules@{HASH}/ko-strategies.js"></script>
 *   const label = KoStrategies.getLabel('long_minervini'); // → "Minervini SEPA"
 *
 * Verwendung (Python-Aggregator):
 *   # strat_labels = KoStrategies.LABELS  (via JSON-Import oder direkte Übernahme)
 */

(function(global) {
  'use strict';

  // ── STRATEGIE-IDs ──────────────────────────────────────────────────────────
  const STRATEGY_IDS = [
    'long_minervini',
    'long_swing',
    'long_mr',
    'short_breakdown',
    'short_fading',
  ];

  // ── LABELS ────────────────────────────────────────────────────────────────
  const LABELS = {
    long_minervini:  'Minervini SEPA',
    long_swing:      'Swing-Pullback',
    long_mr:         'Mean Reversion Long',
    short_breakdown: 'Short Breakdown',
    short_fading:    'Short Fading',
  };

  const LABELS_FULL = {
    long_minervini:  'Minervini SEPA (Stage 2 Ausbruch)',
    long_swing:      'Swing-Pullback (EMA-Bounce)',
    long_mr:         'Mean Reversion Long (Kapitulations-Bounce)',
    short_breakdown: 'Short Breakdown (Trendfolge abwärts)',
    short_fading:    'Short Fading (FOMO-Top Mean Reversion)',
  };

  // ── BAFIN-KONFORME BESCHREIBUNGEN ─────────────────────────────────────────
  const DESCRIPTIONS_PUBLIC = {
    long_minervini:
      'Technisches Muster: Stage-2-Aufwärtstrend mit Kurs über EMA50 und EMA200, ' +
      'Nähe zum 52-Wochen-Hoch und erhöhtem Volumen. Deskriptive Datenlage gem. §1 WpHG.',
    long_swing:
      'Technisches Muster: Pullback in übergeordnetem Aufwärtstrend mit RSI-Entspannung ' +
      'und Bollinger-Kompression. Deskriptive Datenlage gem. §1 WpHG.',
    long_mr:
      'Technisches Muster: Extreme Überverkauft-Lage (>2 ATR unter EMA200, RSI<30, ' +
      'BB-Unterband). Statistisch erhöhte Rückkehr-Wahrscheinlichkeit. Gem. §1 WpHG.',
    short_breakdown:
      'Technisches Muster: Kurs unter EMA200 mit fallendem OBV und bärischem Markov-Regime. ' +
      'Deskriptive Datenlage gem. §1 WpHG.',
    short_fading:
      'Technisches Muster: FOMO-Überdehnung (>2.5 ATR über EMA200, RSI>68) mit ' +
      'Kauf-Erschöpfungs-Signalen. Deskriptive Datenlage gem. §1 WpHG.',
  };

  // ── SCORE-THRESHOLDS ──────────────────────────────────────────────────────
  const THRESHOLDS = {
    long_minervini:  { leaderboard: 40, shortlist: 75, strong: 85 },
    long_swing:      { leaderboard: 35, shortlist: 70, strong: 80 },
    long_mr:         { leaderboard: 30, shortlist: 45, strong: 65 },
    short_breakdown: { leaderboard: 35, shortlist: 55, strong: 70 },
    short_fading:    { leaderboard: 35, shortlist: 70, strong: 80 },
  };

  // ── REGIME-AFFINITÄT ──────────────────────────────────────────────────────
  // Welche Strategien passen zu welchem Marktregime?
  const REGIME_AFFINITY = {
    BULL_QUIET: {
      primary:   ['long_minervini', 'long_swing'],
      secondary: ['short_fading'],
      avoid:     ['long_mr'],
    },
    BULL_FRAGILE: {
      primary:   ['long_swing', 'long_minervini'],
      secondary: ['short_fading', 'short_breakdown'],
      avoid:     [],
    },
    STRESS_UNSTABLE: {
      primary:   ['long_mr', 'short_breakdown'],
      secondary: ['short_fading'],
      avoid:     ['long_minervini'],
    },
    POST_PANIC_REVERSION: {
      primary:   ['long_mr'],
      secondary: ['long_swing', 'short_breakdown'],
      avoid:     [],
    },
    NEUTRAL: {
      primary:   ['long_minervini', 'long_swing', 'long_mr', 'short_breakdown', 'short_fading'],
      secondary: [],
      avoid:     [],
    },
  };

  // ── RICHTUNG ──────────────────────────────────────────────────────────────
  const DIRECTION = {
    long_minervini:  'LONG',
    long_swing:      'LONG',
    long_mr:         'LONG',
    short_breakdown: 'SHORT',
    short_fading:    'SHORT',
  };

  // ── UI: FARBEN & ICONS ────────────────────────────────────────────────────
  const UI = {
    long_minervini: {
      color:  'var(--green)',
      bgColor:'rgba(34,197,94,0.1)',
      icon:   'ti-trending-up',
      badge:  '🚀',
    },
    long_swing: {
      color:  'var(--accent)',
      bgColor:'rgba(79,142,247,0.1)',
      icon:   'ti-wave-sine',
      badge:  '↗',
    },
    long_mr: {
      color:  'var(--yellow)',
      bgColor:'rgba(251,191,36,0.1)',
      icon:   'ti-arrow-bounce',
      badge:  '⚡',
    },
    short_breakdown: {
      color:  'var(--red)',
      bgColor:'rgba(239,68,68,0.1)',
      icon:   'ti-trending-down',
      badge:  '🔻',
    },
    short_fading: {
      color:  'var(--orange)',
      bgColor:'rgba(249,115,22,0.1)',
      icon:   'ti-flame-off',
      badge:  '📉',
    },
  };

  // ── SCORE-LEADERBOARD KEY MAPPING ─────────────────────────────────────────
  const SCORE_KEYS = {
    long_minervini:  'sMinervini',
    long_swing:      'sSwing',
    long_mr:         'sMrLong',
    short_breakdown: 'sBreakdown',
    short_fading:    'sFading',
  };

  // ── API ───────────────────────────────────────────────────────────────────
  const KoStrategies = {
    VERSION: '1.0.0',

    IDS: STRATEGY_IDS,
    LABELS,
    LABELS_FULL,
    DESCRIPTIONS_PUBLIC,
    THRESHOLDS,
    REGIME_AFFINITY,
    DIRECTION,
    UI,
    SCORE_KEYS,

    /** Label für eine Strategie-ID zurückgeben */
    getLabel(strategyId, full = false) {
      return full
        ? (LABELS_FULL[strategyId] || strategyId)
        : (LABELS[strategyId]      || strategyId);
    },

    /** Ist die Strategie Short? */
    isShort(strategyId) {
      return DIRECTION[strategyId] === 'SHORT';
    },

    /** Mindest-Score für Leaderboard-Aufnahme */
    getLeaderboardThreshold(strategyId) {
      return THRESHOLDS[strategyId]?.leaderboard ?? 35;
    },

    /** Welche Strategien passen zum aktuellen Regime? */
    getPrimaryStrategies(regime) {
      const r = (regime || 'NEUTRAL').toUpperCase();
      return (REGIME_AFFINITY[r] || REGIME_AFFINITY.NEUTRAL).primary;
    },

    /** UI-Farbe für eine Strategie */
    getColor(strategyId) {
      return UI[strategyId]?.color || 'var(--text)';
    },

    /** Score-Key für Leaderboard-Zugriff auf Ticker-Objekt */
    getScoreKey(strategyId) {
      return SCORE_KEYS[strategyId] || 'score';
    },

    /** Badge-Emoji für kompakte Darstellung */
    getBadge(strategyId) {
      return UI[strategyId]?.badge || '·';
    },
  };

  // ── EXPORT ────────────────────────────────────────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = KoStrategies; // Node.js / Python (via vm)
  } else {
    global.KoStrategies = KoStrategies;
  }

})(typeof window !== 'undefined' ? window : this);
