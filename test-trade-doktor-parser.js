const { parseTradeIdea } = require('./ko-trade-doktor-parser.js');

const scanUniverse = { NVDA: {}, AAPL: {}, TSLA: {}, DDOG: {} };

let pass = 0, fail = 0;
function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log('OK   ', label);
    pass++;
  } else {
    console.log('FAIL ', label);
    console.log('  erwartet:', e);
    console.log('  erhalten:', a);
    fail++;
  }
}

// ── Referenzfall aus TRADE-DOKTOR-KONZEPT.md §4.1 ──────────────────────────
assertEqual(
  parseTradeIdea('NVDA CSP 45 DTE Strike 160 Delta ~0,20', scanUniverse),
  { ok: true, ticker: 'NVDA', strategy: 'options', strike: 160, dte: 45, delta: 0.2 },
  'Referenzfall: NVDA CSP 45 DTE Strike 160 Delta ~0,20'
);

// ── Dezimaltrenner: Punkt statt Komma ──────────────────────────────────────
assertEqual(
  parseTradeIdea('AAPL CSP 30 DTE Strike 180 Delta 0.25', scanUniverse).delta,
  0.25,
  'Dezimaltrenner Punkt (Delta 0.25)'
);

// ── Weekly-Disambiguierung über DTE ≤ 10 ───────────────────────────────────
assertEqual(
  parseTradeIdea('TSLA CSP 7 DTE Strike 250 Delta 0.30', scanUniverse).strategy,
  'weekly_income',
  'CSP mit DTE=7 -> weekly_income (Disambiguierung)'
);
assertEqual(
  parseTradeIdea('TSLA CSP 21 DTE Strike 250 Delta 0.30', scanUniverse).strategy,
  'options',
  'CSP mit DTE=21 -> options (kein weekly)'
);

// ── Explizites "weekly"-Schlüsselwort sticht unabhängig von DTE ───────────
assertEqual(
  parseTradeIdea('TSLA weekly CSP 21 DTE Strike 250', scanUniverse).strategy,
  'weekly_income',
  'Explizites "weekly" -> weekly_income auch bei DTE>10'
);

// ── ATM/NA unabhängig von DTE ───────────────────────────────────────────────
assertEqual(
  parseTradeIdea('NVDA ATM/NA 30 DTE Strike 170', scanUniverse).strategy,
  'atmna',
  'ATM/NA-Erwähnung -> atmna'
);

// ── Collar ──────────────────────────────────────────────────────────────────
assertEqual(
  parseTradeIdea('AAPL Collar 45 DTE Strike 180/200', scanUniverse).strategy,
  'collar',
  'Collar-Erwähnung -> collar'
);

// ── Ticker nicht im Scan-Universum ─────────────────────────────────────────
assertEqual(
  parseTradeIdea('XYZQ CSP 30 DTE Strike 50 Delta 0.20', scanUniverse),
  { error: 'NICHT_IM_SCAN_UNIVERSUM', ticker: 'XYZQ' },
  'Ticker nicht im Scan-Universum'
);

// ── Fehlender Strike -> UNVOLLSTAENDIG mit Rückfrage-Info ─────────────────
const incomplete = parseTradeIdea('NVDA CSP 45 DTE Delta 0.20', scanUniverse);
assertEqual(incomplete.error, 'UNVOLLSTAENDIG', 'Fehlender Strike -> UNVOLLSTAENDIG (error)');
assertEqual(incomplete.missing, ['strike'], 'Fehlender Strike -> missing=[strike]');

// ── Fehlende DTE ────────────────────────────────────────────────────────────
const noDte = parseTradeIdea('NVDA CSP Strike 160 Delta 0.20', scanUniverse);
assertEqual(noDte.missing, ['dte'], 'Fehlende DTE -> missing=[dte]');

// ── Delta fehlt (bleibt laut Konzeptdokument OPTIONAL, kein Fehler) ────────
const noDelta = parseTradeIdea('NVDA CSP 45 DTE Strike 160', scanUniverse);
assertEqual(noDelta.ok, true, 'Fehlendes Delta -> trotzdem ok:true (optional)');
assertEqual(noDelta.delta, null, 'Fehlendes Delta -> delta:null');

// ── Ticker-Kandidat, der ein Strategie-Schlüsselwort ist, wird ausgeschlossen
assertEqual(
  parseTradeIdea('CSP 45 DTE NVDA Strike 160 Delta 0.20', scanUniverse).ticker,
  'NVDA',
  'CSP/DTE als Grossbuchstaben-Token werden NICHT als Ticker erkannt'
);

// ── Strike mit $ ohne "Strike"-Wort (Fallback-Regex) ───────────────────────
assertEqual(
  parseTradeIdea('NVDA CSP 45 DTE $160 Delta 0.20', scanUniverse).strike,
  160,
  'Strike-Fallback ($-Präfix ohne "Strike"-Wort)'
);

// ── Leerer/ungültiger Input ─────────────────────────────────────────────────
assertEqual(
  parseTradeIdea('', scanUniverse).error,
  'UNVOLLSTAENDIG',
  'Leerer String -> UNVOLLSTAENDIG'
);
assertEqual(
  parseTradeIdea(null, scanUniverse).error,
  'UNVOLLSTAENDIG',
  'null-Input -> UNVOLLSTAENDIG (kein Crash)'
);

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail > 0 ? 1 : 0);
