/**
 * ko-strategies.js — UnderlyingIQ Strategy Rule Engine
 * ══════════════════════════════════════════════════════════════════
 * Version: 2.1.0
 *
 * NEU in v2.1.0 (01.07.2026) — Short-Strategien Phase 1 (Gemini-Blueprint):
 *   Neue Strategie 'fading_short': KO-Short auf überhitzte Einzeltitel via
 *   Trade Republic. Vollständiges Regelwerk mit umgekehrter Output-Struktur
 *   (Stop = +X% über Entry, CRV-Minimum 2.5:1, Squeeze-Exit-Trigger). Hartes
 *   Ausschluss-Protokoll: Earnings <28d, squeezeRisk ≥70, ATH-Nähe, <$15.
 * Repository: ahsub/ko-modules
 *
 * NEU in v2.0.0 (30.06.2026) — Architektur-Umbau (Axels 5 Anforderungen):
 *   1. ERWEITERBARKEIT: Neue Strategie (z.B. Iron Condor) = ein neues
 *      Regelwerk-Objekt, KEIN Freitext-Prompt mehr von Hand schreiben.
 *   2. INDIVIDUELLES REGELWERK: exclusions/checklist/task sind strukturierte
 *      Daten — maschinell auswertbar (z.B. clientseitiges Vorfiltern vor
 *      dem KI-Call), nicht nur Prompt-Prosa.
 *   3. EINHEITLICHE NO-HALLUZINATION-PROMPTS: EIN gemeinsamer buildPrompt()-
 *      Builder rendert für JEDE Strategie denselben Aufbau (Anti-Halluzination-
 *      Header → Ausschlusskriterien → Checkliste → Aufgabe) — kein Copy-Paste-
 *      Risiko mehr zwischen Strategien.
 *   4. ES6-KONFORM: const/let, Arrow Functions, Template-Literal-Resolver,
 *      echtes ES-Module-Export (mit window-Fallback fuer bestehende <script>-
 *      Tags, kein Breaking Change fuer index.html noetig).
 *   5. ZUGRIFF VON WEITEREN MODULEN: Strategies.list()/get()/buildPrompt()
 *      ist eine generische API — DeepDive nutzt jetzt DIESELBE Quelle
 *      (Strategies[id].focus) statt einer separaten DD_STRATEGIES-Kopie in
 *      index.html. Künftige Module (z.B. GuidelineIQ-artige Erweiterungen)
 *      können dieselbe Regelwerk-Struktur wiederverwenden.
 *
 * Rückwärtskompatibilität: window.KoPrompts bleibt als Alias erhalten
 * (gleiche .STRATEGIES/.get()/.getConfig()/.ids()/.VERSION-Oberfläche),
 * damit kein bestehender Call-Site in index.html angepasst werden musste —
 * nur DD_STRATEGIES wurde entfernt und liest jetzt von hier.
 *
 * Verwendung (Browser via CDN, unveraendert):
 *   <script src="https://cdn.jsdelivr.net/gh/ahsub/ko-modules@{HASH}/ko-strategies.js"></script>
 *   const prompt = KoPrompts.get('ko', ctx);
 *
 * Verwendung (ES-Module, NEU):
 *   import { Strategies, buildPrompt } from './ko-strategies.js';
 */

// ── GLOBALE ANTI-HALLUZINATIONS-REGEL ─────────────────────────────────────
// Wird in JEDEN Strategie-Prompt eingebaut (Position pro Strategie steuerbar
// via strat.hallucinationPosition — Standard: Anfang; EIC-Modus: Anfang+Ende).
const KI_ANTI_HALLUZINATION = `
== BULL-MARKET FRÜHINDIKATOR — PFLICHTREGELN ==
Wenn Bull-Market Frühindikator Score in MARKTKONTEXT vorhanden:
  • Score 0-100: Confluence mehrerer unkorrelierter Frühindikatoren (KEINE Erfindung)
  • ≥80: STARKES BULL-SIGNAL → explizit als mögliche Trendwende erwähnen
  • 65-79: Bullische Confluence → selektiv long mit engem Stop empfehlen
  • 45-64: Gemischt → abwarten, kein klarer Boden
  • <45: Bärisch → defensiv bleiben
  • ★ Signale (Breadth Thrust, HYG-Divergenz, Regime-Wechsel): IMMER explizit nennen
  • Wenn kein Bull-Score in den Daten: ABSOLUTES SCHWEIGEN
== ENDE BULL-REGELN ==

== MARKOV 2.0 & IV-PERCENTILE — PFLICHTREGELN ==
Wenn Markov2:REG(X%) σ±Y Filter:MODE in den Ticker-Daten steht:
  • IMMER explizit in der Analyse erwähnen — das ist ein Premium-Feature
  • Stickiness X%: Persistenz des Regimes (>65%=sehr stark, 50-65%=mittel, <50%=instabil)
  • Signal σ: statistisch korrektes Markov-Signal (Stride-sampled). >+0.2=bullisch, <-0.2=bärisch
  • Filter:LONG_OK + HVP>50% = ★CSP-SETUP → explizit als Kaufgelegenheit nennen
  • Filter:FLAT = kein klares Signal → keine neuen Direktionaltrades empfehlen
  • ⚡LabelWarn = Regime-Verifikation unsicher → Vorsicht erwähnen
Wenn kein Markov2-Feld: ABSOLUTES SCHWEIGEN. Niemals erfinden.
== ENDE MARKOV-REGELN ==

⛔ STRENGE DATENDISZIPLIN — KEINE AUSNAHMEN:

Du erhältst unten EXAKTE Scanner-Daten. Diese Daten sind die EINZIGE Wahrheit.

VERBOTEN:
• Kurse, Strikes, Prämien oder Prozentzahlen erfinden oder schätzen
• Den EMA200-Kurs (Feld "EMA200-Kurs:$XX") als aktuellen Handelskurs verwenden
• Historische Preise aus deinem Training verwenden
• Aussagen wie "typischerweise" oder "ungefähr" bei Kursen

PFLICHTREGELN:
• Aktueller Kurs = NUR der Wert nach "Kurs:$" im Datensatz
• EMA200-Kurs = NUR nach "EMA200-Kurs:$" — NICHT der Handelskurs
• Fehlende Felder: "Kurs nicht verfügbar — in IBKR prüfen" schreiben
• Prämien-Schätzungen immer als "(Schätzung — in IBKR prüfen)" kennzeichnen
HVP = Historical Vol Percentile — kein echter IV-Rank. Wenn kein HVP: NIEMALS IV erfinden.

SELBSTKONTROLLE: Kurs aus "Kurs:$XX"? EMA200 nicht verwechselt? Keine Trainingsdaten?
VOLLSTÄNDIGKEIT: Jede Analyse MUSS alle Punkte vollständig abschliessen.

`;

