global.KoTradeDoktorParser = require('/home/claude/uiq/ko-trade-doktor-parser.js');
global.KoStrategyRegistry = require('/home/claude/uiq/repos/ko-strategy-registry.js');
global.KoTradeDoktorEvaluator = require('/home/claude/uiq/ko-trade-doktor-evaluator.js');
global.KoMarketState = require('/tmp/ko-market-state-testable.js');
const { runTradeDoktorAnalysis } = require('/home/claude/uiq/ko-trade-doktor-context.js');
const { buildTradeDoktorPrompt } = require('/home/claude/uiq/ko-trade-doktor-prompt.js');

let pass = 0, fail = 0;
function check(cond, label) {
  if (cond) { console.log('OK   ', label); pass++; }
  else { console.log('FAIL ', label); fail++; }
}

const scanUniverse = { NVDA: { sym: 'NVDA', price: 178.50, sector: 'Tech' } };

function run(text, regime) {
  const evaluation = runTradeDoktorAnalysis(text, scanUniverse, regime);
  if (evaluation.error) {
    console.log(`  [Fehlerfall, Block E wird NICHT aufgerufen]: ${evaluation.error}`);
    return { evaluation, prompt: null };
  }
  const prompt = buildTradeDoktorPrompt(evaluation);
  return { evaluation, prompt };
}

console.log('\n=== Fall IM_ZIELBEREICH ===');
{
  const { evaluation, prompt } = run('NVDA CSP 45 DTE Strike 160 Delta 0,20', 'BULL_QUIET');
  check(evaluation.schweregrad === 'IM_ZIELBEREICH', 'schweregrad IM_ZIELBEREICH');
  check(prompt.includes('IM_ZIELBEREICH'), 'Prompt enthaelt Schweregrad-Label');
  check(prompt.includes('"delta": 0.2'), 'Prompt enthaelt Delta-Wert aus Analyse-Ergebnis');
  check(prompt.includes(evaluation.positionshinweis), 'Prompt enthaelt Positionshinweis');
  check(!prompt.includes('§1 WpHG'), 'Prompt enthaelt KEIN BaFin-Hedging (kein §1 WpHG)');
  check(prompt.length < 6000, 'Prompt-Laenge plausibel (<6000 Zeichen)');
}

console.log('\n=== Fall PARAMETER_ABWEICHUNG ===');
{
  const { evaluation, prompt } = run('NVDA CSP 45 DTE Strike 160 Delta 0,45', 'BULL_QUIET');
  check(evaluation.schweregrad === 'PARAMETER_ABWEICHUNG', 'schweregrad PARAMETER_ABWEICHUNG');
  check(prompt.includes('mach\'s etwas anders'), 'Framing-Text fuer PARAMETER_ABWEICHUNG enthalten');
  check(prompt.includes('WAS AXEL TUN KÖNNTE'), 'Aufgabe 3 (Alternativvorschlag) im Prompt');
}

console.log('\n=== Fall GATE_VERSTOSS ===');
{
  const { evaluation, prompt } = run('NVDA ATM/NA 30 DTE Strike 178', 'STRESS_UNSTABLE');
  check(evaluation.schweregrad === 'GATE_VERSTOSS', 'schweregrad GATE_VERSTOSS');
  check(prompt.includes('grundsätzlich'), 'Framing-Text fuer GATE_VERSTOSS enthalten (grundsätzlich)');
  check(prompt.includes('"color": "red"'), 'Prompt enthaelt rote Gate-Farbe aus Analyse-Ergebnis');
}

console.log('\n=== Fall REGELWERK_FEHLT ===');
{
  const { evaluation, prompt } = run('NVDA Collar 45 DTE Strike 160/200', 'BULL_FRAGILE');
  check(evaluation.schweregrad === 'REGELWERK_FEHLT', 'schweregrad REGELWERK_FEHLT');
  check(prompt.includes('KEINE UIQ-Bewertung möglich'), 'Framing-Text fuer REGELWERK_FEHLT enthalten');
}

console.log('\n=== Fehlerfall: Block E darf NICHT mit Fehler-Objekt aufgerufen werden ===');
{
  const evaluation = runTradeDoktorAnalysis('NVDA CSP 45 DTE', scanUniverse, 'BULL_QUIET'); // fehlender Strike
  check(evaluation.error === 'UNVOLLSTAENDIG', 'Block B/C liefert UNVOLLSTAENDIG wie erwartet');
  let threw = false;
  try { buildTradeDoktorPrompt(evaluation); } catch (e) { threw = true; }
  check(threw, 'buildTradeDoktorPrompt() wirft Fehler bei Fehler-Objekt statt stillschweigend falschen Prompt zu bauen');
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail > 0 ? 1 : 0);
