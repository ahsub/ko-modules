diff --git a/ko-prompts.js b/ko-prompts.js
index eb9a2e2..cdc7936 100644
--- a/ko-prompts.js
+++ b/ko-prompts.js
@@ -1,6 +1,29 @@
 /**
  * ko-prompts.js — UnderlyingIQ Strategy Prompts Module
  * ══════════════════════════════════════════════════════════════════
+ *  Version: 2.8.0 (29.08.2026) — DRITTER LEGAL-REVIEW-ZYKLUS (Backlog №65
+ *  Fortsetzung, externe Rechtsberatung zum ATM/NA-Public-Output nach
+ *  v2.7.0): Struktur und Zahlenfreiheit wurden diesmal als "sehr viel
+ *  besser" bewertet — Rest sind sechs lexikalische Einzelstellen, kein
+ *  strukturelles Problem mehr. Fix: PUBLIC_REGULATORY_GUARDRAIL um sechs
+ *  konkrete Wort-/Satzmuster-Verbote mit woertlichen Pflicht-Ersatz-
+ *  formulierungen erweitert: (1) "strukturelle Attraktivitaet fuer
+ *  [Strategie]" → "Das Modell weist ... einen hohen Strategy Fit ... zu."
+ *  (2) "optimal" vollstaendig verboten (nicht nur "optimalerweise ...
+ *  fokussiert" wie in v2.6.0). (3) "Andienung nicht auszuschliessen" →
+ *  Pflicht-Kausal-Konditional-Format. (4) "Strike sollte ... validiert
+ *  werden" verboten (impliziert UIQ waehle den Strike) → Pflichtsatz "Die
+ *  konkrete Strike-Auswahl ... sind ausserhalb von UIQ im Broker zu
+ *  pruefen." (5) "Praemienerwartung" verboten → Volatilitaetssignal-
+ *  Formulierung mit Broker-Verweis. (6) Sektion-5-Einstieg jetzt mit
+ *  woertlichem Pflicht-Satzmuster ("Unter Anwendung der definierten
+ *  Modellkriterien weisen [Titel] ... den hoechsten Strategy Fit ... auf.")
+ *  statt freier Formulierung — verhindert das vom Reviewer als heikelsten
+ *  Satz markierte "Die Modell-Analyse identifiziert [Titel] als
+ *  top-gerankt". Reviewer-Fazit zu diesem Zyklus: Version nicht weiter
+ *  entschaerfen, nur noch diese lexikalischen Stellen systematisch auf
+ *  "Strategy Fit / Modellkriterien / Risikoindikatoren / externe
+ *  Validierung" umstellen — genau das leistet dieser Fix.
  *  Version: 2.7.0 (29.08.2026) — ZWEITER LEGAL-REVIEW-ZYKLUS (Backlog №65
  *  Fortsetzung, externe Rechtsberatung zum ATM/NA-Public-Output nach
  *  v2.6.1): der v2.6.1-Fix (kein Fazit, keine Zahlen) reichte nicht — der
@@ -517,29 +540,55 @@ Das bedeutet konkret:
     'eroeffnen", "Fokus auf", "priorisieren", "einsteigen", "aussitzen", ' +
     '"beste Aktie/Titel fuer dich", "optimaler Trade", "Handlungsorientierte ' +
     'Einschaetzung", "solltest du", "Empfehlung", "optimalerweise ... ' +
-    'fokussiert".\n' +
-    '- STATTDESSEN verwenden: "hoechster Strategy Fit", "erfuellt die ' +
+    'fokussiert", "optimal", "attraktiv"/"Attraktivitaet", "Kandidat"/' +
+    '"Top-Kandidaten", "Praemienerwartung", "identifiziert als", ' +
+    '"top-gerankt", "sollte ... validiert werden".\n' +
+    '- STATTDESSEN verwenden: "hoher/hoechster Strategy Fit", "erfuellt die ' +
     'definierten Kriterien", "Modell bevorzugt diese Konstellation", ' +
-    '"technisch guenstigere Ausgangslage", "innerhalb des untersuchten ' +
-    'Universums hoeher gerankt".\n' +
+    '"technisch guenstigere Ausgangslage", "kompatibel mit den definierten ' +
+    'Kriterien der Strategie", "innerhalb des untersuchten Universums ' +
+    'hoeher gerankt".\n' +
     '- Konkrete Optionsparameter (Strike, Delta, Praemie, PoP, Break-even, ' +
     'Assignment Risk) werden NICHT von UIQ bestimmt, sondern sind im Broker ' +
-    'zu pruefen — das immer so benennen, nie als UIQ-Wert ausgeben.\n' +
+    'zu pruefen — das immer so benennen, nie als UIQ-Wert ausgeben. Formu- ' +
+    'lierungen wie "Strike sollte modellseitig validiert werden" sind ' +
+    'verboten (impliziert, UIQ waehle den Strike) — Pflichtformulierung ' +
+    'stattdessen woertlich: "Die konkrete Strike-Auswahl sowie die ' +
+    'zugehoerigen Optionsparameter sind ausserhalb von UIQ im Broker zu ' +
+    'pruefen."\n' +
     '- Aussagen zu Praemien/Volatilitaet IMMER hedgen ("kann grundsaetzlich ' +
     'mit ... einhergehen"); NIEMALS als Tatsachenbehauptung wie ' +
-    '"Praemienniveau ausreichend" oder "hoehere Praemien".\n' +
+    '"Praemienniveau ausreichend", "hoehere Praemien" oder "moderate ' +
+    'Praemienerwartung". Bevorzugte Formulierung: "Auf Basis der ' +
+    'Modellparameter ergibt sich [kein/ein] ausgepraegtes Volatilitaetssignal; ' +
+    'die tatsaechlich verfuegbare Optionspraemie ist im Broker zu pruefen."\n' +
     '- Aussagen zu Risikoreduktion IMMER als Modellsignal kennzeichnen, nie ' +
     'als reale Risikoaussage — z.B. "wird vom Modell als unterstuetzender ' +
     'Kontext bewertet; das individuelle Risiko bleibt bestehen" statt ' +
     '"reduziert das Risiko erheblich".\n' +
+    '- Andienungsrisiko IMMER im Kausal-Konditional-Format, NIEMALS als ' +
+    'knappe Feststellung wie "Andienung nicht auszuschliessen": ' +
+    '"Eine Kursbewegung unterhalb des Strike kann zu einer Andienung ' +
+    'fuehren; dieses Ereignis wird durch die im Modell beruecksichtigten ' +
+    'Faktoren nicht ausgeschlossen."\n' +
     '- Ausschlussgruende als "erfuellt die Kriterien nicht" formulieren, ' +
     'NIEMALS als "ist fuer dich nicht geeignet" (UIQ bewertet ein Modell, ' +
     'nicht die individuelle Eignung fuer den Nutzer).\n' +
+    '- Marktumfeld-Einschaetzungen NIEMALS als "strukturelle Attraktivitaet ' +
+    'fuer [Strategie]" formulieren (impliziert wirtschaftliche Attraktivitaet ' +
+    'eines konkreten Geschaefts) — stattdessen woertlich: "Das Modell weist ' +
+    'dem aktuellen Marktumfeld einen hohen Strategy Fit fuer die betrachtete ' +
+    '[Strategie] zu."\n' +
     '- Ein abschliessender Abschnitt ist NUR im Format "UIQ ... ' +
     'ZUSAMMENFASSUNG" erlaubt (s. AUFGABE-Punkt 5) und darf ausschliesslich ' +
     'bereits genannte Kriterien-Uebereinstimmungen wiederholen plus den ' +
     'Pflichthinweis auf eigene Pruefung ausserhalb von UIQ — niemals eine ' +
-    'neue Praeferenz oder Handlungsanweisung.\n\n';
+    'neue Praeferenz oder Handlungsanweisung. Pflicht-Satzmuster fuer den ' +
+    'Einstieg von Punkt 5, wortgetreu zu uebernehmen (Platzhalter fuellen): ' +
+    '"Unter Anwendung der definierten Modellkriterien weisen [Titel] im ' +
+    'betrachteten Snapshot den hoechsten Strategy Fit innerhalb der ' +
+    'untersuchten [Strategie]-Kandidaten auf." — NIEMALS "Die Modell-' +
+    'Analyse identifiziert [Titel] als top-gerankt".\n\n';
 
   function _publicEquityPrompt(ctx, o) {
     return KI_ANTI_HALLUZINATION