const DEFAULT_OPTS_CFG = { minPrice: 15, maxPrice: 80, minHvp: 40, goodHvp: 55, idealHvp: 65, erDays: 30, dte: 30 };

// ── TEMPLATE-RESOLVER (ES6) ───────────────────────────────────────────────
// Ersetzt ${pfad.zu.wert} in Regelwerk-Strings gegen Werte aus dem optsCfg-
// Kontext. Erlaubt einfache Ausdrücke wie ${idealHvp-1} (nur +/- mit Zahl).
const resolveTemplate = (str, cfg) => {
  if (typeof str !== 'string') return str;
  return str.replace(/\$\{([a-zA-Z0-9_]+)\s*([+-])?\s*(\d+)?\}/g, (_, key, op, num) => {
    let val = cfg[key];
    if (val == null) return `\${${key}}`;
    if (op && num) val = op === '+' ? val + Number(num) : val - Number(num);
    return val;
  });
};

const renderExclusions = (exclusions, cfg, header) => {
  const lines = exclusions.map(e => `   • ${resolveTemplate(e.text, cfg)} → ${e.verdict || 'AUSSCHLUSS'}`);
  return `${header || '🚫 HARTES AUSSCHLUSS-KRITERIUM:'}\n${lines.join('\n')}`;
};

const renderBulletSection = (title, items, cfg) =>
  `## ${title}:\n${items.map(i => `- ${resolveTemplate(i, cfg)}`).join('\n')}`;

// ── GEMEINSAMER PROMPT-BUILDER (Punkt 3: einheitliche No-Hallu-Prompts) ───
const buildPrompt = (strat, ctx = {}) => {
  const cfg = { ...DEFAULT_OPTS_CFG, ...(ctx.optsCfg || {}) };
  const parts = [];

  if (strat.hallucinationPosition !== 'end') parts.push(KI_ANTI_HALLUZINATION.trim());
  if (strat.warningPrefix) parts.push(resolveTemplate(strat.warningPrefix, cfg));
  if (strat.intro) parts.push(resolveTemplate(strat.intro, cfg));
  if (strat.disclaimer) parts.push(resolveTemplate(strat.disclaimer, cfg));
  if (strat.exclusions?.length) parts.push(renderExclusions(strat.exclusions, cfg, strat.exclusionsHeader));
  if (strat.basics?.length) parts.push(renderBulletSection(strat.basicsTitle || 'STRATEGIE-GRUNDLAGEN', strat.basics, cfg));
  if (strat.preChecklist?.length) parts.push(renderBulletSection(strat.checklistTitle || 'AKTIEN-CHECKLISTE', strat.preChecklist, cfg));

  parts.push(ctx.marktkontext || '');
  parts.push(`AUFGABE${strat.taskSuffix ? ' — ' + strat.taskSuffix : ':'}`);
  if (strat.preTaskExclusions?.length) parts.push(renderExclusions(strat.preTaskExclusions, cfg, '⛔ AUSSCHLUSS VOR ANALYSE:'));

  strat.task.forEach((t, i) => {
    let line = `${i + 1}. ${t.title}: ${resolveTemplate(t.body, cfg)}`;
    if (t.subitems?.length) line += '\n' + t.subitems.map(s => `   ${resolveTemplate(s, cfg)}`).join('\n');
    parts.push(line);
  });

  if (strat.closingNote) parts.push(resolveTemplate(strat.closingNote, cfg));
  if (strat.hallucinationPosition === 'end') parts.push(KI_ANTI_HALLUZINATION.trim());
  if (strat.finalReminder) parts.push(strat.finalReminder);

  parts.push(
    `Antworte auf Deutsch, strukturiert 1-${strat.task.length}. Max. ${strat.maxWords || 400} Wörter.` +
    (strat.completeEachPoint ? ' Jeden Punkt vollständig abschließen.' : '')
  );

  return parts.filter(Boolean).join('\n\n');
};

