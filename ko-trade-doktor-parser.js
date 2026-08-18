/**
 * ko-trade-doktor-parser.js — Trade-Doktor Block B: Freitext-Parser
 * ══════════════════════════════════════════════════════════════════
 * Version: 1.0.0 (18.08.2026)
 * Design-Grundlage: TRADE-DOKTOR-KONZEPT.md §4.1 (12./13.08.2026, Axel).
 * Extrahiert { ticker, strategy, strike, dte, delta } aus Discord-Trade-
 * Posts wie "NVDA CSP 45 DTE Strike 160 Delta ~0,20". Bei Unklarheiten:
 * NACHFRAGEN statt raten (konsistent mit KI_ANTI_HALLUZINATION-Prinzip,
 * gilt laut Konzeptdokument auch für diesen nicht-KI-Extraktionsschritt).
 *
 * WICHTIG — Architektur-Drift seit Konzepterstellung (18.08.2026-Hinweis):
 * Das Konzeptdokument sieht ein `rules`-Feld in `ko-strategies.js` vor
 * (§3.2). Das ist mittlerweile überholt — seit der Registry-Migration
 * (15.08.2026) ist `ko-strategy-registry.js` die Single Source of Truth
 * für Delta-/DTE-Zielbereiche, und `ko-strategies.js` wurde am 18.08.2026
 * als totes Modul komplett entfernt (s. axel-scanner/index.html v470).
 * Block D (evaluateOptionsTradeAgainstUIQRules(), noch nicht gebaut) MUSS
 * daher gegen `KoStrategyRegistry.getRules(stratId)` matchen, NICHT gegen
 * ein `Strategies[stratId].rules`-Feld wie im Konzeptdokument beschrieben.
 * Block B selbst (dieser Parser) ist von dieser Drift nicht betroffen —
 * er liefert nur die rohen extrahierten Felder, keine Regelbewertung.
 *
 * Repository: ahsub/ko-modules (vorgeschlagener Ablageort — neben
 * ko-strategy-registry.js, analog zur bestehenden Modul-Konvention)
 */

// ── STRATEGIE-SCHLÜSSELWORT-TABELLE (§4.1) ─────────────────────────────────
// Reihenfolge der Prüfung ist wichtig: 'weekly'-Signalwörter zuerst, DANN
// generische CSP/CC-Erkennung — die eigentliche CSP/weekly-Disambiguierung
// läuft aber über DTE (s. resolveStrategy()), nicht allein über Keywords.
const STRATEGY_KEYWORD_PATTERNS = [
  { re: /\b(collar|protective\s*put)\b/i, id: 'collar' },
  { re: /\b(atm[\s\/-]?na|at[\s-]?the[\s-]?money)\b/i, id: 'atmna' },
  { re: /\b(weekly)\b/i, id: 'weekly_income' },   // explizites "weekly" sticht DTE-Heuristik
  { re: /\b(csp|cash\s*secured\s*put|wheel|covered\s*call|cc)\b/i, id: 'options' },
];

// ── EXTRAKTIONS-REGEX (§4.1-Tabelle) ───────────────────────────────────────
const RE_STRIKE = /Strike\s*[:=]?\s*\$?(\d+(?:[.,]\d+)?)/i;
const RE_STRIKE_FALLBACK = /\$(\d+(?:[.,]\d+)?)/;
const RE_DTE = /(\d+)\s*DTE/i;
// Erkennt NUR die Reihenfolge "<Zahl> DTE" (Referenzfall §4.1: "45 DTE"),
// NICHT "DTE 45" — deckt sich mit der in Trading-Foren üblichen Schreibweise.
// Falls sich das als zu eng erweist: /(\d+)\s*DTE|DTE\s*[:=]?\s*(\d+)/i.
const RE_DELTA = /Delta\s*[:=~]?\s*(0?[.,]\d+)/i;
// Ticker-Kandidat: 1-5 Großbuchstaben, NICHT Teil der bekannten Strategie-
// Schlüsselwörter (CSP, DTE, CC, ATM, NA etc.) — s. Ausschlussliste unten.
const RE_TICKER_CANDIDATE = /\b[A-Z]{1,5}\b/g;
const TICKER_EXCLUSION_LIST = new Set([
  'CSP', 'DTE', 'CC', 'ATM', 'NA', 'IV', 'OI', 'OTM', 'ITM', 'YOLO',
]);

function _normalizeDecimal(str) {
  if (str == null) return null;
  return parseFloat(String(str).replace(',', '.'));
}

