/**
 * ko-trade-doktor-evaluator.js — Trade-Doktor Block D: deterministische
 * Bewertungsfunktion
 * ══════════════════════════════════════════════════════════════════
 * Version: 1.0.0 (18.08.2026)
 * Design-Grundlage: TRADE-DOKTOR-KONZEPT.md §3.2 (12./13.08.2026, Axel).
 *
 * WICHTIG: Nutzt `KoStrategyRegistry.getRules(stratId)` (ko-strategy-
 * registry.js), NICHT `Strategies[stratId].rules` aus ko-strategies.js wie
 * im ursprünglichen Konzeptdokument beschrieben — diese Datei existiert seit
 * dem 18.08.2026-Dead-Code-Audit nicht mehr, die Registry-Migration vom
 * 15.08.2026 hat sie strukturell abgelöst.
 *
 * KEINE KI-Beteiligung — reine Berechnung/Lookup, analog zum bestehenden
 * "Scores immer server-seitig"-Prinzip. Ergebnis ist die Eingabe für die
 * (noch zu bauende) KI-Erklärschicht (Block E), nicht deren Ersatz.
 *
 * BEKANNTE EINSCHRÄNKUNG (nicht in dieser Session lösbar, hier nur
 * transparent gemacht statt stillschweigend übergangen):
 * Von den 4 möglichen Block-B-Strategie-Ausgaben (options/csp_wheel+cc,
 * weekly_income, atmna, collar) hat NUR `collar` KEIN rules-Objekt in der
 * Registry (Registry-Kommentar: "vollständige Behandlung in Options-
 * Doktor-Modul, Suite Phase 3" — bewusst zurückgestellt). Die anderen
 * drei (csp_wheel/cc, atmna, weekly_income seit 18.08.2026) sind
 * vollständig abgedeckt. evaluateOptionsTradeAgainstUIQRules() gibt für
 * den collar-Fall sauber REGELWERK_FEHLT zurück statt fälschlich
 * IM_ZIELBEREICH zu behaupten.
 *
 * Repository: ahsub/ko-modules (vorgeschlagener Ablageort, neben
 * ko-strategy-registry.js und ko-trade-doktor-parser.js)
 */

const SCHWEREGRAD = {
  GATE_VERSTOSS: 'GATE_VERSTOSS',
  PARAMETER_ABWEICHUNG: 'PARAMETER_ABWEICHUNG',
  IM_ZIELBEREICH: 'IM_ZIELBEREICH',
  REGELWERK_FEHLT: 'REGELWERK_FEHLT',
};

function _deltaAbweichung(deltaRange, delta) {
  if (!deltaRange || delta == null) return null;
  const [lo, hi] = deltaRange;
  if (delta < lo) return { richtung: 'unter', ziel: [lo, hi], abstand: +(lo - delta).toFixed(3) };
  if (delta > hi) return { richtung: 'ueber', ziel: [lo, hi], abstand: +(delta - hi).toFixed(3) };
  return null;
}

function _dteAbweichung(dteRange, dte) {
  if (!dteRange || dte == null) return null;
  const [lo, hi] = dteRange;
  if (dte < lo) return { richtung: 'unter', ziel: [lo, hi], abstand: lo - dte };
  if (dte > hi) return { richtung: 'ueber', ziel: [lo, hi], abstand: dte - hi };
  return null;
}

/**
 * Block D — Haupteinstiegspunkt.
 * @param {string} ticker
 * @param {string} strategy - UIQ-Strategie-ID (aus Block B), z.B. 'options',
 *   'atmna', 'collar', 'weekly_income'. HINWEIS: Block B nennt die
 *   CSP/Wheel/CC-Strategie 'options' (s. STRATEGY_KEYWORD_PATTERNS in
 *   ko-trade-doktor-parser.js) — die Registry führt sie unter 'csp_wheel'
 *   bzw. 'cc'. Ohne explizite Zuordnung, welche der beiden gemeint ist
 *   (reiner CSP-Einstieg vs. bereits laufender Covered Call), wird 'options'
 *   auf 'csp_wheel' gemappt (häufigerer Fall bei einem NEUEN Trade-Post).
 * @param {number} strike
 * @param {number} dte
 * @param {number|null} delta - optional (s. Block B)
 * @param {Object} uiqContext - { regime: string, gates: getStrategyGates()-
 *   Ergebnis für DIESES Regime (nicht die ganze Tabelle), ivRankKontext:
 *   optionales Objekt mit Realized-Vol-Proxy-Daten (Phase 1, s. Konzept §3.2) }
 * @returns {Object}
 */