// ── REGELWERKE (Punkt 1+2: erweiterbar, strukturiert) ─────────────────────
// Neue Strategie hinzufügen (z.B. 'iron_condor'): ein neues Objekt nach
// diesem Schema anlegen — KEIN Freitext-Prompt von Hand schreiben.
const Strategies = {

  ko: {
    label: '⚡ KO-Trading',
    hint: '⚡ KO-Trading: Hebel 3–8x · KO-Abstand · Positionsgröße max. €2.000',
    color: '#818cf8',
    category: 'leverage',
    intro: 'Du bist ein erfahrener Knock-out-Trading-Experte (Hebelprodukte auf Aktien, EUR-basiert).',
    focus: [
      '1. KO-Eignung: Trendstärke und Volatilität für ein Hebelprodukt geeignet?',
      '2. Hebel-Empfehlung: Welcher Hebel (3-8x) passt zu ATR und Risikoprofil?',
      '3. KO-Abstand: Sinnvoller Knock-out-Abstand in % basierend auf ATR?',
      '4. Positionsgröße (max. €2.000 gesamt) und Stop-Loss-Kriterium aus ATR.',
    ],
    task: [
      { title: 'MARKTUMFELD', body: 'Ist jetzt ein günstiger Zeitpunkt für neue KO-Long-Positionen? (2-3 Sätze)' },
      { title: 'TOP 3 KO-KANDIDATEN', body: '(HVP-Wert irrelevant für KO-Zertifikate — ignorieren). Welche 3 Titel wählst du? Für jeden: Begründung, Hebel (3-8x), KO-Abstand in %, Positionsgröße (Starter/Aufstockung, max. €2.000 gesamt), Stop-Loss-Kriterium.' },
      { title: 'WATCHLIST', body: 'Welche Titel haben Potenzial aber brauchen besseres Timing?' },
      { title: 'HAUPTRISIKEN', body: 'Was könnte die Long-These gefährden?' },
    ],
    maxWords: 400,
    completeEachPoint: true,
  },

  momentum: {
    label: '📈 Momentum',
    hint: '📈 Momentum: SEPA/Minervini Stage-2 · Direktinvestment ohne Hebel',
    color: 'var(--green)',
    category: 'equity',
    intro: 'Du bist ein erfahrener Momentum-Investor nach Minervini/SEPA-Methode.',
    focus: [
      '1. Trendstruktur: Ist der Titel in einer Stage-2-Aufwärtsbewegung (Minervini)?',
      '2. Momentum-Qualität: RSI, MACD und OBV im Einklang?',
      '3. Überhitzung: Besteht Rückschlagsrisiko durch Überdehnung?',
      '4. Setup-Qualität für Momentum-Einstieg bewerten.',
    ],
    task: [
      { title: 'MARKTPHASE', body: 'Ist jetzt ein günstiger Zeitpunkt für neue Momentum-Positionen? (2-3 Sätze)' },
      { title: 'TOP 3 MOMENTUM-KANDIDATEN', body: 'Welche 3 Titel zeigen das stärkste Stage-2-Setup? Für jeden: SEPA-Bewertung aus Scandaten, Buy-Point NUR aus "Kurs:$" und "52W-H:"-Feldern ableiten. Stop-Loss als % unter Kurs. HVP aus Scandaten: bei HVP>50% erhöhte Vola → engerer Stop empfohlen. Kein Kursziel erfinden.' },
      { title: 'WATCHLIST', body: 'Titel mit Potenzial aber noch nicht kaufbar.' },
      { title: 'RISIKEN', body: 'Sektoren oder Makro-Faktoren die Momentum gefährden.' },
    ],
    maxWords: 400,
    completeEachPoint: true,
  },

  options: {
    label: '🎯 Options-Wheel',
    hint: '🎯 Options-Wheel: CSP / Covered Call · CapTrader/IBKR · Theta-Strategie',
    color: 'var(--amber)',
    category: 'options',
    intro: 'Du bist ein erfahrener Options-Trader mit Fokus auf Wheel-Strategie (CSP + Covered Calls).\n\n⚠️ Diese Analyse dient ausschliesslich zu Informationszwecken gem. §1 WpHG.',
    exclusions: [
      { text: 'Kurs < $${minPrice} oder > $${maxPrice}' },
      { text: 'HVP < ${minHvp}% (Prämien zu niedrig)' },
      { text: 'ER innerhalb ${erDays} Tage' },
    ],
    exclusionsHeader: '🚫 SCHRITT 1 — HARTES AUSSCHLUSS-KRITERIUM (ZWINGEND VOR JEDER ANALYSE!):\nDiese Titel KOMPLETT IGNORIEREN. Weniger als 3 übrig: NUR verbleibende empfehlen, NICHT auffüllen!',
    preChecklist: [
      'HVP ≥ ${idealHvp}%: ⭐ Ideal für CSP-Verkauf · HVP ${goodHvp}–${idealHvp-1}%: ✅ Gut · HVP ${minHvp}–${goodHvp-1}%: ⚠️ Grenzwertig · Kein HVP: ❓ IV in IBKR prüfen — NICHT schätzen',
      'OI am Strike > 500 Kontrakte — in IBKR prüfen',
      'Bid-Ask < 10% der Prämie',
      'Kein Earnings-Event innerhalb der Laufzeit',
    ],
    checklistTitle: '✅ SCHRITT 2 — Verbleibende Kandidaten bewerten',
    focus: [
      '1. IV-Umfeld: Ist die Überhitzung (Score) hoch genug für attraktive Prämien?',
      '2. Trendrichtung: Bull/Bear/Sideways für Put- oder Call-Selling?',
      '3. Strike-Überlegung: EMA50/EMA200 als natürliche Support-Zonen für CSPs?',
      '4. Risiko: Earnings-Nähe, ATR-basiertes Stop-Niveau.',
    ],
    task: [
      { title: 'MARKTUMFELD', body: 'Günstig für neue CSPs? VIX-Niveau und Implikation für Prämien. (2-3 Sätze)' },
      {
        title: 'TOP 3 OPTIONS-KANDIDATEN', body: 'Für jeden Titel:',
        subitems: [
          'a) EMA200-Abstand: Strike-Empfehlung nahe/unter EMA200 in $',
          'b) Strike-Bereich in $ und % OTM vom aktuellen Kurs',
          'c) Laufzeit (bevorzugt ${dte}-45 DTE)',
          'd) Prämien-SCHÄTZUNG aus HVP — IMMER als Schätzung kennzeichnen',
          'e) PFLICHT-CHECKS: IV Rank in IBKR · OI > 500 · Bid-Ask < 10%',
        ],
      },
      { title: 'WATCHLIST', body: 'Titel die nach ER oder höherem IV interessant werden.' },
      { title: 'RISIKEN', body: 'IV-Crush, ER-Überraschungen, Titel unter 200d EMA.' },
    ],
    closingNote: '⚠️ ABSCHLUSS: Immer mit Pflicht-Checks in IBKR/CapTrader abschliessen.',
    maxWords: 500,
  },

  weekly_income: {
    label: '📅 Options Weekly',
    hint: '📅 Options Weekly: Diagonal Put-Spread · ATM-Short (7 DTE) + Long-Versicherung (120 DTE) · 4×/Monat · Definiertes Risiko',
    color: '#34d399',
    category: 'options',
    warningPrefix: '⛔ ABSOLUTES HALLUZINATIONS-VERBOT: Verwende AUSSCHLIESSLICH Daten aus dem Prompt.\nKurse, Strikes, Prämien NUR aus Scandaten — NIEMALS schätzen oder erfinden.\nFehlende Werte: explizit "N/A — in IBKR prüfen" schreiben.',
    intro: 'Du bist ein erfahrener Optionstrader spezialisiert auf wöchentliche Einkommensstrategien.',
    basics: [
      'SCHRITT 1 — VERSICHERUNG (einmalig): Long-Put kaufen, ~120 DTE, Strike ~4-5$ unter aktuellem Kurs, PAST nächsten Earnings',
      'SCHRITT 2 — WÖCHENTLICHES INCOME: ATM Short-Put verkaufen, 7 DTE (nächster Freitag)',
      'SCHRITT 3 — ROLLEN: Jeden Freitag neuen ATM-Put verkaufen — 4× pro Monat',
      'Frühausstieg: 50% Prämiengewinn → Position schliessen, Kapital freimachen',
      'Max. Verlust: Spread-Breite MINUS kassierte Prämie — BEGRENZT',
      'Kapitaleffizienz: Nur Spread-Breite als Margin (nicht voller Aktienwert)',
    ],
    basicsTitle: 'STRATEGIE-GRUNDLAGEN (Options Weekly — Diagonal Put-Spread)',
    preChecklist: [
      'Kurs $${minPrice}–$${maxPrice}',
      'Weekly Options verfügbar PFLICHT',
      'HVP ≥ ${minHvp}%',
      'Kein Earnings innerhalb 120 DTE der Long-Put-Laufzeit',
      'OI am ATM-Strike > 500, Bid-Ask < 10%',
    ],
    checklistTitle: 'AKTIEN-CHECKLISTE',
    taskSuffix: 'RANGFOLGELISTE WEEKLY-INCOME-KANDIDATEN',
    preTaskExclusions: [
      { text: 'Kurs < $${minPrice} oder > $${maxPrice}' },
      { text: 'HVP < ${minHvp}%' },
      { text: 'ER innerhalb ${erDays} Tage' },
    ],
    focus: [
      '1. Eignung für Diagonal-Spread: HVP-Niveau und Preisrahmen passend?',
      '2. Long-Put-Versicherung: sinnvoller Strike (~4-5$ unter Kurs), Ziel-DTE ~120.',
      '3. Short-Put-Income: ATM-Strike, wöchentlicher Rollzyklus (7 DTE).',
      '4. Risiko: Spread-Breite als maximaler Verlust, Earnings innerhalb 120 DTE.',
    ],
    task: [
      { title: 'MARKTUMFELD', body: 'Günstig für Weekly Income? VIX, Trend. (2 Sätze)' },
      {
        title: 'RANGFOLGELISTE TOP-KANDIDATEN (max. 5)', body: '',
        subitems: [
          'a) HVP-Wert + Eignung (⭐/✅/⚠️)',
          'b) Long-Put Setup: Strike ~4-5$ unter Kurs · Ziel-DTE ~120',
          'c) Short-Put Setup: ATM-Strike · DTE 7 (nächster Freitag)',
          'd) Spread-Breite in $ = max. Verlust pro Kontrakt',
          'e) PFLICHT-CHECKS: Weekly Options · OI > 500 · Bid-Ask < 10%',
        ],
      },
      { title: 'NICHT GEEIGNET', body: 'Ausgeschlossene Titel + Grund' },
      { title: 'SETUP-HINWEIS', body: 'Optimales Vorgehen diese Woche' },
    ],
    closingNote: '⛔ Alle Kurs/Prämienangaben sind SCHÄTZUNGEN — exakte Werte NUR in IBKR.',
    maxWords: 500,
  },

  swing: {
    label: '🔄 Swing-Trading',
    hint: '🔄 Swing-Trading: 5–20 Tage Haltedauer · Technische Muster',
    color: '#06b6d4',
    category: 'equity',
    intro: 'Du bist ein erfahrener Swing-Trader mit Fokus auf 5-20 Tage Haltedauer.',
    focus: [
      '1. Swing-Struktur: Higher Highs / Higher Lows erkennbar?',
      '2. Einstiegszeitpunkt: Nähe zu EMA50 als Pullback-Zone?',
      '3. MACD-Signal: Histogramm-Wende als Timing-Signal?',
      '4. Kursziel und Stop-Niveau basierend auf ATR und 52W-Range.',
    ],
    task: [
      { title: 'MARKTSTRUKTUR', body: 'Kurzfristige Trend-Richtung und Swing-Potenzial? (2-3 Sätze)' },
      { title: 'TOP 3 SWING-SETUPS', body: 'Für jeden Titel: technisches Muster (Pullback/Breakout/Reversal), Entry-Zone NUR aus "Kurs:$"-Feld ableiten, Stop-Loss in ATR-Einheiten, Haltedauer-Schätzung (5-20 Tage). Kursziel NICHT erfinden.' },
      { title: 'WATCHLIST', body: 'Setups die sich noch entwickeln müssen.' },
      { title: 'RISIKEN', body: 'Was könnte die Swing-Ideen invalidieren?' },
    ],
    maxWords: 400,
  },

  dividend: {
    label: '💰 Dividend Growth',
    hint: '💰 Dividend Growth: Steigende Ausschüttungen · Qualitäts-Momentum',
    color: 'var(--green)',
    category: 'equity',
    intro: 'Du bist ein erfahrener Dividend-Growth-Investor (Fokus: steigende Dividenden + technische Stärke).',
    disclaimer: '⚠️ WICHTIG: Dividendenrendite und Ausschüttungsquote sind NICHT im Scanner. Nur technische Stärke und Trend aus Scandaten verwenden. Dividendendaten NIEMALS erfinden.',
    focus: [
      '1. Technische Stärke als Proxy: EMA-Stack und Trendqualität (Dividendendaten NICHT im Scanner).',
      '2. Stabilität: RSI/Volatilität als Hinweis auf ruhigen Qualitätstitel.',
      '3. Einstiegstiming: aktuell in kaufbarer Konsolidierung oder überhitzt?',
      '4. Hinweis: Dividendenrendite/Ausschüttungsquote zwingend extern (Seeking Alpha/IBKR) verifizieren.',
    ],
    task: [
      { title: 'MARKTUMFELD', body: 'Günstig für Dividend-Growth-Titel? (2-3 Sätze)' },
      { title: 'TOP 3 KANDIDATEN', body: 'Technisch starke Titel mit stabilem Aufwärtstrend (Proxy für Dividendenstärke). Für jeden: EMA-Stack, Stage, RSI, Trend-Qualität. KEINE Dividendenrendite erfinden.' },
      { title: 'WATCHLIST', body: 'Titel mit gutem Fundament aber technisch noch nicht bereit.' },
      { title: 'HINWEIS', body: 'Dividendenzahlung und Yield IMMER in Seeking Alpha/IBKR verifizieren.' },
    ],
    maxWords: 400,
  },

  // 'value' bewusst NICHT im Scanner-Dropdown (index.html) — siehe Kommentar
  // dort. Bleibt hier im Regelwerk verfügbar (DeepDive "Alle Strategien").
  value: {
    label: '🔍 Value (Proxy)',
    hint: '🔍 Value: Fundamentaldaten (KGV, FCF, ROIC) noch nicht im Scanner — Koyfin-Integration geplant',
    color: 'var(--text3)',
    category: 'equity',
    intro: 'HINWEIS: Der Scanner enthält noch keine Fundamentaldaten (KGV, FCF, ROIC, Verschuldung). Value-Analyse auf Basis technischer Daten allein ist unvollständig.',
    focus: [
      '1. Einschränkung explizit benennen: keine Fundamentaldaten (KGV/FCF/ROIC) im Scanner.',
      '2. Technischer Proxy A — Überverkauft: RSI < 40 + Kurs nahe EMA200?',
      '3. Technischer Proxy B — Konsolidierung: RSI 40-55 + Unterstützung EMA200 ±5%?',
      '4. Nächste Schritte: Fundamentaldaten zwingend extern (Koyfin/IBKR) vor Entscheidung prüfen.',
    ],
    task: [
      { title: 'EINSCHRÄNKUNG', body: 'Erkläre dass echte Value-Analyse Fundamentaldaten erfordert die noch nicht verfügbar sind.' },
      {
        title: 'TECHNISCHER PROXY', body: '(zwei getrennte Suchkriterien — KEIN Widerspruch beabsichtigt):',
        subitems: [
          'a) ÜBERVERKAUFT: RSI < 40 + Kurs nahe EMA200 (möglicher Boden, Value-Einstieg)',
          'b) KONSOLIDIERUNG: RSI 40-55 + Kurs an langfristiger Unterstützung (EMA200 ± 5%)',
          '→ Titel müssen NUR EINES der beiden Kriterien erfüllen, nicht beide gleichzeitig.',
        ],
      },
      { title: 'NÄCHSTE SCHRITTE', body: 'KGV/FCF/Verschuldung für diese Titel in Koyfin/IBKR prüfen.' },
    ],
    maxWords: 300,
  },

  atmna: {
    label: '⚙️ Options ATM/NA',
    hint: '⚙️ Options-Wheel (EIC): ATM-CSP · 50-70% Frühausstieg · 3-Stufen-Roll · Andienungs-Vermeidung',
    color: '#a371f7',
    category: 'options',
    // Primacy/Recency optimiert: wichtigste Regel am Anfang UND am Ende —
    // daher hallucinationPosition='end' (Anti-Halluzination wird zusätzlich
    // ans Ende gehängt statt nur an den Anfang).
    hallucinationPosition: 'end',
    warningPrefix: '⛔⛔⛔ EIC-MODUS — ABSOLUTES HALLUZINATIONS-VERBOT ⛔⛔⛔\nVerwende AUSSCHLIESSLICH Daten aus dem Prompt. Fehlende Werte: "N/A — in IBKR prüfen".',
    intro: 'Du bist ein erfahrener Options-Trader der eine systematische ATM-CSP-Wheel-Strategie anwendet.',
    basics: [
      'CSP wird AT-THE-MONEY verkauft — maximaler Zeitwert',
      'Laufzeit: ~30 Tage, bevorzugt 3. Freitag des Monats',
      'Frühausstieg (Profit-Taking): 50% Gewinn bei >50% Restlaufzeit · 60% Gewinn (Standard) bei 30-50% Restlaufzeit · 70% Gewinn (Mindestziel) bei <30% Restlaufzeit',
      'Andienung vermeiden durch 3-Stufen-Rollen: Stufe 1 (niedrigerer Strike, 30-60 DTE, prämienneutral) → Stufe 2 (gleicher Strike, neue Laufzeit, prämienneutral) → Stufe 3 (niedrigerer Strike, doppelte Kontrakte)',
      'Maximale Roll-Laufzeit: 90 Tage',
    ],
    basicsTitle: 'STRATEGIE-GRUNDLAGEN (Options-Wheel/CSP-System)',
    preChecklist: [
      'Kurs $${minPrice}–$${maxPrice}',
      'HVP ≥ ${minHvp}% (sonst Prämien zu niedrig)',
      'Strike-Staffelung ≤2.5% des Kurses',
      'OI/Volumen mindestens dreistellig',
      'Weekly Options verfügbar',
    ],
    checklistTitle: 'AKTIEN-CHECKLISTE',
    task: [
      { title: 'MARKTUMFELD', body: 'ATM-CSPs sinnvoll? VIX-Level und Implikation. (2-3 Sätze)' },
      {
        title: 'TOP 3 EIC-KANDIDATEN', body: 'HARTES AUSSCHLUSS-KRITERIUM: HVP < ${minHvp}% / Kurs < $${minPrice} oder > $${maxPrice} / ER innerhalb ${erDays} Tage → IGNORIEREN. Für jeden verbleibenden Kandidaten:',
        subitems: [
          'a) HVP-Bewertung: ≥${idealHvp}% ⭐ · ${goodHvp}-${idealHvp-1}% ✅ · ${minHvp}-${goodHvp-1}% ⚠️',
          'b) ATM-Strike Empfehlung in $',
          'c) Laufzeit: nutze das im MARKTKONTEXT angegebene ZIEL-VERFALLSDATUM (nicht selbst berechnen)',
          'd) Prämien-SCHÄTZUNG aus HVP (⚠️ nur Näherung!) + 50/60/70%-Gewinn-Ziele in $',
          'e) Roll-Szenario Stufe 1: Strike ≈ Kurs − 2.5%',
          'f) PFLICHT-CHECKS: Strike-Staffelung · OI · Weekly Options · ER-Datum',
        ],
      },
      { title: 'NICHT GEEIGNET', body: 'Titel + Grund' },
      { title: 'ROLLSTRATEGIE-HINWEIS', body: '3 Roll-Stufen in Erinnerung rufen' },
    ],
    closingNote: '⚠️ Options-Wheel-Strategie vermeidet Andienung durch systematisches Rollen.',
    finalReminder: '⛔ ABSCHLUSS-ERINNERUNG: Nur Daten aus dem Prompt. Keine Kurse erfinden.',
    focus: [
      '1. ATM-CSP-Eignung: HVP-Niveau und Preisrahmen für systematisches Wheel passend?',
      '2. Strike & Laufzeit: ATM-Strike, ~30 Tage (3. Freitag) als Zielsetup?',
      '3. Frühausstieg-Potential: 50/60/70%-Gewinnziele je nach verbleibender Laufzeit realistisch?',
      '4. Andienungsvermeidung: 3-Stufen-Roll-Szenario (Strike ≈ Kurs −2,5%) bei Gegenwind sinnvoll?',
    ],
    maxWords: 550,
  },

  meanrev: {
    label: '↩️ Mean Reversion',
    hint: '↩️ Mean Reversion: Rückkehr zum Mittelwert · Überverkauft/Überhitzt · ATR-Abstand',
    color: 'var(--yellow)',
    category: 'equity',
    intro: 'Du bist ein quantitativer Analyst mit Fokus auf Mean-Reversion-Strategien.',
    focus: [
      '1. Überdehnung: Wie weit ist der Titel vom EMA200 entfernt (in ATR)?',
      '2. Erschöpfungssignale: RSI-Divergenz, OBV-Schwäche, BB-Position?',
      '3. Rückkehr-Potential: Ist ein Rücklauf zum EMA50/EMA200 realistisch?',
      '4. Risiko eines Short-Squeezes oder weiterer Trendfortsetzung.',
    ],
    task: [
      { title: 'MARKTSTRUKTUR', body: 'Gibt es aktuell extreme Über-/Unterverkauft-Situationen? (2-3 Sätze)' },
      { title: 'TOP 3 MEAN-REVERSION-KANDIDATEN', body: 'Titel mit extremem RSI (<30 oder >70) + BB-Abstand. Entry NUR aus "Kurs:$"-Feld, Ziel = EMA200 aus "EMA200-Kurs:$"-Feld. ATR-Abstand berechnen.' },
      { title: 'WATCHLIST', body: 'Titel die sich noch weiter ausdehnen könnten.' },
      { title: 'RISIKEN', body: 'Momentum-Falle, trendgetriebene Märkte wo MR gefährlich ist.' },
    ],
    maxWords: 400,
  },

  breakout: {
    label: '🚀 Breakout',
    hint: '🚀 Breakout: 52W-Hoch · Volumenbestätigung · OBV-Akkumulation',
    color: 'var(--green)',
    category: 'equity',
    intro: 'Du bist ein erfahrener Breakout-Trader (Fokus: Volumen-bestätigte Ausbrüche).',
    focus: [
      '1. Breakout-Setup: Abstand zum 52-Wochen-Hoch und Volumenbestätigung?',
      '2. OBV-Akkumulation: Zeigt OBV institutionelles Kaufinteresse vor dem Breakout?',
      '3. Markov-Regime: Bull-Regime als Voraussetzung für nachhaltigen Breakout?',
      '4. Flaschenhals-Niveau und potenzielles Kursziel nach Ausbruch.',
    ],
    task: [
      { title: 'MARKTSTRUKTUR', body: 'Unterstützt das aktuelle Marktumfeld Breakout-Trades? (2-3 Sätze)' },
      { title: 'TOP 3 BREAKOUT-KANDIDATEN', body: 'Titel nahe 52W-Hoch mit OBV-Bestätigung. Für jeden: Abstand zum 52W-Hoch aus Scandaten, Volumen-Signal, Entry nur aus "Kurs:$". Stop: unter Breakout-Level (aus 52W-H-Feld ableiten). Kein Kursziel erfinden.' },
      { title: 'WATCHLIST', body: 'Titel die sich noch am Breakout-Level konsolidieren.' },
      { title: 'RISIKEN', body: 'False Breakouts, dünnes Volumen, überdehntes Marktumfeld.' },
    ],
    maxWords: 400,
  },

  // ── NEUE SHORT-STRATEGIEN (Gemini-Blueprint 01.07.2026) ────────────────────
  // Phase 1: Fading Short via KO-Zertifikat (Trade Republic) — erste Priorität
  // lt. Gemini-Review, da perfekte Daten-Synergie mit vorhandenen Metriken und
  // klare Instrumenten-Trennung (KO-Short = max €2K, definiertes Risiko, kein
  // Squeeze-Exposure durch Knock-out als eingebautem Stop).

  fading_short: {
    label: '⚠️ Fading Short (KO)',
    hint: '⚠️ Fading Short: FOMO-Climax · KO-Zertifikat TR · Hebel 3-8x dynamisch · max €2.000',
    color: '#f97316',
    category: 'leverage_short',
    warningPrefix:
      '⛔ SHORT-STRATEGIE — ASYMMETRISCHES RISIKO-PROTOKOLL ⛔\n' +
      'Shorts sind NIEMALS Buy-and-Hold. Harte Regeln:\n' +
      '1. Earnings innerhalb 28 Tage → SOFORTIGER AUSSCHLUSS, keine Ausnahmen.\n' +
      '2. Squeeze-Risk-Score ≥70 → SOFORTIGER AUSSCHLUSS, keine Ausnahmen.\n' +
      '3. Preis nahe/über 52W-Hoch → SOFORTIGER AUSSCHLUSS.\n' +
      '4. Positionsgröße: max. €2.000 Gesamtrisiko inkl. Hebel-Verlust.\n' +
      '5. Sofort-Exit bei Volumen-Spike >200% des 20d-Durchschnitts an grünem Tag.\n' +
      'DATENDISZIPLIN: Nur Werte aus dem Prompt verwenden. Kurse NIEMALS erfinden.',
    intro:
      'Du bist ein erfahrener Short-Trader spezialisiert auf überhitzte Einzeltitel ' +
      '(FOMO-Climax-Fading) via KO-Zertifikate auf Trade Republic.\n' +
      'Portfolio-Kontext: KO-Short-Positionen max €2.000, max 2 offen gleichzeitig. ' +
      'Das IBKR-Hauptdepot (Wheel/CSP) ist inhärent long-lastig — diese Shorts bilden ' +
      'das taktische Gegengewicht bei Markt-Erschöpfung.',
    exclusions: [
      { text: 'Preis < $15 (Penny-Stock-Squeeze-Risiko)' },
      { text: 'Squeeze-Risk-Score ≥ 70 (aus squeezeRisk-Feld)' },
      { text: 'Preis ≥ 99% des 52W-Hochs (kein Short gegen ATH)' },
      { text: 'Earnings innerhalb 28 Tage' },
    ],
    exclusionsHeader: '🚫 HARTES SHORT-AUSSCHLUSS-PROTOKOLL (vor jeder Analyse zwingend prüfen):',
    basics: [
      'Instrument: KO-Short-Zertifikat auf Trade Republic (HSBC), Hebel dynamisch aus ATR',
      'Hebelformel: clamp(1.5 / (ATR/Preis), 3, 8) — je höher die Volatilität, desto niedriger der Hebel',
      'KO-Strike Abstand: mindestens 2.0 ATR über aktuellem Kurs (Puffer gegen technische Rebounds)',
      'Haltedauer: 10-25 Tage. Short-Impulse laufen historisch ~3× schneller ab als Long-Zyklen',
      'Frühausstieg (Verlust): sofortiger Exit bei Volumen-Spike >200% 20d-Durchschnitt an grünem Tag',
      'Frühausstieg (Gewinn): 50% Gewinnziel → Position halbieren, 70% → vollständig schließen',
      'CRV-Minimum: 2.5:1 (Ziel/Stop). Darunter kein Einstieg — Short-Trades haben kürzeres Gelegenheitsfenster',
    ],
    basicsTitle: 'SHORT-SETUP GRUNDLAGEN (Fading via KO-Zertifikat)',
    focus: [
      '1. Überhitzungsanalyse: overheat-Score, RSI, BB-Position und ATR-Distanz zur EMA200 bewerten.',
      '2. Squeeze-Risiko explizit einschätzen: squeezeRisk-Score + HVP-Niveau (≥85% = Warnung).',
      '3. KO-Strike-Empfehlung: EMA50 + 1.5 ATR als KO-Level, Hebel aus koShortLev-Feld.',
      '4. Exit-Szenario: Wo liegt das erste Fibo-Retracement-Level als Gewinnziel (Abwärts)?',
    ],
    task: [
      {
        title: 'MARKTLAGE-CHECK',
        body: 'Übergeordnetes Regime und Sektor-Kontext: Unterstützt das Umfeld Fading-Shorts, ' +
              'oder dominieren noch bullische Kräfte? (2-3 Sätze, nur aus Messwerten)',
      },
      {
        title: 'TOP-KANDIDATEN BEWERTUNG (max. 3)', body: 'Für jeden Kandidaten nach Ausschluss-Protokoll:',
        subitems: [
          'a) Überhitzungssignale: overheat-Score + RSI + BB-Position + ATR-Distanz EMA200',
          'b) Squeeze-Risiko: squeezeRisk-Wert + HVP explizit nennen',
          'c) KO-Setup: Empfohlener Hebel (koShortLev) · KO-Strike = EMA50 + 1.5 ATR in $',
          'd) Einstiegs-Trigger: welches Ereignis/Level bestätigt den Short-Einstieg?',
          'e) Stop-Loss: + X% über Entry (= Y ATR), konkreter Kurs in $',
          'f) Gewinnziel 1 (50% Position): erstes Fibo-Retracement-Level abwärts',
          'g) Gewinnziel 2 (Restposition): nächstes Fibo-Level oder EMA200',
          'h) CRV berechnen und explizit nennen (Pflicht: ≥ 2.5:1)',
          'i) Squeeze-Exit-Trigger: Volumen-Bedingung für Sofortausstieg',
        ],
      },
      {
        title: 'NICHT GEEIGNET',
        body: 'Ausgeschlossene Kandidaten + konkreter Grund (Squeeze-Risk/Earnings/ATH/Penny)',
      },
      {
        title: 'RISIKO-ASSESSMENT',
        body: 'Hauptrisiko für diese Short-Setups heute: Mögliche Squeeze-Auslöser, ' +
              'Makro-Events, Sektor-Rotation. Kein Weichspüler.',
      },
    ],
    closingNote:
      '⚠️ PFLICHT-ABSCHLUSS: Gesamtexposure Short-Seite prüfen. ' +
      'Max. 2 KO-Short-Positionen gleichzeitig offen. ' +
      'Stops sind Pflicht — kein ungesicherter Short.',
    maxWords: 500,
    completeEachPoint: true,
  },

  // Schablone für spätere Breakdown-Short-Variante (Bear-Put-Spread via IBKR)
  // Wird aktiviert wenn Phase 2 implementiert wird.
  // breakdown_short: { ... }

};

