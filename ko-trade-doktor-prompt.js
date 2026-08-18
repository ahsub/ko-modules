/**
 * ko-trade-doktor-prompt.js — Trade-Doktor Block E: KI-Erklärschicht
 * ══════════════════════════════════════════════════════════════════
 * Version: 1.0.0 (18.08.2026)
 * Design-Grundlage: TRADE-DOKTOR-KONZEPT.md §3.3 (12.08.2026, Axel).
 *
 * Dritter Prompt-Zweig, weder EIC noch Public:
 * - EIC-Direktheit (konkrete Zahlen, keine Umschweife)
 * - Public-Erklärpflicht (jede Metrik in einem Halbsatz begründen)
 * - OHNE BaFin-Hedging (Output ist NICHT öffentlich, s. Leitplanken §2 —
 *   "Kein Systemoutput in öffentlichen Threads; UIQ bleibt in der
 *   Ansprache unerwähnt". Axel liest die Einschätzung und formuliert
 *   seine Discord-Antwort selbst, in eigenen Worten — deshalb KEIN
 *   "Die Datenlage spricht für..."-Passiv-Konstrukt hier nötig.)
 *
 * WICHTIG: Bekommt AUSSCHLIESSLICH das fertige, deterministische Ergebnis
 * aus Block D (runTradeDoktorAnalysis()) als Kontext. Aufgabe der KI:
 * ERKLÄREN und BEGRÜNDEN, nicht neu berechnen — analog zum bestehenden
 * "Scores immer server-seitig"-Prinzip (CODING-RULES.md §2.4).
 *
 * Repository: ahsub/ko-modules (vorgeschlagener Ablageort)
 * Abhängigkeit: Ergebnis-Objekt aus ko-trade-doktor-context.js
 *   (runTradeDoktorAnalysis())
 */

const TRADE_DOKTOR_ANTI_HALLUZINATION = `
⛔ ABSOLUTES HALLUZINATIONS-VERBOT:
- Verwende AUSSCHLIESSLICH die Werte im ANALYSE-ERGEBNIS unten.
- Erfinde KEINE Kurse, Prämien, IV-Werte, Sektor-News oder Unternehmensdaten.
- schweregrad/deltaAbweichung/dteAbweichung/regimeGateStatus sind fertig
  berechnet — du erklärst und begründest sie, du berechnest NICHTS neu.
- Fehlende Werte (null): explizit als "nicht verfügbar" benennen, nicht
  interpolieren oder schätzen.
`.trim();

const SCHWEREGRAD_FRAMING = {
  GATE_VERSTOSS: 'Das ist ein GRUNDSÄTZLICHER Einwand — die Strategie ist im '
    + 'aktuellen Marktregime komplett gesperrt, unabhängig von Strike/DTE/Delta. '
    + 'Botschaft: "mach das grundsätzlich nicht", nicht "mach es anders".',
  PARAMETER_ABWEICHUNG: 'Die Strategie ist im aktuellen Regime grundsätzlich '
    + 'erlaubt, aber Strike/DTE/Delta weichen vom UIQ-Zielbereich ab. '
    + 'Botschaft: "mach\'s etwas anders", mit konkretem Alternativvorschlag.',
  IM_ZIELBEREICH: 'Keine Beanstandung — der Trade liegt innerhalb des '
    + 'UIQ-Zielbereichs UND das Regime-Gate ist nicht rot. Kurz bestätigen, '
    + 'nicht künstlich nach Kritikpunkten suchen.',
  REGELWERK_FEHLT: 'Für diese Strategie liegt (noch) kein UIQ-Regelwerk vor '
    + '— explizit sagen, dass hier KEINE UIQ-Bewertung möglich ist, statt '
    + 'stillschweigend eine Einschätzung zu improvisieren. Falls im '
    + 'Analyse-Ergebnis ein hinweis-Feld steht: den Grund nennen.',
};

/**
 * Block E — baut den Prompt aus einem Block-D/Pipeline-Ergebnis
 * (runTradeDoktorAnalysis()-Rückgabe, NICHT der rohe Freitext).
 * @param {Object} evaluation - Erfolgreiches Ergebnis von
 *   runTradeDoktorAnalysis() (muss .schweregrad enthalten — Fehler-Objekte
 *   von Block B/C sollen VOR diesem Aufruf separat behandelt werden, s.
 *   Rückfrage-Prinzip TRADE-DOKTOR-KONZEPT.md §4).
 * @returns {string} fertiger Prompt-Text für den LLM-Call
 */
