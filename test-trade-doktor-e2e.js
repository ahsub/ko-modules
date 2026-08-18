global.KoTradeDoktorParser = require('/home/claude/uiq/ko-trade-doktor-parser.js');
global.KoStrategyRegistry = require('/home/claude/uiq/repos/ko-strategy-registry.js');
global.KoTradeDoktorEvaluator = require('/home/claude/uiq/ko-trade-doktor-evaluator.js');
global.KoMarketState = require('/tmp/ko-market-state-testable.js');
const { runTradeDoktorAnalysis } = require('/home/claude/uiq/ko-trade-doktor-context.js');

let pass = 0, fail = 0;
function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log('OK   ', label); pass++; }
  else { console.log('FAIL ', label, '\n  erwartet:', e, '\n  erhalten:', a); fail++; }
}
function assertField(obj, path, expected, label) {
  const val = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  assertEqual(val, expected, label);
}

const scanUniverse = {
  NVDA: { sym: 'NVDA', price: 178.50, sector: 'Tech' },
  TSLA: { sym: 'TSLA', price: 245.00, sector: 'Auto' },
};

// ── Fall 1: Referenzfall, BULL_QUIET, Delta 0.20 -> genau im Zielbereich [0.15,0.30] ──
const r1 = runTradeDoktorAnalysis('NVDA CSP 45 DTE Strike 160 Delta 0,20', scanUniverse, 'BULL_QUIET');
assertField(r1, 'schweregrad', 'IM_ZIELBEREICH', 'Fall 1: NVDA CSP 45DTE Delta0.20 BULL_QUIET -> IM_ZIELBEREICH');
assertField(r1, 'regimeGateStatus.color', 'green', 'Fall 1: Gate-Farbe green');
assertField(r1, 'deltaAbweichung', null, 'Fall 1: keine Delta-Abweichung');
assertField(r1, 'tickerRecord.price', 178.50, 'Fall 1: tickerRecord aus Scan-Universum mit angereichert');

// ── Fall 2: Delta zu hoch (0.45 > 0.30) -> PARAMETER_ABWEICHUNG ──
const r2 = runTradeDoktorAnalysis('NVDA CSP 45 DTE Strike 160 Delta 0,45', scanUniverse, 'BULL_QUIET');
assertField(r2, 'schweregrad', 'PARAMETER_ABWEICHUNG', 'Fall 2: Delta 0.45 -> PARAMETER_ABWEICHUNG');
assertField(r2, 'deltaAbweichung.richtung', 'ueber', 'Fall 2: Delta-Abweichung Richtung ueber');

// ── Fall 3: gleicher Trade, aber STRESS_UNSTABLE -> csp_wheel ist dort 'amber'
//    (aktiv, aber gedrosselt), NICHT rot -> immer noch kein GATE_VERSTOSS,
//    aber Delta 0.45 liegt weit ausserhalb des dortigen Kontexts (Registry-
//    Range bleibt [0.15,0.30] global, Gate ist nur Kontext-Info) ──
const r3 = runTradeDoktorAnalysis('NVDA CSP 45 DTE Strike 160 Delta 0,45', scanUniverse, 'STRESS_UNSTABLE');
assertField(r3, 'regimeGateStatus.color', 'amber', 'Fall 3: STRESS_UNSTABLE csp_wheel -> amber (nicht rot)');
assertField(r3, 'schweregrad', 'PARAMETER_ABWEICHUNG', 'Fall 3: trotzdem PARAMETER_ABWEICHUNG (Delta), kein GATE_VERSTOSS');

// ── Fall 4: ATM/NA in STRESS_UNSTABLE -> dort komplett gesperrt (rot) -> GATE_VERSTOSS ──
const r4 = runTradeDoktorAnalysis('NVDA ATM/NA 30 DTE Strike 178', scanUniverse, 'STRESS_UNSTABLE');
assertField(r4, 'schweregrad', 'GATE_VERSTOSS', 'Fall 4: ATM/NA in STRESS_UNSTABLE -> GATE_VERSTOSS');
assertField(r4, 'regimeGateStatus.color', 'red', 'Fall 4: Gate-Farbe red');

// ── Fall 5: Collar -> REGELWERK_FEHLT (rules:null in Registry, bewusst) ──
const r5 = runTradeDoktorAnalysis('TSLA Collar 45 DTE Strike 200/280', scanUniverse, 'BULL_FRAGILE');
assertField(r5, 'schweregrad', 'REGELWERK_FEHLT', 'Fall 5: Collar -> REGELWERK_FEHLT');

// ── Fall 6: weekly_income (DTE<=10) -> jetzt MIT Regelwerk (18.08.2026
//    ergänzt) -> IM_ZIELBEREICH (Delta 0.25 und DTE 5 beide im Rahmen) ──
const r6 = runTradeDoktorAnalysis('TSLA CSP 5 DTE Strike 230 Delta 0,25', scanUniverse, 'BULL_QUIET');
assertField(r6, 'strategy', 'weekly_income', 'Fall 6: DTE=5 -> als weekly_income erkannt');
assertField(r6, 'schweregrad', 'IM_ZIELBEREICH', 'Fall 6: weekly_income mit Delta 0.25/DTE 5 -> IM_ZIELBEREICH (Registry jetzt ergänzt)');
assertField(r6, 'rulesUsed.riskPerTrade.maxPct', 5, 'Fall 6: riskPerTrade-Feld vorhanden (5%)');
assertField(r6, 'rulesUsed.longPutInsurance.dteTarget', 120, 'Fall 6: longPutInsurance-Kontextfeld vorhanden (120 DTE)');

// ── Fall 6b: explizites "weekly"-Keyword mit DTE=15 (ausserhalb [1,10]) ──
const r6b = runTradeDoktorAnalysis('TSLA weekly CSP 15 DTE Strike 230 Delta 0,25', scanUniverse, 'BULL_QUIET');
assertField(r6b, 'strategy', 'weekly_income', 'Fall 6b: explizites "weekly" -> weekly_income trotz DTE=15');
assertField(r6b, 'schweregrad', 'PARAMETER_ABWEICHUNG', 'Fall 6b: DTE=15 liegt ausserhalb [1,10] -> PARAMETER_ABWEICHUNG');
assertField(r6b, 'dteAbweichung.richtung', 'ueber', 'Fall 6b: DTE-Abweichung Richtung ueber');

// ── Fall 7: unvollständiger Trade -> Fehler propagiert durch die ganze Pipeline ──
const r7 = runTradeDoktorAnalysis('NVDA CSP 45 DTE Delta 0,20', scanUniverse, 'BULL_QUIET');
assertField(r7, 'error', 'UNVOLLSTAENDIG', 'Fall 7: fehlender Strike -> Fehler propagiert aus Block B');

// ── Fall 8: Ticker nicht im Scan-Universum -> Fehler propagiert ──
const r8 = runTradeDoktorAnalysis('XYZQ CSP 45 DTE Strike 160 Delta 0,20', scanUniverse, 'BULL_QUIET');
assertField(r8, 'error', 'NICHT_IM_SCAN_UNIVERSUM', 'Fall 8: unbekannter Ticker -> Fehler propagiert');

// ── Fall 9: atmna hat deltaRange:null in der Registry -> darf NIE Delta-Abweichung erzeugen ──
const r9 = runTradeDoktorAnalysis('NVDA ATM/NA 30 DTE Strike 178 Delta 0,99', scanUniverse, 'BULL_QUIET');
assertField(r9, 'deltaAbweichung', null, 'Fall 9: atmna deltaRange:null -> nie Delta-Abweichung trotz Delta 0.99');

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail > 0 ? 1 : 0);
