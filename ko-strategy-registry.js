/**
 * ko-strategy-registry.js
 * ============================================================================
 * SINGLE SOURCE OF TRUTH für alle Strategie-IDs, Metadaten, maschinenlesbare
 * Regeln (rules) und Composite-Beziehungen (z.B. Wheel = CSP + CC-Zyklus).
 *
 * WARUM DIESE DATEI:
 * Bisher gab es zwei unabhängig gepflegte Strategie-Listen — `Strategies`
 * (ko-strategies.js, für Scoring/UI) und `STRATEGIES` (ko-prompts.js, für
 * KI-Prompts + Leaderboard-Mapping). Das führte zu echter Drift (siehe
 * UEBERGABE-2026-08-12-nachmittag-trade-doktor.md, §3-Nebeneffekt-Stichprobe,
 * 13.08.2026):
 *   - Strategies.options (kombiniert CSP+CC) hatte kein Pendant zu
 *     STRATEGIES.csp_wheel / STRATEGIES.cc (separate lbKeys)
 *   - dte-Default war an 4 Stellen unabhängig dupliziert (30 statt 21),
 *     wodurch der überall sonst dokumentierte Zielbereich "21-45 DTE"
 *     inkonsistent gerendert wurde ("30-45 DTE")
 *
 * PRINZIP:
 *   ko-strategy-registry.js  ← IDs, Metadaten, rules, Composite-Beziehungen
 *                               (dieses Modul — normales <script>, MUSS vor
 *                               ko-prompts.js UND ko-strategies.js laden)
 *   ko-prompts.js            ← nur noch Prompt-TEXT je stratId, liest
 *                               label/lbKey/rules aus dieser Registry
 *   ko-strategies.js         ← nur noch Scoring-/UI-Logik je stratId, liest
 *                               label/category/rules aus dieser Registry
 *
 * Lädt NICHT als ES6-Modul (kein type="module"), um exakt den v456-Kollisions-
 * Bug (window.KoPrompts-Überschreibung durch Ladereihenfolge) nicht zu
 * wiederholen. Synchrones <script>, muss im HTML VOR ko-prompts.js und
 * VOR ko-strategies.js eingebunden werden.
 *
 * Version: 1.2 (15.08.2026 — csp_wheel.rollRules literaturgestuetzt neu
 *   strukturiert: statt pauschalem "roll down and out" jetzt zweistufiges,
 *   praemienneutrales System (maxRollDte:90, wie ATMNA) mit Intent-basierter
 *   Verzweigung (reine Einkommensabsicht vs. Erwerbsabsicht). Neu: stopLoss
 *   -200% (zwei unabhaengige Quellen: Spina, Friedenheim). Gestuetzt durch
 *   5 Fachquellen (Jabbour/Budwick, Spina, Thomsett, Friedenheim, Saliba),
 *   Herleitung im Chat-Verlauf 15.08.2026 dokumentiert.
 * Version: 1.1 (15.08.2026 — Werte korrigiert (DTE 30-45, CSP-Delta 0.15-0.30),
 *   eingebunden in axel-scanner/index.html (Schritt 1 der Migration nachgeholt),
 *   von ko-prompts.js/getEffectiveRules() live konsumiert. Deployed & verifiziert.)
 * ============================================================================
 */

