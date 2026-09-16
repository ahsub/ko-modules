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
 * Version: 1.5 (16.09.2026 — Canonical Strategy Ontology, Phase 1. Neues
 *   `ontology`-Feld je Strategie: { style, setup, methodology, vehicle,
 *   structure }. Fünf Achsen, bewusst OHNE eigene Kombinatorik-Engine (Phase 2,
 *   nicht Teil dieser Version) — reine Metadaten-/Semantikschicht, ändert
 *   nichts an bestehenden Scores/Prompts/Leaderboards/Strategy-Matching.
 *   Entscheidungsverlauf (Ontologie-Review 16.09.2026):
 *     - Minervini/SEPA ist METHODOLOGY, nicht SETUP (long_minervini bekommt
 *       setup:'Momentum', methodology:'Minervini_SEPA'; ko_long dieselbe
 *       Setup/Methodology-Kombination, aber vehicle:'KO' statt 'Stock' —
 *       dieselbe Investment-Idee, andere Instrumentierung).
 *     - FUNCTION (Income/Growth/Hedge/...) bewusst NICHT als sechste
 *       Dimension aufgenommen — Scope-Disziplin, ggf. spätere Erweiterung.
 *     - DIRECTION bewusst NICHT als eigene Top-Level-Achse: bei Multi-Leg-
 *       Optionsstrukturen (CC = short call + long stock, Collar = long
 *       stock + long put + short call) semantisch nicht sauber auf
 *       Strategieebene abbildbar. Stattdessen bei Stock/KO in `structure`
 *       kodiert (Direct_Long/Direct_Short, KO_Long) — sonst wäre Richtung
 *       nirgends erfasst (dieselbe Lücke, die bei Optionen vermieden wurde).
 *     - CSP-Varianten (csp_wheel/atmna/weekly_income) NICHT auf identisches
 *       `structure` reduziert — teilen structure.type:'CSP', unterscheiden
 *       sich über structure.variant ('Wheel'/'ATM_NA'/'Weekly'). Bleiben
 *       eigenständige UIQ-Strategierezepte, keine künstliche Gleichsetzung.
 *     - KORREKTUR (zweite Review-Runde): style bei allen fünf Options-
 *       Strategien (csp_wheel/atmna/weekly_income/cc/collar) auf `null`
 *       statt 'Income'/'Protection' — das sind Funktionsbeschreibungen,
 *       keine Investment-Styles im Sinne der STYLE-Achse (Value/Quality/
 *       Growth/Dividend/LowVol). "Lieber ein Feld leer lassen als eine
 *       semantisch falsche Information hineinschreiben."
 *     - Standort geprüft: master_market_data.json.strategyMeta ist reine
 *       Laufzeit-Snapshot-Metadaten ({regimeUsed, timestamp, enriched}),
 *       keine statische Konfiguration — deshalb hier in dieser Registry,
 *       nicht dort.
 *   Nebenbefund beim Umsetzen: `lbKey` war bei atmna/collar/weekly_income
 *   seit 18.08.2026 fälschlich `null` ("kein eigener Leaderboard-Tab") —
 *   market_aggregator.py liefert alle drei Leaderboards längst (verifiziert
 *   gegen echte master_market_data.json, 15.09.2026). Korrigiert.
 *   Neue Funktion getOntology(stratId) — bewusst NICHT in getMeta()
 *   integriert (andere Konsumenten-Erwartung). getMeta()/getRules() für die
 *   zehn neuen reinen Ontologie-Einträge (Stock/KO, ohne label/hint/lbKey)
 *   explizit gegen Regression getestet: liefern weiterhin `null` wie vor
 *   dieser Version, nicht `undefined` (s. getMeta()-Fix: prüft `s.label`
 *   statt nur `s`, sonst hätte ein Objekt aus lauter undefined-Feldern
 *   `null` ersetzt — bei Kombinatorik-Checks à la `if (getMeta(id))` hätte
 *   das falsch-positiv gegriffen).
 * Version: 1.4 (18.08.2026 — atmna.rules um 3 Punkte ergänzt nach kritischer
 *   Prüfung gegen Eric Ludwig, "Optionen unschlagbar handeln" (von Axel
 *   bereitgestellt): expirationPreference (monatlich vor Weekly),
 *   checkpointDaysBeforeExpiry:5 (fester Prüfzeitpunkt), postAssignmentEndgame
 *   (asymmetrische Covered-Call-Technik nach Andienung, komplett neue Technik).
 *   6 bestehende Zahlenwerte (ATM/30 DTE, alle 3 Roll-Stufen, maxRollDte:90)
 *   dabei exakt bestätigt, keine Korrektur nötig. Details:
 *   UEBERGABE-2026-08-18.md.
 * Version: 1.3 (18.08.2026 — weekly_income.rules neu ergänzt, Trade-Doktor
 *   Block D. Quelle: T.R. Lawrence, "Options Trading: How to Turn Every
 *   Friday Into Payday Using Weekly Options" (Kap. 5-7, "KaChing Method"),
 *   von Axel bereitgestellt. Deckt sich mit der bereits bestehenden
 *   Diagonal-Put-Spread-Definition in ko-prompts.js (dort nie ins
 *   maschinenlesbare rules-Format übertragen — genau die Lücke, die
 *   evaluateOptionsTradeAgainstUIQRules() als REGELWERK_FEHLT aufgedeckt
 *   hat). dteRange/deltaRange erfassen bewusst NUR das kurze, wöchentliche
 *   Bein (Axel-Bestätigung 18.08.2026: streng genommen keine Single-Leg-
 *   Strategie wie die übrigen Einträge, aber als eigenständige UIQ-Strategie
 *   bereits integriert) — das lange Versicherungs-Bein (120 DTE) hat ein
 *   separates longPutInsurance-Feld, da Discord-Trade-Posts (Block B) es
 *   praktisch nie mitnennen. Neu ergänzt, bisher nirgends in UIQ erfasst:
 *   riskPerTrade (max 5%, empfohlen 3% des Portfolios, Buch Kap.7).
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
      ontology: { style: null, setup: null, methodology: null, vehicle: 'Option',
        structure: { type: 'CSP', variant: 'Wheel' } },
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
      ontology: { style: null, setup: null, methodology: null, vehicle: 'Option',
        structure: { type: 'CoveredCall' } },
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
      // KORRIGIERT 16.09.2026: lbKey war seit 18.08. faelschlich `null` ("kein
      // eigener Leaderboard-Tab") — market_aggregator.py liefert das
      // `options_atmna`-Leaderboard laengst (verifiziert gegen echte
      // master_market_data.json, 15.09.2026). Drift zwischen dieser Registry
      // und dem tatsaechlichen Aggregator-Output, nicht erst hier entstanden.
      lbKey: 'options_atmna',
      category: 'options',
      color: '#a371f7',
      memberOf: null,                   // eigenständig, NICHT Teil der Wheel-Composite
      ontology: { style: null, setup: null, methodology: null, vehicle: 'Option',
        structure: { type: 'CSP', variant: 'ATM_NA' } },
      rules: {
        deltaRange: null,               // ATM per Definition — kein Delta-Fenster
        dteRange: [30, 30],             // "~30 Tage, bevorzugt 3. Freitag"; Roll-Fenster separat
        // NEU (18.08.2026, Quelle: Eric Ludwig, "Optionen unschlagbar handeln",
        // Kap. "Schritt-für-Schritt Anleitung" — von Axel bereitgestellt,
        // kritisch gegen die bestehenden Werte geprüft). 6 unabhängige
        // Zahlenwerte (ATM/30 DTE, alle 3 Roll-Stufen, maxRollDte:90) exakt
        // bestätigt — s. UEBERGABE-2026-08-18.md. Drei ECHTE Ergänzungen:
        expirationPreference: 'monatlich (3. Freitag) bevorzugt vor Weekly — '
          + 'bessere Liquidität/engere Spreads, auch wenn das ein paar Tage '
          + 'vom 30-Tage-Ziel abweicht',
        checkpointDaysBeforeExpiry: 5,  // fester Prüfzeitpunkt zusätzlich zu
                                        // den relativen profitTaking-Stufen
                                        // unten (nicht als Ersatz dafür)
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
        // NEU (18.08.2026, Ludwig "Endspiel"-Kapitel): Nach Andienung (Schritt 5,
        // alle 3 Rollstufen ausgeschöpft) — asymmetrische Covered-Call-Technik,
        // KEIN klassisches "2 OTM-Calls auf 200 Aktien". Stattdessen 1 ATM-Call
        // auf 200 Aktien: liefert laut Buch typischerweise 2-4x mehr Prämie als
        // 2 OTM-Calls zusammen, bei vergleichbarem Abwärtsschutz UND die Hälfte
        // der Aktien (100 von 200) behält uneingeschränktes Aufwärtspotenzial.
        // Eigenständige, bisher in UIQ nicht abgebildete Technik — noch NICHT
        // von Trade-Doktor Block D ausgewertet (Block D prüft nur Neueinstiege
        // gegen deltaRange/dteRange, keine Post-Assignment-Zustandsmaschine).
        postAssignmentEndgame: {
          technik: 'asymmetrische_covered_call',
          kontraktverhaeltnis: '1 ATM-Call pro 200 Aktien (NICHT 2 OTM-Calls)',
          dteTarget: 30,
          strikeGuidance: 'ATM (am Geld), nicht auf Höhe der Gewinnschwelle',
          begruendung: '1 ATM-Call liefert typischerweise 2-4x mehr Prämie als '
            + '2 OTM-Calls zusammen — vergleichbarer Abwärtsschutz, aber 100 der '
            + '200 Aktien behalten volles Aufwärtspotenzial (Ludwig, Kap. '
            + '"Unser Trumpf: Die asymmetrische Covered Call Technik").'
        },
        strikeGuidance: 'ATM (at-the-money)',
        strikeStaggeringMaxPct: 2.5
      }
    },

    collar: {
      label: '🛡️ Collar/Protective Put',
      hint: '🛡️ Collar/Protective Put: Absicherung Bestandsposition · BULL_FRAGILE · Proxy-Strikes',
      // KORRIGIERT 16.09.2026: s. Kommentar bei atmna — options_collar-Leaderboard
      // existiert bereits im Aggregator-Output.
      lbKey: 'options_collar',
      category: 'options',
      color: '#0ea5e9',
      memberOf: null,
      ontology: { style: null, setup: null, methodology: null, vehicle: 'Option',
        structure: { type: 'Collar' } },
      rules: null   // kein STRATEGIE_MATRIX-Eintrag — vollständige Behandlung in
                     // Options-Doktor-Modul (Suite Phase 3), s. ko-prompts.js Kommentar
    },

    // NEU (18.08.2026, Trade-Doktor Block D — Quelle: T.R. Lawrence, "Options
    // Trading: How to Turn Every Friday Into Payday Using Weekly Options",
    // Kap. 5-7 "KaChing Method", von Axel bereitgestellt). Deckt sich mit der
    // bereits bestehenden Prompt-Definition in ko-prompts.js (Diagonal-Put-
    // Spread: 120-DTE-Long-Put als Versicherung + 7-DTE-Short-Put als
    // wöchentliches Income) — hier erstmals ins maschinenlesbare rules-Format
    // übertragen. Streng genommen KEINE Single-Leg-Strategie wie die übrigen
    // Registry-Einträge (Axel-Bestätigung 18.08.2026), aber bereits als
    // eigenständige UIQ-Strategie mit 12-Strategie-Kanon integriert (s.
    // ko-market-state.js STRATEGY_ORDER). dteRange/deltaRange beschreiben
    // AUSSCHLIESSLICH das kurze, handelbare Weekly-Bein — das lange
    // Versicherungs-Bein hat ein eigenes, separates Feld (longPutInsurance),
    // da es in einem typischen Discord-Trade-Post (Trade-Doktor Block B)
    // praktisch nie separat genannt wird.
    weekly_income: {
      label: '💰 CSP (Weekly)',
      hint: '💰 CSP (Weekly): Diagonal Put-Spread · ATM-Short 7 DTE + Long-Versicherung 120 DTE · 4×/Monat',
      // KORRIGIERT 16.09.2026: s. Kommentar bei atmna — options_weekly-Leaderboard
      // existiert bereits im Aggregator-Output.
      lbKey: 'options_weekly',
      category: 'options',
      color: '#34d399',
      memberOf: null,
      ontology: { style: null, setup: null, methodology: null, vehicle: 'Option',
        structure: { type: 'CSP', variant: 'Weekly' } },
      rules: {
        deltaRange: [0.25, 0.50],       // Buch zeigt Beispiele 0.27 (konservativ,
                                        // 73% Erfolgsws.) bis 0.50 (ATM) — kein
                                        // striktes Einzelziel, bewusste Bandbreite
        dteRange: [1, 10],              // NUR das kurze Weekly-Bein, passend zum
                                        // Parser-Schwellenwert (CSP mit DTE<=10
                                        // -> weekly_income, s. ko-trade-doktor-
                                        // parser.js resolveStrategy())
        profitTaking: [
          { pct: 50, condition: null, action: 'close' }
        ],
        rollRules: {
          cadence: 'woechentlich (freitags), neuer ATM-Put, 4x/Monat'
        },
        riskPerTrade: {
          maxPct: 5, empfohlenPct: 3   // Lawrence, Kap.7 "Risk Percentages" —
                                        // bisher NICHT in ko-prompts.js erfasst,
                                        // neu aus dem Buch ergaenzt
        },
        longPutInsurance: {
          dteTarget: 120,
          deltaTarget: 0.25,
          deltaRangeRiskOn: [0.35, 0.40],  // "risk-on"-Umfeld lt. Buch
          hinweis: 'Zweites Bein der Diagonal-Spread-Struktur — wird von '
                 + 'Block B/D (Single-Leg-Discord-Parser) nicht separat '
                 + 'erfasst, nur als Kontext fuer Block E (KI-Erklaerschicht).'
        }
      }
    },

    // Nicht-Options-Strategien: label/hint/lbKey/category/color bleiben
    // unverändert Single-Source-of-Truth in ko-strategies.js (keine
    // Duplizierung). Diese Einträge tragen AUSSCHLIESSLICH das neue
    // `ontology`-Feld (Phase 1, 16.09.2026) — s. Versions-Historie unten.
    long_minervini: {
      ontology: { style: null, setup: 'Momentum', methodology: 'Minervini_SEPA',
        vehicle: 'Stock', structure: 'Direct_Long' },
      rules: null   // s. getRules()-Kommentar: explizit statt undefined
    },
    ko_long: {
      // Dieselbe Setup/Methodology-Kombination wie long_minervini — ko_long
      // ist dieselbe Investment-Idee, nur mit KO-Zertifikat statt Aktie
      // instrumentiert (s. Ontologie-Entscheidung 16.09.2026).
      ontology: { style: null, setup: 'Momentum', methodology: 'Minervini_SEPA',
        vehicle: 'KO', structure: 'KO_Long' },
      rules: null
    },
    long_swing: {
      ontology: { style: null, setup: 'Swing', methodology: null,
        vehicle: 'Stock', structure: 'Direct_Long' },
      rules: null
    },
    long_mr: {
      ontology: { style: null, setup: 'MeanReversion', methodology: null,
        vehicle: 'Stock', structure: 'Direct_Long' },
      rules: null
    },
    long_breakout: {
      ontology: { style: null, setup: 'Breakout', methodology: null,
        vehicle: 'Stock', structure: 'Direct_Long' },
      rules: null
    },
    vcp_setups: {
      ontology: { style: null, setup: 'VCP', methodology: null,
        vehicle: 'Stock', structure: 'Direct_Long' },
      rules: null
    },
    short_breakdown: {
      ontology: { style: null, setup: 'Breakdown', methodology: null,
        vehicle: 'Stock', structure: 'Direct_Short' },
      rules: null
    },
    short_fading: {
      ontology: { style: null, setup: 'Fading', methodology: null,
        vehicle: 'Stock', structure: 'Direct_Short' },
      rules: null
    },
    long_dividend: {
      ontology: { style: 'Dividend', setup: null, methodology: null,
        vehicle: 'Stock', structure: 'Direct_Long' },
      rules: null
    },
    long_value: {
      ontology: { style: 'Value', setup: null, methodology: null,
        vehicle: 'Stock', structure: 'Direct_Long' },
      rules: null
    },

    // Nicht-Options-Strategien (ko, momentum, vcp, swing,
    // meanrev, breakout, fading_short, dividend, value) bleiben unverändert
    // in ko-strategies.js definiert — sie brauchen kein `rules`-Feld im
    // Trade-Doktor-Sinn und keine Composite-Zugehörigkeit. Diese Registry
    // wird bei Bedarf schrittweise erweitert, nicht in einem Rutsch.
    // (weekly_income NICHT mehr hier gelistet seit 18.08.2026 — hat jetzt
    // einen eigenen Registry-Eintrag oben, s. Trade-Doktor Block D.)
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

    /** Metadaten (label/hint/lbKey/category/color) für eine Strategie-ID.
     * Prüft bewusst `s.label` statt nur `s` — die zehn reinen Ontologie-
     * Einträge (16.09.2026, Stock/KO-Strategien) haben kein label/hint/etc.
     * und sollen hier weiterhin `null` liefern (Verhalten vor 16.09.2026),
     * nicht ein Objekt aus lauter `undefined`-Feldern. */
    getMeta(stratId) {
      const s = strategies[stratId];
      if (s && s.label) return { label: s.label, hint: s.hint, lbKey: s.lbKey, category: s.category, color: s.color };
      const c = composites[stratId];
      if (c) return { label: c.label, hint: c.hint, lbKey: c.lbKey, category: c.category, color: c.color };
      return null;
    },

    /**
     * Ontologie-Metadaten (Phase 1, 16.09.2026) für eine Strategie-ID —
     * STYLE/SETUP/METHODOLOGY/VEHICLE/STRUCTURE. Bewusst eigene Funktion,
     * NICHT in getMeta() integriert: getMeta() wird von bestehendem Code
     * konsumiert, der ein Objekt mit genau den fünf alten Feldern erwartet
     * (label/hint/lbKey/category/color) — das hier anzuhängen haette
     * bestehendes Verhalten unnoetig veraendert. Gibt `null` zurueck, wenn
     * fuer diese stratId noch keine Ontologie erfasst ist (z.B. `wheel`-
     * Composite selbst, oder eine kuenftig neu hinzukommende Strategie vor
     * ihrer Ontologie-Einordnung).
     */
    getOntology(stratId) {
      const s = strategies[stratId];
      return (s && s.ontology) ? s.ontology : null;
    },

    /** rules-Objekt für eine Einzelstrategie (Trade-Doktor-Konsument). Die
     * zehn Stock/KO-Ontologie-Einträge (16.09.2026) setzen `rules: null`
     * explizit, damit diese Funktion für sie weiterhin `null` liefert statt
     * `undefined` — sie existierten vorher gar nicht in `strategies`. */
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
