diff --git a/ko-prompts.js b/ko-prompts.js
index db4824c..b051429 100644
--- a/ko-prompts.js
+++ b/ko-prompts.js
@@ -1,6 +1,43 @@
 /**
  * ko-prompts.js — UnderlyingIQ Strategy Prompts Module
  * ══════════════════════════════════════════════════════════════════
+ *  Version: 2.6.0 (29.08.2026) — REGULATORISCHER FIX (Legal-Briefing-Audit,
+ *  Backlog №65 Fortsetzung/Abschluss): die verbliebene, gestern offen
+ *  gelassene Frage — verlangen die 14 Strategie-Templates selbst
+ *  (unabhaengig vom v2.5.7-System-Prompt-Fix) konkrete Handlungsparameter?
+ *  — wurde fuer alle 14 Templates mit Ja beantwortet (vorher nur fuer
+ *  cc/atmna/csp_wheel/weekly_income/collar/momentum gesichtet, jetzt
+ *  vollstaendig geprueft: auch ko/breakout/vcp/swing/meanrev/dividend/
+ *  value/fading_short verlangten TOP-3-Kandidaten mit Stop-Loss/Entry/
+ *  Strike/Delta/Praemien-Zahlen, "NICHT EMPFOHLEN"/"VALUE-TRAPS"-Direkt-
+ *  sprache). Fix: jede der 14 .prompt(ctx)-Funktionen prueft jetzt zuerst
+ *  ctx.isEic — nur bei explizit true (EIC-Modus) laeuft der bestehende,
+ *  unveraenderte Code-Zweig mit den konkreten Zahlen. Sonst (Default,
+ *  fail-safe wie v2.5.7) liefert einer von zwei neuen, geteilten Public-
+ *  Buildern (_publicEquityPrompt/_publicOptionsPrompt) eine deskriptive
+ *  "Statistische Kontext-Analyse" (§1 WpHG) ohne Kursziele/Stop-Loss/
+ *  Strikes/Deltas/Praemien — basierend auf dem je Strategie bereits
+ *  vorhandenen, neutral formulierten focus-Array als Bewertungskriterien
+ *  (keine zweite Kriterienliste noetig, Grundgesetz #1). Zusatzfund beim
+ *  Umsetzen: (a) index.html berechnete fuer 'value' bereits ctx.isEic/
+ *  ctx.mode, aber die value-Template las das nie — toter Code, jetzt
+ *  verdrahtet; (b) ctx.tickers (Kandidatenliste) wurde vom value-Aufrufer
+ *  uebergeben, aber im Template nie serialisiert — die KI bekam fuer
+ *  Value bislang praktisch keine Einzeltitel-Kennzahlen, nur den kurzen
+ *  Datums/Regime/VIX-Header. Beides in diesem Fix mitbehoben. WICHTIGE
+ *  EINSCHRAENKUNG (bewusst nicht geglaettet): ctx.isEic wird weiterhin
+ *  clientseitig in index.html aus _expertModeActive/_eicUnlocked gesetzt
+ *  (selbstgesetzter PIN, s. №60) — dieser Fix schliesst die Regelwerk-
+ *  Luecke (Public-Nutzer OHNE gesetzten EIC-PIN bekommen jetzt zuverlaessig
+ *  die deskriptive Variante), macht ctx.isEic aber nicht faelschungssicher.
+ *  Eine harte serverseitige Herkunftspruefung des User-Prompt-Inhalts
+ *  selbst (nicht nur des System-Prompts wie bei isOwner/№60) waere die
+ *  strukturell robustere, aber deutlich groessere Loesung (Prompt-Bau auf
+ *  den Server verlagern) — hier bewusst nicht umgesetzt, da ausserhalb
+ *  des heutigen Auftrags. Betroffene Aufrufstellen in index.html
+ *  (openKiBriefing/runOptionsKiBriefing) muessen ctx.isEic konsistent
+ *  setzen, sonst greift ueberall der neue Public-Default — s. axel-scanner
+ *  Changelog vom selben Tag.
  *  Version: 2.5.7 (28.08.2026) — SICHERHEITS-FIX (Legal-Briefing-Audit,
  *  Folgefund zu Backlog №60/61 in SUITE.md): _getSystemPrompt() und
  *  _getMorningPrompt() bauten bisher clientseitig einen kompletten
@@ -395,7 +432,74 @@ Das bedeutet konkret:
     }
     return effective;
   }
-  
+
+  // ── PUBLIC-MODUS PROMPT-BUILDER (28./29.08.2026, Legal-Briefing-Audit,
+  // Backlog №65 Fortsetzung) ─────────────────────────────────────────────
+  // Befund: alle 14 Strategie-Templates verlangten bisher UNABHAENGIG vom
+  // eic/isEic-Flag konkrete Handlungsparameter (Stop-Loss-Werte, Einstiegs-
+  // kurse, Strikes, Deltas, Praemien-Schaetzungen, "NICHT EMPFOHLEN"/"Value-
+  // Traps"-Direktsprache) — das lief am serverseitigen isOwner-Gate in
+  // ko-ai.js (Backlog №60) komplett vorbei, weil dieses nur den SYSTEM-Prompt
+  // waehlt, nicht den hier clientseitig gebauten USER-Prompt-Text filtert.
+  // Diese zwei Builder liefern die deskriptive Public-Variante (§1 WpHG,
+  // "Statistische Kontext-Analyse", keine Kursziele/Strikes/Stops) fuer alle
+  // Aktien- bzw. Options-Strategien. Sie nutzen bewusst das je Strategie
+  // bereits vorhandene, neutral formulierte focus-Array als Bewertungs-
+  // kriterien-Liste, statt eine zweite, separat zu pflegende Kriterienliste
+  // einzufuehren (Grundgesetz #1, Regelwerk-Einheit). Aufruf ausschliesslich
+  // wenn ctx.isEic nicht explizit true ist — Default ist IMMER die
+  // deskriptive Variante (fail-safe), analog zum _getSystemPrompt()-Fix
+  // v2.5.7. Die EIC-Variante bleibt in jeder Strategie unveraendert im
+  // bestehenden Code-Zweig erhalten.
+  function _publicKriterienBlock(focus) {
+    return (focus || []).map(function(f, i) { return (i + 1) + '. ' + f; }).join('\n');
+  }
+
+  function _publicEquityPrompt(ctx, o) {
+    return KI_ANTI_HALLUZINATION
+      + o.rolle + '\n\n'
+      + '⚠️ Diese Analyse ist eine statistische Kontext-Analyse gem. §1 WpHG — '
+      + 'keine Anlageberatung, keine Kauf-/Verkaufsempfehlung. Es werden '
+      + 'ausschliesslich vorliegende Messdaten anhand transparenter, unten '
+      + 'genannter Kriterien eingeordnet.\n\n'
+      + (ctx.marktkontext || '')
+      + '\n\nBEWERTUNGSKRITERIEN ' + o.stratName.toUpperCase() + ':\n'
+      + _publicKriterienBlock(o.focus) + '\n\n'
+      + 'AUFGABE:\n'
+      + '1. MARKTUMFELD: ' + o.marktumfeldFrage + ' (2-3 Sätze)\n'
+      + '2. MODELLBEWERTUNG — TOP 3: Welche 3 Titel erfüllen die obigen '
+      + 'Kriterien am deutlichsten? Für jeden: welche Kriterien in welchem '
+      + 'Grad erfüllt sind, rein datenbasiert beschrieben.\n'
+      + '3. BEOBACHTUNGSLISTE: Titel mit teilweiser Kriterien-Erfüllung.\n'
+      + '4. EINORDNUNGSRISIKEN: Was könnte diese Modellbewertung entwerten '
+      + '(Markt-, Sektor- oder Datenrisiko)?\n'
+      + '\nAntworte auf Deutsch, strukturiert 1-4. Max. ' + (o.maxWords || 350) + ' Wörter. '
+      + 'KEINE Kursziele, Stop-Loss-Werte, Strike-Preise, Einstiegspunkte oder '
+      + 'Positionsgrößen nennen — nur den Erfüllungsgrad der Kriterien beschreiben.';
+  }
+
+  function _publicOptionsPrompt(ctx, o) {
+    return KI_ANTI_HALLUZINATION
+      + '⚠️ Diese Analyse ist eine statistische Kontext-Analyse gem. §1 WpHG — '
+      + 'keine Anlage- oder Handlungsempfehlung.\n\n'
+      + o.rolle + '\n\n'
+      + (ctx.marktkontext || '')
+      + '\n\nBEWERTUNGSKRITERIEN ' + o.stratName.toUpperCase() + ':\n'
+      + _publicKriterienBlock(o.focus) + '\n\n'
+      + 'AUFGABE:\n'
+      + '1. MARKTUMFELD: ' + o.marktumfeldFrage + ' (2-3 Sätze)\n'
+      + '2. SETUP-FIT — TOP 3: Welche 3 Titel passen strukturell am besten zu '
+      + o.stratName + '? Für jeden: positive Faktoren, Risikofaktoren, grober '
+      + 'qualitativer Parameterbereich (z.B. "Laufzeit eher kurz-/mittelfristig", '
+      + '"Prämienniveau ausreichend/grenzwertig") — OHNE konkreten Strike, '
+      + 'Delta-Wert, DTE-Zahl, Prämien-Schätzung oder Verfallsdatum zu nennen.\n'
+      + '3. NICHT GEEIGNET: Titel + Grund.\n'
+      + '4. RISIKEN: IV-Crush, Earnings-Überraschung, Liquiditätsrisiko, Andienung.\n'
+      + '\nAntworte auf Deutsch, strukturiert 1-4. Max. ' + (o.maxWords || 350) + ' Wörter. '
+      + 'KEINE konkreten Strikes, Deltas, DTE-Zahlen, Prämien oder Daten nennen — '
+      + 'nur qualitative Parameterbereiche und Kriterien-Einordnung.';
+  }
+
   // ── STRATEGIE-KONFIGURATIONEN (12 kanonische UIQ-Strategien) ──────────────
   const STRATEGIES = {
 
@@ -412,6 +516,15 @@ Das bedeutet konkret:
         "Hauptrisiko fuer die Long-These: was koennte kurzfristig zum KO-Ereignis fuehren?"
       ],
       prompt: function(ctx) {
+        if (!ctx.isEic) {
+          return _publicEquityPrompt(ctx, {
+            rolle: 'Du analysierst Hebelprodukte (KO-Zertifikate, EUR-basiert) auf Basis technischer Kennzahlen.',
+            stratName: 'KO-Zertifikat-Setups',
+            marktumfeldFrage: 'Ist das aktuelle Regime strukturell für Hebelprodukte auf Long-Titel geeignet (Volatilität, Trend)?',
+            focus: STRATEGIES.ko.focus,
+            maxWords: 350
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + 'Du bist ein erfahrener Knock-out-Trading-Experte (Hebelprodukte auf Aktien, EUR-basiert).\n\n'
           + ctx.marktkontext
@@ -437,6 +550,15 @@ Das bedeutet konkret:
         "Sektor- oder Makro-Risiko, das die Momentum-These aktuell am ehesten gefaehrden wuerde"
       ],
       prompt: function(ctx) {
+        if (!ctx.isEic) {
+          return _publicEquityPrompt(ctx, {
+            rolle: 'Du analysierst Aktien nach Minervini/SEPA-Momentum-Kriterien (Stage-2-Trend, relative Stärke).',
+            stratName: 'Momentum/SEPA-Setups',
+            marktumfeldFrage: 'Unterstützt die aktuelle Marktphase Momentum-Strategien (Trendbreite, Regime)?',
+            focus: STRATEGIES.momentum.focus,
+            maxWords: 350
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + 'Du bist ein erfahrener Momentum-Investor nach Minervini/SEPA-Methode.\n\n'
           + ctx.marktkontext
@@ -465,6 +587,15 @@ Das bedeutet konkret:
         "Groesstes False-Breakout-Risiko bei diesem spezifischen Setup"
       ],
       prompt: function(ctx) {
+        if (!ctx.isEic) {
+          return _publicEquityPrompt(ctx, {
+            rolle: 'Du analysierst technische Breakout-Setups (52W-Hoch-Nähe, Volumenbestätigung, Stage-2-Kontext nach Minervini/O\'Neil/IBD) auf Basis von Tagesschluss-Daten. UIQ ist KEIN Intraday-Scanner.',
+            stratName: 'Breakout-Setups',
+            marktumfeldFrage: 'Unterstützt das aktuelle Regime technische Breakouts (Marktbreite, Volatilität)?',
+            focus: STRATEGIES.breakout.focus,
+            maxWords: 400
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + 'Du bist ein erfahrener Breakout-Trader mit Fokus auf technische Ausbrüche über '
           + 'Pivot-Punkte und 52-Wochen-Hochs im übergeordneten Stage-2-Aufwärtstrend '
@@ -523,6 +654,15 @@ Das bedeutet konkret:
         "Risiko eines fehlgeschlagenen Ausbruchs (z.B. fehlendes Volumen, schwacher Gesamtmarkt)"
       ],
       prompt: function(ctx) {
+        if (!ctx.isEic) {
+          return _publicEquityPrompt(ctx, {
+            rolle: 'Du analysierst Volatility-Contraction-Pattern-Setups (VCP nach Mark Minervini) — sukzessiv enger werdende Korrekturen in einem Stage-2-Aufwärtstrend.',
+            stratName: 'VCP-Setups',
+            marktumfeldFrage: 'Ist das aktuelle Marktumfeld (Regime, VIX, Marktbreite) günstig für VCP-Ausbrüche?',
+            focus: STRATEGIES.vcp.focus,
+            maxWords: 350
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + 'Du bist ein erfahrener technischer Analyst mit Spezialisierung auf das '
           + 'Volatility Contraction Pattern (VCP) nach Mark Minervini. '
@@ -570,6 +710,15 @@ Das bedeutet konkret:
         "Was wuerde dieses Swing-Setup am ehesten invalidieren?"
       ],
       prompt: function(ctx) {
+        if (!ctx.isEic) {
+          return _publicEquityPrompt(ctx, {
+            rolle: 'Du analysierst kurzfristige technische Swing-Setups (5-20 Tage Haltedauer-Horizont).',
+            stratName: 'Swing-Setups',
+            marktumfeldFrage: 'Wie ist die kurzfristige Trendrichtung und das Swing-Potenzial einzuordnen?',
+            focus: STRATEGIES.swing.focus,
+            maxWords: 350
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + 'Du bist ein erfahrener Swing-Trader mit Fokus auf 5-20 Tage Haltedauer.\n\n'
           + ctx.marktkontext
@@ -595,6 +744,15 @@ Das bedeutet konkret:
         "Momentum-Fallen-Risiko: spricht das uebergeordnete Trendumfeld gegen eine Mean-Reversion-These?"
       ],
       prompt: function(ctx) {
+        if (!ctx.isEic) {
+          return _publicEquityPrompt(ctx, {
+            rolle: 'Du analysierst statistische Über-/Unterverkauft-Situationen (Mean-Reversion-Kontext).',
+            stratName: 'Mean-Reversion-Setups',
+            marktumfeldFrage: 'Gibt es aktuell extreme Über-/Unterverkauft-Situationen im Markt?',
+            focus: STRATEGIES.meanrev.focus,
+            maxWords: 350
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + 'Du bist ein quantitativer Analyst mit Fokus auf Mean-Reversion-Strategien.\n\n'
           + ctx.marktkontext
@@ -634,6 +792,15 @@ Das bedeutet konkret:
         // bewusst dem geplanten Options-Doktor vorbehalten bleibt).
         var _pt = (rules.profitTaking && rules.profitTaking[0]) ? rules.profitTaking[0].pct : 50;
         var _sl = rules.stopLoss ? rules.stopLoss.pct : -200;
+        if (!ctx.isEic) {
+          return _publicOptionsPrompt(ctx, {
+            rolle: 'Du analysierst Titel auf strukturelle Eignung für eine Cash-Secured-Put/Covered-Call-Wheel-Strategie (Theta-Einkommen).',
+            stratName: 'CSP/Wheel-Setups',
+            marktumfeldFrage: 'Ist das aktuelle Volatilitätsniveau (VIX) strukturell günstig für Prämien-Strategien?',
+            focus: STRATEGIES.csp_wheel.focus,
+            maxWords: 400
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + 'Du bist ein erfahrener Options-Trader mit Fokus auf Wheel-Strategie (CSP + Covered Calls).\n\n'
           + '⚠️ Diese Analyse dient ausschliesslich zu Informationszwecken gem. §1 WpHG.\n\n'
@@ -684,6 +851,15 @@ Das bedeutet konkret:
       ],
       prompt: function(ctx) {
         var cfg = ctx.optsCfg || { minPrice: 15, maxPrice: 80, minHvp: 40, goodHvp: 55, idealHvp: 65, erDays: 30, dte: 21 };
+        if (!ctx.isEic) {
+          return _publicOptionsPrompt(ctx, {
+            rolle: 'Du analysierst Titel auf strukturelle Eignung für eine systematische ATM-Cash-Secured-Put-Strategie (Zeitwert-Maximierung, ~30 Tage Laufzeit).',
+            stratName: 'CSP (ATM/NA)-Setups',
+            marktumfeldFrage: 'Sind ATM-CSPs beim aktuellen VIX-Niveau strukturell attraktiv?',
+            focus: STRATEGIES.atmna.focus,
+            maxWords: 400
+          });
+        }
         return '⛔⛔⛔ EIC-MODUS — ABSOLUTES HALLUZINATIONS-VERBOT ⛔⛔⛔\n'
           + 'Verwende AUSSCHLIESSLICH Daten aus dem Prompt. Fehlende Werte: "N/A — in IBKR prüfen".\n\n'
           + 'Du bist ein erfahrener Options-Trader der eine systematische ATM-CSP-Wheel-Strategie anwendet.\n\n'
@@ -741,6 +917,15 @@ Das bedeutet konkret:
       ],
       prompt: function(ctx) {
         var cfg = ctx.optsCfg || { minPrice: 15, maxPrice: 80, minHvp: 40, erDays: 30 };
+        if (!ctx.isEic) {
+          return _publicOptionsPrompt(ctx, {
+            rolle: 'Du analysierst Titel auf strukturelle Eignung für eine wöchentliche Diagonal-Put-Spread-Einkommensstrategie (kurzfristiger Short-Put + langfristige Long-Put-Versicherung).',
+            stratName: 'CSP (Weekly)-Setups',
+            marktumfeldFrage: 'Ist das aktuelle Umfeld (VIX, Trend) für wöchentliche Einkommensstrategien günstig?',
+            focus: STRATEGIES.weekly_income.focus,
+            maxWords: 400
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + '⛔ ABSOLUTES HALLUZINATIONS-VERBOT: Verwende AUSSCHLIESSLICH Daten aus dem Prompt.\n'
           + '   Kurse, Strikes, Prämien NUR aus Scandaten — NIEMALS schätzen oder erfinden.\n'
@@ -792,6 +977,15 @@ Das bedeutet konkret:
       prompt: function(ctx) {
         var cfg = ctx.optsCfg || { minPrice: 15, maxPrice: 300, minHvp: 30, goodHvp: 45, idealHvp: 60, erDays: 30, dte: 30 };
         var rules = getEffectiveRules('cc', cfg) || { deltaRange: [0.20, 0.30], dteRange: [cfg.dte, 45] };
+        if (!ctx.isEic) {
+          return _publicOptionsPrompt(ctx, {
+            rolle: 'Du analysierst Titel auf strukturelle Eignung für Covered-Call-Writing (Call-Verkauf auf bestehende oder neu erworbene Aktienpositionen, Buy-Write).',
+            stratName: 'Covered-Call-Setups',
+            marktumfeldFrage: 'Ist das aktuelle Umfeld (VIX-Niveau, Trendstärke) für Covered Calls günstig?',
+            focus: STRATEGIES.cc.focus,
+            maxWords: 400
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + 'Du bist ein erfahrener Options-Trader mit Fokus auf Covered Call Writing (Call-Verkauf auf bestehende oder neu erworbene Aktienpositionen).\n\n'
           + '⚠️ Diese Analyse dient ausschliesslich zu Informationszwecken gem. §1 WpHG.\n\n'
@@ -841,6 +1035,15 @@ Das bedeutet konkret:
         "Wichtigste Einschraenkung dieser Einschaetzung, die vor einer echten Position in IBKR/CapTrader zu pruefen ist"
       ],
       prompt: function(ctx) {
+        if (!ctx.isEic) {
+          return _publicOptionsPrompt(ctx, {
+            rolle: 'Du analysierst Bestandspositionen auf strukturellen Absicherungsbedarf (Collar/Protective Put) in einem fragilen Bull-Regime. UIQ hat KEINEN Zugriff auf echte Optionsketten oder Bestandspositionen — alle Einordnungen sind ATR/HVP-basierte Näherungen.',
+            stratName: 'Collar/Protective-Put-Setups',
+            marktumfeldFrage: 'Spricht das aktuelle Regime (BULL_FRAGILE o.ä.) grundsätzlich für Absicherungsüberlegungen?',
+            focus: STRATEGIES.collar.focus,
+            maxWords: 350
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + 'Du bist ein erfahrener Options-Stratege mit Fokus auf Absicherungsstrategien '
           + '(Collar / Protective Put) für bereits gehaltene Aktienpositionen in einem '
@@ -882,6 +1085,15 @@ Das bedeutet konkret:
         "Groesstes Risiko fuer die Nachhaltigkeit dieser Dividende"
       ],
       prompt: function(ctx) {
+        if (!ctx.isEic) {
+          return _publicEquityPrompt(ctx, {
+            rolle: 'Du analysierst Qualitäts-Dividendentitel (nachhaltige Ausschüttung, solider Free Cashflow).',
+            stratName: 'Dividend-Growth-Setups',
+            marktumfeldFrage: 'Unterstützt das aktuelle Regime Income-Strategien (Zinsniveau, HY-Spread)?',
+            focus: STRATEGIES.dividend.focus,
+            maxWords: 350
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + 'Du bist ein erfahrener Income-Investor spezialisiert auf Qualitäts-Dividendentitel '
           + 'mit nachhaltiger Ausschüttung und solidem Free Cashflow.\n'
@@ -921,12 +1133,53 @@ Das bedeutet konkret:
         "Staerkstes strukturelles Risiko (schrumpfendes Geschaeftsmodell, Schuldenlast, Sektor-Gegenwind)"
       ],
       prompt: function(ctx) {
+        // BUGFIX (29.08.2026, Backlog №65-Fortsetzung): ctx.tickers wird von
+        // runValueKiBriefing() (index.html) uebergeben, wurde hier aber nie
+        // serialisiert — die KI bekam bislang praktisch keine Einzeltitel-
+        // Kennzahlen fuer diese Strategie (nur den kurzen Datums/Regime/VIX-
+        // Header aus ctx.marktkontext). Jetzt: falls ctx.tickers vorhanden,
+        // daraus eine Kandidatenliste bauen und ctx.marktkontext voranstellen.
+        var _tickerBlock = '';
+        if (Array.isArray(ctx.tickers) && ctx.tickers.length) {
+          _tickerBlock = '\n\nKANDIDATEN (Top-' + ctx.tickers.length + '):\n'
+            + ctx.tickers.map(function(t, i) {
+                var l = (i + 1) + '. ' + (t.sym || t.ticker || '?');
+                if (t.finalScore != null) l += ' Score:' + t.finalScore;
+                if (t.pe != null)  l += ' PE:' + t.pe;
+                if (t.pb != null)  l += ' PB:' + t.pb;
+                if (t.fcfYield != null) l += ' FCF:' + t.fcfYield + '%';
+                if (t.roicProxy != null) l += ' ROIC-Proxy:' + t.roicProxy;
+                if (t.revGrowth != null) l += ' RevGrowth:' + t.revGrowth + '%';
+                if (t.grossMargin != null) l += ' GM:' + t.grossMargin + '%';
+                // Zwei Aufrufstellen (openKiBriefing vs. runValueKiBriefing)
+                // benennen dasselbe Feld unterschiedlich (rs/rsRating,
+                // hvp/ivp) — beide Varianten abfangen statt eine zu verpassen.
+                var _rsVal  = (t.rs != null) ? t.rs : t.rsRating;
+                var _hvpVal = (t.hvp != null) ? t.hvp : t.ivp;
+                if (_rsVal != null) l += ' RS:' + _rsVal;
+                if (t.aboveEma200 != null) l += ' EMA200:' + (t.aboveEma200 ? 'über' : 'unter');
+                if (t.rsi != null) l += ' RSI:' + Math.round(t.rsi);
+                if (_hvpVal != null) l += ' HVP:' + _hvpVal + '%';
+                if (t.wheelCandidate) l += ' [Wheel-Kandidat]';
+                return l;
+              }).join('\n');
+        }
+        var _marktkontextMitTickern = (ctx.marktkontext || '') + _tickerBlock;
+        if (!ctx.isEic) {
+          return _publicEquityPrompt({ marktkontext: _marktkontextMitTickern }, {
+            rolle: 'Du analysierst günstig bewertete Qualitätstitel nach Value-Kriterien (Graham/Buffett-Prinzipien).',
+            stratName: 'Value-Setups',
+            marktumfeldFrage: 'Unterstützt das aktuelle Regime Value-Rotation (Growth-vs-Value-Dynamik, Zinsniveau)?',
+            focus: STRATEGIES.value.focus,
+            maxWords: 350
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + 'Du bist ein erfahrener Value-Investor nach Graham/Buffett-Prinzipien — '
           + 'günstig bewertete Qualitätstitel mit Sicherheitsmarge.\n'
           + 'Kein Value-Trap-Jäger: ein niedriger Kurs allein reicht nicht, '
           + 'ROE und FCF müssen den niedrigen Preis rechtfertigen.\n\n'
-          + (ctx.marktkontext || '')
+          + _marktkontextMitTickern
           + '\n\nFELDER-LEGENDE (Value-spezifisch):\n'
           + '- peForward: Forward Price/Earnings-Ratio (<20x bevorzugt; <15x = attraktiv)\n'
           + '- pb: Price/Book-Ratio (<3x = günstig; <1x = tief unterbewertet)\n'
@@ -967,6 +1220,15 @@ Das bedeutet konkret:
       // KI-Analyse-Button ist daher deaktiviert (runAlphaLbKI gibt Hinweis).
       // Eintrag hier für getConfig() + STRATEGIE_MATRIX.
       prompt: function(ctx) {
+        if (!ctx.isEic) {
+          return _publicEquityPrompt(ctx, {
+            rolle: 'Du analysierst überhitzte Titel auf strukturelle Eignung für einen Gegentrend-Ansatz (Fading, experimentell, nur BULL_FRAGILE/STRESS_UNSTABLE).',
+            stratName: 'Fading-Short-Setups (experimentell)',
+            marktumfeldFrage: 'Ist das aktuelle Regime (BULL_FRAGILE/STRESS_UNSTABLE) überhaupt für Fading-Ansätze relevant?',
+            focus: STRATEGIES.fading_short.focus,
+            maxWords: 300
+          });
+        }
         return KI_ANTI_HALLUZINATION
           + 'Du bist ein erfahrener Trader mit Fokus auf Fading-Strategien (KO-Short auf überhitzte Titel).\n\n'
           + '⚠️ Fading Short ist experimentell — nur bei klarem BULL_FRAGILE oder STRESS_UNSTABLE Regime.\n\n'
