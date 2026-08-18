/**
 * ko-trade-doktor-context.js — Trade-Doktor Block C + Pipeline-Orchestrierung
 * ══════════════════════════════════════════════════════════════════
 * Version: 1.0.0 (18.08.2026)
 * Design-Grundlage: TRADE-DOKTOR-KONZEPT.md, Bausteine-Tabelle §5.
 *
 * Block C ("Matching gegen Scan-Universum") ist im Konzeptdokument als
 * eigener Backlog-Punkt gelistet, ABER der NICHT_IM_SCAN_UNIVERSUM-Check
 * selbst ist bereits Teil von Block B's parseTradeIdea() (§4.1-Pseudocode
 * sieht ihn dort explizit vor). Diese Datei übernimmt daher die
 * verbleibende, eigenständige Aufgabe von Block C: den vollen Datensatz
 * zum bereits verifizierten Ticker holen (Kontext-Anreicherung für Block D
 * — z.B. aktueller Kurs für spätere Plausibilitätsprüfungen wie
 * "Strike weit vom aktuellen Kurs entfernt"), PLUS eine Orchestrierungs-
 * funktion, die Block B → C → D zu einem einzigen Aufruf zusammenführt.
 *
 * Repository: ahsub/ko-modules (vorgeschlagener Ablageort)
 * Abhängigkeiten: ko-trade-doktor-parser.js (Block B),
 *   ko-trade-doktor-evaluator.js (Block D), KoMarketState (ko-market-state.js)
 */

/**
 * Block C — Kontext-Anreicherung für einen bereits von Block B verifizierten
 * Trade (Ticker ist garantiert im Scan-Universum, sonst hätte Block B schon
 * NICHT_IM_SCAN_UNIVERSUM zurückgegeben).
 * @param {Object} parsedTrade - Erfolgreiches Block-B-Ergebnis (ok:true)
 * @param {Object} scanUniverse - bySymbol-Map
 * @param {string} regime - aktuelles MSE-Regime (z.B. 'BULL_QUIET')
 * @returns {Object} { ok:true, tickerRecord, regime, gates } oder
 *   { error: 'REGIME_FEHLT' } falls KoMarketState/regime nicht verfügbar
 */
function buildTradeContext(parsedTrade, scanUniverse, regime) {
  const tickerRecord = scanUniverse ? scanUniverse[parsedTrade.ticker] : null;
  if (!tickerRecord) {
    // Sollte durch Block B bereits abgefangen sein — hier nur als
    // zusätzliche Absicherung, falls buildTradeContext isoliert (ohne
    // vorherigen Block-B-Aufruf) genutzt wird.
    return { error: 'NICHT_IM_SCAN_UNIVERSUM', ticker: parsedTrade.ticker };
  }

  if (!regime) {
    return { error: 'REGIME_FEHLT', hinweis: 'Kein aktuelles MSE-Regime übergeben.' };
  }

  const gates = (typeof KoMarketState !== 'undefined')
    ? KoMarketState.getStrategyGates(regime)
    : null;

  return { ok: true, ticker: parsedTrade.ticker, tickerRecord, regime, gates };
}

/**
 * Orchestrierung: Freitext -> Block B (Parsen) -> Block C (Anreicherung) ->
 * Block D (Bewertung). EIN Aufruf für den kompletten deterministischen Teil
 * der Trade-Doktor-Pipeline. Block E (KI-Erklärschicht) konsumiert das
 * Ergebnis dieser Funktion als ctx, ist hier NICHT enthalten.
 * @param {string} text - Freitext-Trade-Idee
 * @param {Object} scanUniverse - bySymbol-Map
 * @param {string} regime - aktuelles MSE-Regime
 * @param {Object} [ivRankKontext] - optional, Phase-1-Realized-Vol-Proxy
 * @returns {Object} Fehler-Objekt (error-Feld) ODER vollständiges
 *   Block-D-Ergebnis + tickerRecord
 */
function runTradeDoktorAnalysis(text, scanUniverse, regime, ivRankKontext) {
  if (typeof KoTradeDoktorParser === 'undefined') {
    return { error: 'MODUL_FEHLT', hinweis: 'ko-trade-doktor-parser.js nicht geladen.' };
  }
  if (typeof KoTradeDoktorEvaluator === 'undefined') {
    return { error: 'MODUL_FEHLT', hinweis: 'ko-trade-doktor-evaluator.js nicht geladen.' };
  }

  const parsed = KoTradeDoktorParser.parseTradeIdea(text, scanUniverse);
  if (parsed.error) return parsed; // UNVOLLSTAENDIG oder NICHT_IM_SCAN_UNIVERSUM

  const context = buildTradeContext(parsed, scanUniverse, regime);
  if (context.error) return context;

  const uiqContext = { regime: context.regime, gates: context.gates, ivRankKontext: ivRankKontext || null };

  const evaluation = KoTradeDoktorEvaluator.evaluateOptionsTradeAgainstUIQRules(
    parsed.ticker, parsed.strategy, parsed.strike, parsed.dte, parsed.delta, uiqContext
  );

  return Object.assign({ tickerRecord: context.tickerRecord }, evaluation);
}

const KoTradeDoktorContext = {
  VERSION: '1.0.0',
  buildTradeContext,
  runTradeDoktorAnalysis,
};

if (typeof window !== 'undefined') {
  window.KoTradeDoktorContext = KoTradeDoktorContext;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KoTradeDoktorContext;
}