function evaluateOptionsTradeAgainstUIQRules(ticker, strategy, strike, dte, delta, uiqContext) {
  uiqContext = uiqContext || {};

  // Block-B-ID 'options' -> Registry-ID 'csp_wheel' (s. JSDoc oben)
  const registryStratId = strategy === 'options' ? 'csp_wheel' : strategy;

  const rules = (typeof KoStrategyRegistry !== 'undefined')
    ? KoStrategyRegistry.getRules(registryStratId)
    : null;

  const base = {
    ticker, strategy, registryStratId, strike, dte, delta,
    positionshinweis: 'Statischer Referenzrahmen zum Analysezeitpunkt — '
      + 'keine Live-Positionsüberwachung, kein Delta-/P&L-Tracking über Zeit '
      + '(s. TRADE-DOKTOR-KONZEPT.md §3.2).',
  };

  if (!rules) {
    return Object.assign({}, base, {
      schweregrad: SCHWEREGRAD.REGELWERK_FEHLT,
      deltaAbweichung: null,
      dteAbweichung: null,
      regimeGateStatus: null,
      ivRankKontext: null,
      hinweis: registryStratId === 'collar'
        ? 'Collar hat noch kein Regelwerk in der Registry (rules:null, '
          + 'bewusst zurückgestellt auf Options-Doktor-Modul, Suite Phase 3).'
        : `Keine Regeln für '${registryStratId}' in KoStrategyRegistry hinterlegt.`,
    });
  }

  const gates = uiqContext.gates; // erwartet: EIN Regime-Eintrag (.strategies-Map), nicht die volle Tabelle
  const gateEntry = gates && gates.strategies ? gates.strategies[registryStratId] : null;
  const regimeGateStatus = gateEntry
    ? { regime: uiqContext.regime || null, active: gateEntry.active, color: gateEntry.color, note: gateEntry.note }
    : null;

  const gateVerstoss = !!(regimeGateStatus && regimeGateStatus.color === 'red');

  const deltaAbweichung = _deltaAbweichung(rules.deltaRange, delta);
  const dteAbweichung = _dteAbweichung(rules.dteRange, dte);

  let schweregrad;
  if (gateVerstoss) {
    schweregrad = SCHWEREGRAD.GATE_VERSTOSS;
  } else if (deltaAbweichung || dteAbweichung) {
    schweregrad = SCHWEREGRAD.PARAMETER_ABWEICHUNG;
  } else {
    schweregrad = SCHWEREGRAD.IM_ZIELBEREICH;
  }

  const ivRankKontext = uiqContext.ivRankKontext
    ? Object.assign(
        { naeherungshinweis: 'Realized Vol ≠ IV (Phase 1, s. TRADE-DOKTOR-KONZEPT.md §3.2)' },
        uiqContext.ivRankKontext
      )
    : { naeherungshinweis: 'Keine IV-/RealizedVol-Daten übergeben' };

  return Object.assign({}, base, {
    schweregrad,
    deltaAbweichung,
    dteAbweichung,
    regimeGateStatus,
    ivRankKontext,
    rulesUsed: rules,
  });
}

const KoTradeDoktorEvaluator = {
  VERSION: '1.0.0',
  SCHWEREGRAD,
  evaluateOptionsTradeAgainstUIQRules,
};

if (typeof window !== 'undefined') {
  window.KoTradeDoktorEvaluator = KoTradeDoktorEvaluator;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KoTradeDoktorEvaluator;
}