/** Ticker extrahieren: erster Großbuchstaben-Kandidat, der NICHT auf der
 * Ausschlussliste steht UND (falls scanUniverse übergeben) im Scan-
 * Universum vorkommt. Ohne scanUniverse-Treffer wird trotzdem der erste
 * plausible Kandidat zurückgegeben — das eigentliche "kein Treffer"-
 * Verhalten regelt parseTradeIdea() über den NICHT_IM_SCAN_UNIVERSUM-Zweig. */
function extractTicker(text, scanUniverse) {
  const candidates = (text.match(RE_TICKER_CANDIDATE) || [])
    .filter(t => !TICKER_EXCLUSION_LIST.has(t));
  if (candidates.length === 0) return null;
  if (scanUniverse) {
    const known = candidates.find(t => scanUniverse[t] != null);
    if (known) return known;
  }
  return candidates[0];
}

function extractStrike(text) {
  let m = text.match(RE_STRIKE);
  if (m) return _normalizeDecimal(m[1]);
  m = text.match(RE_STRIKE_FALLBACK);
  if (m) return _normalizeDecimal(m[1]);
  return null;
}

function extractDte(text) {
  const m = text.match(RE_DTE);
  return m ? parseInt(m[1], 10) : null;
}

function extractDelta(text) {
  const m = text.match(RE_DELTA);
  return m ? _normalizeDecimal(m[1]) : null;
}

/** Strategie-ID auflösen. dte wird NUR zur CSP/weekly-Disambiguierung
 * genutzt (§4.1-Tabelle: "CSP (DTE ≤ 10)" → weekly_income), NICHT für
 * atmna/collar/explizites weekly — die stechen unabhängig von DTE. */
function resolveStrategy(text, dte) {
  for (const { re, id } of STRATEGY_KEYWORD_PATTERNS) {
    if (re.test(text)) {
      if (id === 'options' && dte != null && dte <= 10) return 'weekly_income';
      return id;
    }
  }
  return null;
}

/**
 * Block B — Haupteinstiegspunkt. Folgt exakt dem Pseudocode aus
 * TRADE-DOKTOR-KONZEPT.md §4.1.
 * @param {string} text - Freitext (z.B. gepasteter Discord-Post)
 * @param {Object} scanUniverse - bySymbol-Map (Ticker -> Datensatz), s.
 *   axel-scanner/index.html _kvMasterData.bySymbol. Optional beim reinen
 *   Extrahieren, aber ERFORDERLICH für den NICHT_IM_SCAN_UNIVERSUM-Check —
 *   ohne scanUniverse wird dieser Check übersprungen (nicht: "immer ok").
 * @returns {Object} { ok, ticker, strategy, strike, dte, delta } bei Erfolg,
 *   { error: 'UNVOLLSTAENDIG', missing, partial } oder
 *   { error: 'NICHT_IM_SCAN_UNIVERSUM', ticker } bei Problemen.
 */
function parseTradeIdea(text, scanUniverse) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { error: 'UNVOLLSTAENDIG', missing: ['ticker', 'strike', 'dte'], partial: {} };
  }

  const dte = extractDte(text);
  const result = {
    ticker: extractTicker(text, scanUniverse),
    strategy: resolveStrategy(text, dte),
    strike: extractStrike(text),
    dte: dte,
    delta: extractDelta(text),   // bleibt optional, s. Konzeptdokument §4.1
  };

  if (result.ticker && scanUniverse && scanUniverse[result.ticker] == null) {
    return { error: 'NICHT_IM_SCAN_UNIVERSUM', ticker: result.ticker };
  }

  const missing = [];
  if (!result.ticker) missing.push('ticker');
  if (!result.strike) missing.push('strike');
  if (result.dte == null) missing.push('dte');
  // strategy bewusst NICHT in missing — Konzeptdokument nennt nur
  // ticker/strike/dte als Pflichtfelder (§4.1-Pseudocode); eine nicht
  // erkannte Strategie ist ein separates, weicheres Problem (Fallback
  // 'options' laut Schlüsselwort-Tabelle "sonst Standard-Fallback").
  if (!result.strategy) result.strategy = 'options';

  if (missing.length > 0) {
    return { error: 'UNVOLLSTAENDIG', missing, partial: result };
  }

  return Object.assign({ ok: true }, result);
}

// ── EXPORT (Browser-Global, klassisches <script>, analog zur seit dem
//    v456-Namespace-Fix etablierten Konvention — KEIN type="module") ──────
const KoTradeDoktorParser = {
  VERSION: '1.0.0',
  parseTradeIdea,
  extractTicker,
  extractStrike,
  extractDte,
  extractDelta,
  resolveStrategy,
};

if (typeof window !== 'undefined') {
  window.KoTradeDoktorParser = KoTradeDoktorParser;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KoTradeDoktorParser;
}