// ── PUBLIC API ─────────────────────────────────────────────────────────────
const ids = () => Object.keys(Strategies);

const get = (stratId, ctx) => {
  const strat = Strategies[stratId];
  if (!strat) {
    console.warn('[KoStrategies] Unbekannte Strategie:', stratId);
    return null;
  }
  return buildPrompt(strat, ctx || {});
};

const getConfig = (stratId) => {
  const strat = Strategies[stratId];
  return strat ? { hint: strat.hint, color: strat.color, label: strat.label, category: strat.category } : null;
};

// getFocus/getLabelList entfernt (15.07.2026, Dead-Code-Audit Backlog #19) —
// exportiert, aber nirgends aufgerufen, keine Zukunfts-Begruendung wie bei
// listByCategory dokumentiert.

// NEU: Strategien nach Kategorie filtern — für zukünftige Module, die nur
// eine Teilmenge anzeigen wollen (z.B. ein reines Options-Modul).
const listByCategory = (category) =>
  Object.entries(Strategies).filter(([, s]) => s.category === category).map(([id]) => id);

const KoStrategies = {
  VERSION: '2.1.0',
  Strategies,
  STRATEGIES: Strategies, // Alias für Rückwärtskompatibilität (alte Schreibweise)
  KI_ANTI_HALLUZINATION,
  buildPrompt: (stratId, ctx) => get(stratId, ctx), // gleiche Signatur wie altes .get()
  get,
  getConfig,
  listByCategory,
  ids,
};

// ── EXPORT (Browser-Global + echtes ES6-Module-Export) ─────────────────────
// Hinweis: Diese Datei muss als <script type="module" ...> geladen werden,
// da sie statische `export`-Syntax nutzt — als klassisches <script> ohne
// type="module" wirft das einen SyntaxError. Siehe TODO-Kommentar in
// index.html beim <script>-Tag dieser Datei.
if (typeof window !== 'undefined') {
  // Rückwärtskompatibler Alias — bestehender Code in index.html ruft
  // weiterhin `KoPrompts.xxx` auf, ohne dass dort etwas angepasst werden musste.
  window.KoPrompts = KoStrategies;
  window.KoStrategies = KoStrategies;
  window.KI_ANTI_HALLUZINATION = KI_ANTI_HALLUZINATION;
  window.KoPromptsLoaded = true;
}

// Echtes ES-Module-Export (Punkt 5: Zugriff von weiteren Modulen) — steht
// für `import { Strategies, buildPrompt } from './ko-strategies.js'` bereit.
export { Strategies, buildPrompt, get, getConfig, listByCategory, ids, KI_ANTI_HALLUZINATION };
export default KoStrategies;