(function (global) {
  'use strict';

  // ── EINZEL-STRATEGIEN ─────────────────────────────────────────────────────
  // rules: maschinenlesbar, von evaluateOptionsTradeAgainstUIQRules() (Trade-
  // Doktor) UND von Scoring/UI konsumiert. deltaRange: null bedeutet "ATM per
  // Definition, kein Delta-Fenster" (z.B. atmna).
  const strategies = {

    csp_wheel: {
      label: '⚙️ CSP/Wheel',
      hint: '⚙️ CSP/Wheel: Cash Secured Put + Covered Call · CapTrader/IBKR · Theta-Strategie',
      lbKey: 'options_csp',
      category: 'options',
      color: 'var(--amber)',
      memberOf: 'wheel',
      rules: {
        deltaRange: [0.15, 0.30],       // KORRIGIERT 15.08.2026: Marktstandard-Recherche
                                        // (Theta-Decay/Gamma-Begründung), ersetzt EIC-Prompt-Wert
        dteRange: [30, 45],             // KORRIGIERT 15.08.2026: war fälschlich [21,45] —
                                        // s. UEBERGABE-2026-08-13.md §4, Marktstandard ist 30-45
        profitTaking: [
          { pct: 50, condition: null, action: 'close' }
        ],
        stopLoss: { pct: -200, basis: 'Spina S.194 + Friedenheim S.37, zwei unabhaengige Quellen' },
        rollRules: {
          maxRollDte: 90,  // wie ATMNA — Salibas Prinzip: proaktiv, nicht endlos
          stages: [
            { stage: 1, action: 'niedrigerer_strike', dteRange: [30, 45], premiumNeutral: true,
              condition: 'strike_breach_but_original_intent_pure_income' },
            { stage: 2, action: 'accept_assignment',
              condition: 'original_intent_was_acquisition' }
          ],
          note: 'Vereint 5 Quellen: Saliba S.32 (proaktives, praemienneutrales Rollen ist legitim, ' +
                'strukturell wie ATMNA), Jabbour/Budwick S.311-315 (reaktive Rettung eines bereits ' +
                'bedraengten Short Put ist meist ein Netto-Verlustgeschaeft — daher premiumNeutral als ' +
                'harte Bedingung, kein Rollen ohne Credit-Erhalt), Spina S.98 (CSP=undefiniertes Risiko, ' +
                'kein automatisches Rollen als Standard), Thomsett (bei Nicht-Ausuebung eher neue Position ' +
                'als bestehende rollen), Friedenheim S.37 (feste Regeln statt Improvisation im Trade)'
        },
        strikeGuidance: 'nahe/unter EMA200',
        minOiAtStrike: 500,
        maxBidAskPctOfPremium: 10
      }
    },

    cc: {
      label: '📝 Covered Call',
      hint: '📝 Covered Call: Call-Writing auf Bestandspositionen · Buy-Write · Prämieneinnahme',
      lbKey: 'options_cc',
      category: 'options',
      color: '#f59e0b',
      memberOf: 'wheel',
      rules: {
        deltaRange: [0.20, 0.30],       // unveraendert korrekt, deckt sich mit Marktstandard
        dteRange: [30, 45],             // KORRIGIERT 15.08.2026: war fälschlich [21,45]
        profitTaking: [
          { pct: 50, condition: null, action: 'close' }
        ],
        rollRules: {
          trigger: 'price_approaches_strike',  // "Aufwärts-Roll" lt. Prompt-Text
          action: 'roll_up_and_out'
        },
        strikeGuidance: {
          aggressive: '5-8% OTM (mehr Prämie)',
          conservative: '10-15% OTM (mehr Upside)'
        },
        minOiAtStrike: 300,
        maxBidAskPctOfPremium: 10
      }
    },

    atmna: {
      label: '🎯 CSP (ATM/NA)',
      hint: '🎯 CSP (ATM/NA): ATM-CSP · 50-70% Frühausstieg · 3-Stufen-Roll · Andienungs-Vermeidung',
      lbKey: null,                      // kein eigener Leaderboard-Tab (Stand 13.08.2026)
      category: 'options',
      color: '#a371f7',
      memberOf: null,                   // eigenständig, NICHT Teil der Wheel-Composite
      rules: {
        deltaRange: null,               // ATM per Definition — kein Delta-Fenster
        dteRange: [30, 30],             // "~30 Tage, bevorzugt 3. Freitag"; Roll-Fenster separat
        profitTaking: [
          { pct: 50, condition: 'remaining_dte_pct > 50', action: 'close' },
          { pct: 60, condition: 'remaining_dte_pct >= 30_and_<=50', action: 'close' },
          { pct: 70, condition: 'remaining_dte_pct < 30', action: 'close' }
        ],
        rollRules: {
          maxRollDte: 90,
          stages: [
            { stage: 1, action: 'niedrigerer_strike', dteRange: [30, 60], premiumNeutral: true },
            { stage: 2, action: 'gleicher_strike_neue_laufzeit', premiumNeutral: true },
            { stage: 3, action: 'niedrigerer_strike_doppelte_kontrakte' }
          ]
        },
        strikeGuidance: 'ATM (at-the-money)',
        strikeStaggeringMaxPct: 2.5
      }
    },

    collar: {
      label: '🛡️ Collar/Protective Put',
      hint: '🛡️ Collar/Protective Put: Absicherung Bestandsposition · BULL_FRAGILE · Proxy-Strikes',
      lbKey: null,
      category: 'options',
      color: '#0ea5e9',
      memberOf: null,
      rules: null   // kein STRATEGIE_MATRIX-Eintrag — vollständige Behandlung in
                     // Options-Doktor-Modul (Suite Phase 3), s. ko-prompts.js Kommentar
    }

    // Nicht-Options-Strategien (ko, momentum, vcp, weekly_income, swing,
    // meanrev, breakout, fading_short, dividend, value) bleiben unverändert
    // in ko-strategies.js definiert — sie brauchen kein `rules`-Feld im
    // Trade-Doktor-Sinn und keine Composite-Zugehörigkeit. Diese Registry
    // wird bei Bedarf schrittweise erweitert, nicht in einem Rutsch.
  };

  // ── COMPOSITE-STRATEGIEN ──────────────────────────────────────────────────
  // Eine Composite ist KEINE reine Gruppierung, sondern eine Zustandsmaschine
  // über mehrere Einzelstrategien hinweg (Positions-übergreifend). Sie trägt
  // eigene Regeln, die eine Einzelstrategie nicht kennen kann — allen voran
  // Cost-Basis-Fortschreibung nach Assignment.
  const composites = {

    wheel: {
      label: '🎡 Wheel-Strategie',
      hint: '🎡 Wheel: CSP → Assignment → CC → Called Away → CSP (Zyklus)',
      lbKey: 'options_wheel',   // ENTSCHIEDEN 13.08.2026: eigener Leaderboard-Tab/
                                 // eigene Kachel, dritte neben CSP und CC
      category: 'options',
      color: '#fb923c',
      members: ['csp_wheel', 'cc'],
      cycle: {
        // Zustandsübergänge — nicht nur lose Gruppierung
        csp_wheel: { onAssignment: 'cc' },       // CSP ausgeübt → Aktien im Depot → CC
        cc: { onCalledAway: 'csp_wheel' }         // Call ausgeübt → Aktien weg → zurück zu CSP
      },
      costBasisTracking: {
        enabled: true,
        // Cost Basis nach Assignment = Strike - erhaltene Prämie (nicht Marktpreis)
        formula: 'assignment_strike_minus_received_premium'
      },
      rules: null   // Composite selbst hat keine eigenen Delta/DTE-Regeln —
                     // die gelten pro Zyklus-Schritt (csp_wheel bzw. cc rules)
    }
  };

  // ── ÖFFENTLICHES API ───────────────────────────────────────────────────────
  const KoStrategyRegistry = {

    /** Rohdaten, falls direkter Zugriff nötig ist. */
    strategies: strategies,
    composites: composites,

    /** Metadaten (label/hint/lbKey/category/color) für eine Strategie-ID. */
    getMeta(stratId) {
      const s = strategies[stratId];
      if (s) return { label: s.label, hint: s.hint, lbKey: s.lbKey, category: s.category, color: s.color };
      const c = composites[stratId];
      if (c) return { label: c.label, hint: c.hint, lbKey: c.lbKey, category: c.category, color: c.color };
      return null;
    },

    /** rules-Objekt für eine Einzelstrategie (Trade-Doktor-Konsument). */
    getRules(stratId) {
      const s = strategies[stratId];
      return s ? s.rules : null;
    },

    /** lbKey für eine Strategie- ODER Composite-ID (ersetzt STRATEGY_TO_LB). */
    getLbKey(stratId) {
      const s = strategies[stratId] || composites[stratId];
      return s ? (s.lbKey || null) : null;
    },

    /** stratId (oder Composite-ID) für einen Leaderboard-Key. */
    stratFromLb(lbKey) {
      for (const [id, s] of Object.entries(strategies)) {
        if (s.lbKey === lbKey) return id;
      }
      for (const [id, c] of Object.entries(composites)) {
        if (c.lbKey === lbKey) return id;
      }
      return null;
    },

    /** Vollständige Strategie(+Composite)→Leaderboard-Map. */
    getStratToLbMap() {
      const map = {};
      Object.entries(strategies).forEach(([id, s]) => { if (s.lbKey) map[id] = s.lbKey; });
      Object.entries(composites).forEach(([id, c]) => { if (c.lbKey) map[id] = c.lbKey; });
      return map;
    },

    /** Zu welcher Composite gehört diese Einzelstrategie (falls überhaupt)? */
    getCompositeOf(stratId) {
      const s = strategies[stratId];
      return s ? (s.memberOf || null) : null;
    },

    /** Alle Mitglieder einer Composite-Strategie. */
    getCompositeMembers(compositeId) {
      const c = composites[compositeId];
      return c ? c.members.slice() : [];
    },

    /**
     * Nächster Zustand im Composite-Zyklus nach einem Ereignis.
     * Beispiel: nextCompositeState('wheel', 'csp_wheel', 'onAssignment') -> 'cc'
     */
    nextCompositeState(compositeId, currentStratId, event) {
      const c = composites[compositeId];
      if (!c || !c.cycle[currentStratId]) return null;
      return c.cycle[currentStratId][event] || null;
    }
  };

  // ── EXPORT ─────────────────────────────────────────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = KoStrategyRegistry;
  } else {
    global.KoStrategyRegistry = KoStrategyRegistry;
    global.KoStrategyRegistryLoaded = true;
  }

})(typeof window !== 'undefined' ? window : this);