function buildTradeDoktorPrompt(evaluation) {
  if (!evaluation || !evaluation.schweregrad) {
    throw new Error(
      '[TradeDoktor Block E] evaluation.schweregrad fehlt — Block E darf nur '
      + 'mit einem erfolgreichen Block-D-Ergebnis aufgerufen werden, nicht mit '
      + 'einem Fehler-Objekt (UNVOLLSTAENDIG/NICHT_IM_SCAN_UNIVERSUM) aus Block B/C.'
    );
  }

  const e = evaluation;
  const framing = SCHWEREGRAD_FRAMING[e.schweregrad] || '';

  const analyseErgebnis = {
    ticker: e.ticker,
    strategie: e.strategy,
    strike: e.strike,
    dte: e.dte,
    delta: e.delta,
    schweregrad: e.schweregrad,
    deltaAbweichung: e.deltaAbweichung,
    dteAbweichung: e.dteAbweichung,
    regimeGateStatus: e.regimeGateStatus,
    ivRankKontext: e.ivRankKontext,
    rulesUsed: e.rulesUsed,
    tickerRecord: e.tickerRecord,
  };

  return TRADE_DOKTOR_ANTI_HALLUZINATION
    + '\n\nDu bist Axels persönlicher Options-Trade-Analyst. Ein Bekannter/eine '
    + 'Discord-Gruppe hat eine Trade-Idee gepostet — Axel möchte deine Einschätzung, '
    + 'BEVOR er selbst antwortet oder mitzieht. Das hier ist NICHT für eine '
    + 'Veröffentlichung bestimmt, sondern Axels private Analyse-Grundlage.\n\n'
    + 'STIL: Direkt und konkret wie ein erfahrener Kollege (keine BaFin-Formulierungen '
    + 'nötig, das ist kein öffentlicher Output) — UND jede Metrik kurz erklären, '
    + 'nicht nur nennen (z.B. "Delta 0.45 liegt 0.15 über dem Zielbereich — das '
    + 'bedeutet eine höhere Andienungswahrscheinlichkeit als beabsichtigt", nicht nur '
    + '"Delta 0.45, Ziel 0.15-0.30"). Kein Markdown. Keine Emoji-Aufzählungen.\n\n'
    + 'EINORDNUNG DES SCHWEREGRADS "' + e.schweregrad + '": ' + framing + '\n\n'
    + 'ANALYSE-ERGEBNIS (fertig berechnet, NICHT neu bewerten):\n'
    + JSON.stringify(analyseErgebnis, null, 2) + '\n\n'
    + 'WICHTIGER HINWEIS FÜR DEINE ANTWORT: ' + e.positionshinweis + '\n\n'
    + 'AUFGABE:\n'
    + '1. EINSCHÄTZUNG (2-3 Sätze): Passt dieser Trade zu UIQs eigenen Regeln? '
    + 'Direkt beantworten, dann begründen.\n'
    + '2. ABWEICHUNGEN ERKLÄREN (falls vorhanden): für jede Abweichung (Delta/DTE/'
    + 'Regime-Gate) einen Satz — was weicht ab UND warum das für DIESEN Trade '
    + 'relevant ist (Risiko höher/niedriger, andere Wahrscheinlichkeit etc.).\n'
    + '3. WAS AXEL TUN KÖNNTE (nur falls PARAMETER_ABWEICHUNG oder GATE_VERSTOSS): '
    + 'konkreter alternativer Strike/DTE-Vorschlag ODER klare Aussage "in diesem '
    + 'Regime grundsätzlich nicht empfehlenswert".\n'
    + '4. EINSCHRÄNKUNGEN NENNEN: falls ivRankKontext nur ein Näherungswert ist '
    + 'oder rulesUsed unvollständig — das explizit erwähnen, nicht verschweigen.\n\n'
    + 'Antworte auf Deutsch. Max. 250 Wörter.';
}

const KoTradeDoktorPrompt = {
  VERSION: '1.0.0',
  SCHWEREGRAD_FRAMING,
  buildTradeDoktorPrompt,
};

if (typeof window !== 'undefined') {
  window.KoTradeDoktorPrompt = KoTradeDoktorPrompt;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KoTradeDoktorPrompt;
}
