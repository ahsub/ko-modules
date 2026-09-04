/**
 * ko-prompts.js — UnderlyingIQ Strategy Prompts Module
 * ══════════════════════════════════════════════════════════════════
 *  Version: 2.23.1 (04.09.2026) — REVIEWER-FEEDBACK ZUM MOMENTUM-9-PUNKTE-
 *  LIVE-TEST (04.09.2026) eingearbeitet, vier Funde, zwei Kategorien:
 *  GENERISCH (gemeinsamer Builder, wirkt rückwirkend auf alle 7 migrierten
 *  Strategien): (1) Abschnitt-9-Wortverbot "profitiert von [Kennzahl]" war
 *  zu eng gefasst — Live-Test zeigte Umgehung über sinnverwandte Formu-
 *  lierungen ("könnte ... ein breiteres technisches Spielraum-Profil
 *  darstellen"), die denselben impliziten Vorteil transportieren ohne die
 *  wörtliche Phrase zu nutzen; Verbot auf die BEDEUTUNG statt nur den
 *  Wortlaut erweitert, mit Beispielen und einem "klingt es wie eine
 *  Kaufbegründung?"-Prüfmaßstab. (2) Neuer optionaler Erweiterungspunkt
 *  `o.kriterienDifferenzierungText` in Abschnitt 3 (analog risikenText/
 *  modellGrenzeText) + generisches Verbot, bei Score-Gleichstand unter
 *  den Top-Titeln pauschal zu behaupten, "alle übrigen Titel erfüllen die
 *  Kriterien ebenfalls" — verwässert den Strategy-Fit-Gedanken; künftig
 *  klare Trennung "qualifiziert" vs. "Top-Fit" gefordert.
 *  MOMENTUM-SPEZIFISCH: (3) neues focus[]-Kriterium zum bullCount-Feld
 *  (X/3 MACD/OBV/MA50) — Live-Test zeigte unbelegte Verdichtung zu
 *  "bullische Signalquintessenz" ohne zu erklären, was der Zähler misst/
 *  nicht misst. (4) risikenText NEU gesetzt: 52W-Hoch-Nähe fälschlich als
 *  "erhöhtes Realisierungsrisiko" geframt — fachlich falsch für Momentum
 *  (Minervini-Logik: Hoch-Nähe ist Trendbestätigung, kein Warnsignal);
 *  korrigierte Formulierung ("bestätigt Trendstärke, erhöht Fehlausbruchs-
 *  Sensitivität") jetzt vorgegeben, inkl. Verbot der Umkehr-Fehldeutung
 *  (größerer Hoch-Abstand ≠ automatisch "günstigerer" Einstieg).
 *  kriterienDifferenzierungText für momentum gesetzt. Noch NICHT erneut
 *  live/smoke-getestet.
 *
 *  Version: 2.23.0 (04.09.2026) — EQUITY-MIGRATION FORTGESETZT (P1):
 *  `momentum` als erste von 8 verbleibenden Equity-Strategien von
 *  `_publicEquityPrompt()` auf `_publicNinePointPrompt()` umgestellt
 *  (istOptionsStrategie: false, kein mode-Override → 'scan'). Vor dem
 *  ersten Live-Test proaktiv geprüft: bekannte Problemwörter ("attraktiv",
 *  "maximiert"/"optimiert", "keine strukturellen Hemmnisse",
 *  "ATM-orientiert" außerhalb ATM-Kontext) — keine gefunden. NEUER FUND
 *  (strukturell, kein Wortverbot): das dritte focus[]-Kriterium
 *  ("Stop-Loss-Niveau: Sinnvoller Prozentabstand unter Kurs...") hätte
 *  das Modell aktiv zu einem KONKRETEN Stop-Loss-Prozentwert eingeladen —
 *  kollidiert mit Abschnitt 8 des 9-Punkte-Schemas ("OHNE jede Exit-/
 *  Stop-/Roll-/Timing-Regel", EIC-exklusiv, Grundgesetz #11). Vor dem
 *  ersten Test umformuliert auf rein qualitative "Stop-Loss-
 *  Sensitivität" (HVP-Tendenz, kein Zahlenwert). principle-Text neu
 *  ergänzt (Minervini-Stage-2-Mechanik), da MECHANIK-BEZUG-PFLICHT in
 *  Abschnitt 2 einen STRATEGIEPRINZIP-Verweis voraussetzt (Muster aus
 *  allen 6 bisher migrierten Strategien uebernommen). maxWords 350→450.
 *  EIC-Zweig unverändert. Noch NICHT live getestet.
 *
 *  Version: 2.22.6 (04.09.2026) — POLITUR-FIX zum KO-5-Fund: der zweite
 *  echte 9-Punkte-Live-Test (04.09.2026, KO-Trading, Kandidaten DE/BE/SIRI,
 *  jetzt mit echtem homeMarket-Wert aus dem Aggregator statt Fallback)
 *  bestätigte KO-5 inhaltlich als behoben — die Regel griff. Fund dabei:
 *  das Modell übernahm die interne Feldnotation "homeMarket=US" WÖRTLICH
 *  in den kundenseitigen Output (Abschnitt 5), statt sie natürlichsprachlich
 *  zu verbalisieren (z.B. "diese Titel werden an US-Börsen gehandelt").
 *  Kein Sachfehler, aber ein Politur-Mangel — interne Datenpunkt-Bezeichner
 *  gehören nicht in den Public-Text, wirkt wie ein technisches Leck.
 *  Fix: beide homeMarket-Stellen (focus[]-Array KO-5-Kriterium + risikenText)
 *  um eine explizite Verbalisierungs-Anweisung ergänzt — homeMarket bleibt
 *  Faktengrundlage fürs Modell, muss aber in normalsprachlicher Form
 *  ausgegeben werden, nie als "Feld=Wert"-Notation. Noch NICHT erneut
 *  live/smoke-getestet.
 *
 *  Version: 2.22.5 (04.09.2026) — KO-5-FIX: "bei US-Titeln" (reine Text-
 *  Instruktion, Modell musste US-Zugehoerigkeit aus dem Ticker selbst
 *  erschliessen) ersetzt durch Bezug auf das neue, tatsaechlich mitgelieferte
 *  Datenfeld homeMarket (market_aggregator.py v04.09.2026 + index.html
 *  v20260904-v488, DATA_LEGENDE/tickerList). Ausloeser: erster echter
 *  9-Punkte-Live-Test mit den v2.22.4-Guardrails (04.09.2026, KO-Trading,
 *  Kandidaten DE/SIRI/SLDE — alle drei US-boersennotiert) zeigte KO-5
 *  (Gap-/Overnight-Risiko) komplett fehlend im Output, obwohl die Bedingung
 *  erfuellt war — die Erkennung aus dem blossen Tickersymbol ("DE" z.B.
 *  kollidiert mit dem Laenderkuerzel Deutschland) war nicht zuverlaessig.
 *  Betrifft beide KO-5-Stellen im focus[]-Array (Zeile ~2163) und im
 *  risikenText (Zeile ~2185ff.) sowie den bislang analog anfaelligen
 *  "Marktzugang"-Punkt (Zeile ~2162, ebenfalls "fuer viele US-Aktien").
 *  Funktional noch NICHT erneut live/smoke-getestet — vor dem naechsten
 *  KO-Lauf verifizieren, dass homeMarket im tickerList-String ankommt.
 *
 *  Version: 2.22.4 (03.09.2026) — FÜNF KO-SPEZIFISCHE GUARDRAILS ERGÄNZT,
 *  externes Reviewer-Feedback zum ersten echten KO-9-Punkte-Live-Test
 *  (über den richtigen Code-Pfad, s. v2.22.3-Aufklärung): (1) KO-1
 *  Underlying ≠ Produkt (WICHTIGSTER FUND) — UIQ bewertet den Basiswert,
 *  NICHT ein konkretes KO-Zertifikat (Barriere/Hebel/Spread/
 *  Finanzierungskosten/Emittent/Liquidität unbekannt); neuer generischer
 *  Erweiterungspunkt `o.modellGrenzeText` in Abschnitt 8 ergänzt (analog
 *  risikenText für Abschnitt 5) und für ko mit explizitem Pflicht-Satz
 *  belegt. (2) KO-2 EMA200 ≠ KO-Abstand — EMA200-Distanz ist ein
 *  Underlying-Trendindikator, niemals mit dem tatsächlichen Puffer zur
 *  Barriere gleichzusetzen; "Rückkehr-/Korrekturrisiko"/"KO-Barriere
 *  schneller erreichen" verboten, präzisere Alternativformulierung
 *  vorgegeben. (3) KO-3 HVP ≠ Hebel/Produktvolatilität/KO-Wahrscheinlich-
 *  keit — neues focus[]-Kriterium. (4) KO-4 Score/Strategy-Fit ≠
 *  Gewinnwahrscheinlichkeit — klärt die vom Reviewer bemängelte
 *  Ungereimtheit (Top-3-Kandidat gleichzeitig als "weniger geeignet"
 *  markiert): explizit als KEIN Widerspruch gekennzeichnet, beide Ebenen
 *  (Ranking vs. Risiko) klar getrennt zu halten. (5) KO-5/Gap-Risiko —
 *  neues focus[]-Kriterium zu Zeitzonen-Versatz DE/US und Overnight-
 *  Bewegungen als KO-spezifisch verschärftes Risiko. ZUSÄTZLICH:
 *  "Open End bevorzugen" von einer kategorischen Regel auf eine
 *  Prüfliste (Laufzeit, Finanzierungskosten, Barriere, Abstand,
 *  Emittentenbedingungen, Liquidität) umformuliert (war zu absolut).
 *  2.000-EUR-Positionslimit explizit als Totalverlust-Obergrenze
 *  geklärt, NICHT als Stop-Loss-Mechanismus. rolle-Text ergänzt um
 *  "UIQ bewertet ausschließlich den Basiswert" als zusätzliche
 *  Verstärkung von KO-1 direkt am Anfang des Prompts. maxWords 500→550
 *  (Puffer für die fünf neuen Guardrail-Inhalte). Funktional per Node-
 *  Smoke-Test verifiziert: alle fünf Guardrail-Marker im generierten
 *  Prompt vorhanden, Open-End-Absolutheit entfernt.
 *
 *  Version: 2.22.3 (03.09.2026) — LABEL-BUG BEHOBEN: alle 14 STRATEGIES-
 *  Eintraege hatten kein `label`-Feld (nur `hint`, deutlich laenger/Icon-
 *  behaftet) — Ursache fuer "KI-basierte Markt-Einschätzung — undefined"
 *  im Alpha-Desk-Leaderboard-KI-Modal (index.html Zeile ~25569,
 *  stratCfg.label). Vorbestehender Bug, betraf alle 14 Strategien in
 *  diesem Modal, nicht erst durch die heutigen Aenderungen entstanden.
 *  `label` fuer jede Strategie ergaenzt, Wert identisch zum bereits
 *  verwendeten `stratName` aus dem jeweiligen prompt()-Aufruf (konsistente
 *  Benennung zwischen 9-Punkte-Prompt und Leaderboard-Modal-Titel).
 *  Funktional verifiziert: stratFromLb('ko_long') → 'ko' →
 *  STRATEGIES.ko.label = "KO-Zertifikat-Setups (Long)", alle 14 Eintraege
 *  auf fehlendes label geprueft (keine Luecke mehr).
 *
 *  Version: 2.22.2 (03.09.2026) — SICHERHEITSLÜCKE GESCHLOSSEN:
 *  _getSystemPrompt() (via getSystemPrompt(), von getKiSystemPrompt() in
 *  index.html aufgerufen) speist mindestens 6 "Quick-Take"-Features
 *  (Alpha-Desk-Leaderboard-KI, Einzeltitel-Deep-Dive, Beste Options-
 *  Kombination, Beste Chancen über alle Strategien, Dark Pool) — laut
 *  Axel "general", also auch fuer Beta-/Public-User zugaenglich. Diese
 *  Funktion enthielt BISLANG KEINE der heutigen 9-Punkte-Guardrail-
 *  Haertungen (kein PUBLIC_REGULATORY_GUARDRAIL, kein KI_ANTI_
 *  HALLUZINATION) — nur 5 generische Basisregeln. Live-Beleg 03.09.2026
 *  (Leaderboard-KI, KO-Strategie): Output enthielt trotz bestehender
 *  "keine direkten Kauf-/Verkaufsempfehlungen"-Regel eine direkte
 *  Handlungsempfehlung ("Auf Break-Signal warten... Positionsgröße
 *  minimal halten"). FIX: PUBLIC_REGULATORY_GUARDRAIL + KI_ANTI_
 *  HALLUZINATION jetzt BEDINGUNGSLOS ergaenzt (unabhaengig vom eic-
 *  Parameter — konsistent mit dem 28.08.2026-Sicherheits-Fix, Client-
 *  Flags sind nicht vertrauenswuerdig, nur ko-ai.js entscheidet
 *  serverseitig wirklich ueber Owner-Status). Bewusst NICHT auf das
 *  volle 9-Punkte-Schema umgestellt (Axel-Entscheidung, "Option C"
 *  verfeinert) — diese 6 Features sind bewusst kompakte Quick-Takes,
 *  kein vollstaendiger Bericht; stattdessen die EINE gemeinsame
 *  Basisfunktion gehaertet, die bereits alle 6 speist (Single Source of
 *  Truth, kein 6-facher Umbau noetig). Einleitungssatz entschaerft:
 *  "ob ein Setup heute handlungswuerdig ist" widersprach der neuen
 *  Guardrail direkt (gleiches Widerspruchs-Muster wie der HÖCHSTE/
 *  "Reihenfolge ohne Wertung"-Fund von vorhin). Funktional verifiziert
 *  (Node-Smoke-Test: Guardrail vorhanden, identisch fuer eic=true/false).
 *  NOCH OFFEN: serverseitige SYSTEM_PROMPTS.ki_briefing_public() in
 *  ko-ai.js ist ebenfalls minimal (5 Regeln) — zweite Verteidigungslinie,
 *  separates Thema, heute nicht angefasst.
 *
 *  Version: 2.22.1 (03.09.2026) — SICHERHEITSHINWEIS + STOP-LOSS-EMPFEHLUNG
 *  FÜR ko (Axel-Vorgabe, "verantwortungsvoller Coach"): (1) ARCHITEKTUR-
 *  LÜCKE BEHOBEN: o.risikenText war in _publicNinePointPrompt() bislang
 *  NUR im istOptions-Zweig von Abschnitt 5 verdrahtet — Equity-/
 *  Zertifikate-Strategien (istOptionsStrategie:false) hatten keinen Hook
 *  für strategiespezifische Risikohinweise. Jetzt fuer beide Zweige
 *  verfuegbar. (2) ko nutzt den neuen Hook: Totalverlust-Charakteristik
 *  von KO-Ereignissen (sofortiger, vollstaendiger Kapitalverlust in der
 *  Position — anderes Risikoprofil als Aktienbesitz) jetzt explizit in
 *  principle, focus[]-Hauptrisiko-Kriterium UND risikenText verankert
 *  (dreifache Platzierung fuer Salienz, analog zum bewaehrten Proximity-
 *  Muster). (3) SAUBERE ABGRENZUNG zum bestehenden Verbot: die generelle
 *  Empfehlung, vor Positionseroeffnung eine EIGENE Risikobegrenzung
 *  festzulegen, ist KEINE konkrete Exit-/Stop-Regel (die bleibt laut
 *  Grundgesetz #11 EIC-exklusiv verboten) — beide risikenText-Instanzen
 *  formulieren das explizit so ("OHNE einen konkreten Stop-Loss-Wert oder
 *  eine konkrete Regel zu nennen"), um eine Kollision mit dem bestehenden
 *  Verbot zu vermeiden.
 *
 *  Version: 2.22.0 (03.09.2026) — ERSTE EQUITY-STRATEGIE MIGRIERT: ko
 *  (KO-Zertifikate, Public-Zweig) von _publicEquityPrompt() auf
 *  _publicNinePointPrompt() umgestellt — Meilenstein: erster Equity-
 *  Migrationstest nach 5/5 abgeschlossenen Options-Strategien. Axel-Input
 *  zu Marktzugangs-Charakteristik eingearbeitet: (1) US-Emissions-
 *  beschraenkung seit 2017 (US-Steuerregeln) macht DE/EU-Markt strukturell
 *  breiter/liquider fuer diese Produktklasse — als neues focus[]-Kriterium
 *  UND im principle-Text. (2) Open-End-Praeferenz (unbegrenzte Laufzeit)
 *  als Produktwahl-Hinweis ergaenzt. (3) Trend-vs-Seitwaerts-Regime-
 *  Eignung geschaerft — marktumfeldFrage jetzt explizit auf "klarer
 *  Trendimpuls vs. Seitwaertsumfeld" fokussiert statt allgemein
 *  "strukturell geeignet". BEWUSST NICHT UEBERNOMMEN: die von Axel
 *  genannten konkreten "idealen" Einzeltitel/Sektoren (SAP/ASML/Infineon,
 *  Rheinmetall/Renk/Siemens Energy, Nvidia/Tesla/Alphabet) — Begruendung:
 *  (a) zeitlich instabil ("Ruestung als Dauerbrenner" ist eine 2025/26-
 *  Momentaufnahme, keine strukturelle Wahrheit, wuerde im Prompt veralten),
 *  (b) regulatorisch naeher an einer Empfehlung konkreter Wertpapiere als
 *  eine Sektor-/Volatilitaets-Charakteristik — widerspraeche der gesamten
 *  bisherigen Public-Mode-Philosophie (kein Named-Securities-Bias). Die
 *  strukturellen, zeitlosen Fakten (Marktzugang, Open-End, Regime-Fit)
 *  wurden uebernommen, die vergaenglichen Sektor-Hypes nicht. Bestaetigt:
 *  lbKey 'ko_long' zeigt, es gibt aktuell nur die Long-Variante — von Axel
 *  explizit erwaehnt, keine ko_short-Strategie im Scope dieser Aenderung.
 *
 *  Version: 2.21.3 (03.09.2026) — VIER FUNDE AUS DEM ERSTEN CC-LIVE-TEST
 *  MIT ERWEITERTEN KRITERIEN GEHÄRTET, externes Reviewer-Feedback (relativ
 *  wohlwollend, 9-Punkte-Schema als stabil bestätigt — "Prompt-Freeze für
 *  die Struktur" empfohlen, nur noch Fehler/Guardrails korrigieren): (1)
 *  Dividenden-Kriterium entschärft — war faelschlich als Voraussetzung
 *  formuliert ("Richtwert divYield >=3%" klang zwingend), macht aus CC
 *  ungewollt eine Income-/Dividend-Strategie; jetzt "KANN relevant sein,
 *  ist KEINE zwingende Voraussetzung" in focus[] UND principle. (2)
 *  WICHTIGSTER FUND: expliziter Klarstellungssatz ergänzt — "Der CC-
 *  Strategy-Fit bewertet ausschließlich die Eignung einer Aktie zum
 *  Ueberschreiben ... keine Empfehlung zum erstmaligen Erwerb". Bewusst
 *  NICHT durch Umstellung auf mode:'holding_review' geloest (wuerde die
 *  30.08.2026-Entscheidung revidieren, CC nicht in den Collar-Absicherungs-
 *  Modus zu verschieben) — stattdessen als Klarstellung im principle-Text,
 *  konsistent mit der bestehenden Architektur. (3) HVP-Kriterium
 *  praezisiert: "Kontextsignal, kein Praemienmass" (Reviewer-Wortlaut
 *  uebernommen). (4) CC-spezifische D200-Logik verstaerkt: hoher D200-
 *  Abstand ist bei CC NICHT automatisch positiv wie bei CSP (Opportunitaets-
 *  verlust durch gedeckelten Call bei starkem Aufwaertstrend) — als neues
 *  focus[]-Kriterium UND zusaetzlich in risikenText verankert (doppelte
 *  Platzierung fuer Salienz, analog zum bewaehrten Proximity-Muster).
 *
 *  Version: 2.21.2 (03.09.2026) — CC-KRITERIEN DEUTLICH PRÄZISIERT (Axel-
 *  Vorgabe, detaillierte Praxis-Screening-Beschreibung: "goldene Regel"
 *  Halteeignung, Blue-Chip-Stabilität, IV/Prämienqualität, Strike-Trade-
 *  off). ZWEI KOLLISIONEN mit bestehender Architektur gefunden und
 *  aufgelöst, bevor uebernommen wurde: (1) Marktkapitalisierung (Blue-
 *  Chip-Kriterium) — KEIN Datenfeld im Aggregator vorhanden (geprüft,
 *  0 Treffer für marketCap/market_cap/Marktkapitalisierung) — ersetzt
 *  durch Grade-Einstufung/D200-Position als verfügbare Näherung für
 *  "etablierter Kursverlauf", echte Marktkap/Spread/Liquidität explizit
 *  als Broker-Check gekennzeichnet, nicht als UIQ-Kriterium behauptet.
 *  (2) "IV"/"IV-Perzentil-Rang" als Screening-Kriterium — kollidiert
 *  direkt mit der bestehenden BEGRIFFS-INTEGRITAET-Regel vom 29.08.2026
 *  (HVP und IV/IVR/IVP sind zwei verschiedene Größen aus unterschiedlichen
 *  Datenquellen; UIQ hat keine Live-Optionsketten-IV) — ersetzt durch HVP
 *  als tatsächlich verfügbaren Proxy, mit explizitem Verweis, dass echte
 *  IV/IV-Rank im Broker zu prüfen sind. ZUSÄTZLICH: konkrete Delta-Bereiche
 *  (0,30-0,35 OTM vs. 0,45-0,70 ATM) bewusst NICHT in den Public-Prompt
 *  übernommen (kollidiert mit der bestehenden Public/EIC-Trennung — Public
 *  verbietet konkrete Delta-/Strike-Werte) — stattdessen der zugrunde-
 *  liegende QUALITATIVE Trade-off (näherer Strike = höhere Prämie + höhere
 *  Ausübungswahrscheinlichkeit, passend zu seitwärts/fallenden Erwartungen;
 *  weiterer Strike = geringere Prämie + mehr Kursspielraum, passend zu
 *  moderat steigenden Erwartungen) ins bestehende Strike-Kompromiss-
 *  Kriterium integriert. focus[] von 4 auf 6 Kriterien erweitert
 *  (Halteeignung + Dividenden-/Cashflow-Qualität neu vorangestellt),
 *  principle-Text um die "goldene Regel" und Etabliertheits-Aspekt ergänzt.
 *
 *  Version: 2.21.1 (03.09.2026) — CC-FOKUSKRITERIEN UM DIVIDENDEN-/
 *  CASHFLOW-QUALITAET ERGAENZT (Axel-Vorgabe, Praxis-Auswahlkriterium):
 *  bisherige 4 focus-Kriterien waren rein technisch (Strike-Kompromiss,
 *  HVP, Roll-Wahrscheinlichkeit, Cap-Risiko) — Dividendenqualitaet/
 *  Cashflow-Stabilitaet fehlte komplett, obwohl das laut Axel das
 *  tatsaechliche Praxis-Auswahlkriterium ist (CC meist auf bereits
 *  gehaltene oder gezielt zur Wheel-Fortfuehrung erworbene "buy-to-open"-
 *  Positionen, typischerweise Qualitaetstitel mit stabilem Cashflow und
 *  Dividende >=3%, nicht primaer reine Momentum-Kandidaten). Datenfelder
 *  (divYield, payoutRatio) bereits im Aggregator vorhanden — von der
 *  'dividend'-Strategie genutzt, hier erstmals fuer 'cc' aktiviert. Neues
 *  Kriterium in STRATEGIES.cc.focus[0] ergaenzt, principle-Text um das
 *  gehaltene-Position/Wheel-Fortfuehrung/Qualitaetstitel-Profil erweitert.
 *  WICHTIGE SCOPE-KLARSTELLUNG: diese Aenderung wirkt nur auf der Prompt-/
 *  Erklaerungsebene (wie die KI bereits ausgewaehlte Kandidaten in
 *  Abschnitt 4 beschreibt) — sie aendert NICHT die serverseitige
 *  Scanner-/Grade-Score-Logik in market_aggregator.py, die weiterhin
 *  bestimmt, WELCHE Titel ueberhaupt als Top-Kandidaten in Abschnitt 3
 *  auftauchen. Falls Dividendenqualitaet auch das Ranking/die Auswahl
 *  selbst beeinflussen soll (nicht nur die Beschreibung), waere das ein
 *  separater Scanner-seitiger Punkt, kein Prompt-Fix.
 *
 *  Version: 2.21.0 (03.09.2026) — VIERTE UND FÜNFTE STRATEGIE MIGRIERT:
 *  cc und collar (Public-Zweig) von _publicOptionsPrompt() auf
 *  _publicNinePointPrompt() umgestellt. Damit sind ALLE 5 Options-
 *  Strategien migriert (csp_wheel, atmna, weekly_income, cc, collar) —
 *  _publicOptionsPrompt() wird von keiner Strategie mehr aufgerufen,
 *  bleibt aber vorerst im Code (kein Cleanup in diesem Zyklus). BESONDERE
 *  RELEVANZ collar: einzige Strategie im holding_review-Modus — erster
 *  Live-Test dieses Zweigs im neuen 9-Punkte-Schema steht noch aus (bisher
 *  nur der scan-Zweig über die anderen 4 Strategien gehärtet). Beide
 *  Migrationen inkl. principle-Text (Buy-Write-Mechanik fuer cc; Put-Boden/
 *  Call-Finanzierung fuer collar, inkl. Klarstellung "keine Aussage ueber
 *  tatsaechlich gehaltene Position") sowie bestehender risikoBegriff/
 *  risikenText-Anpassungen (Ausuebung/Assignment statt Andienung, beide
 *  bereits vor der Migration korrekt) unveraendert uebernommen. maxWords
 *  cc 450→500, collar 350→400 (Puffer fuer principle-Block).
 *
 *  Version: 2.20.2 (03.09.2026) — TERMINOLOGIEFRAGE AUS v2.20.1 GEKLÄRT:
 *  Axel legte die Quelle vor (T.R. Lawrence, "Options Trading — How to
 *  Turn Every Friday Into Payday Using Weekly Options", Kap. 7 "The
 *  Weekly Cash KaChing Formula"). Mechanik-Abgleich bestätigt: UIQs
 *  weekly_income implementiert exakt Lawrences Formel (Long-Put-"Insurance"
 *  ~120 Tage unterhalb Kurs + woechentlicher ATM-Short-Put ~7-8 Tage,
 *  gerollt — Lawrences eigenes SCHW-Beispiel: Long $70/120T, Short $74
 *  ATM/7T). WICHTIGER NEBENFUND: das Buch selbst definiert in einem
 *  spaeteren, separaten Options-Theorie-Kapitel einen formalen "Long Put
 *  Diagonal Spread" MIT UMGEKEHRTER STRIKE-RICHTUNG (Long-Strike HOCH,
 *  Short-Strike NIEDRIG, als baerische Strategie) — strukturell das
 *  Gegenteil der KaChing-Formel (Long-Strike NIEDRIG, Short-Strike ATM/
 *  HOCH, neutral-bullische Einkommensstrategie). Die bisherige principle-
 *  Bezeichnung "Diagonal-Put-Spread-Strategie" waere fuer einen options-
 *  kundigen Leser dieses Buches potenziell irrefuehrend (falsche Strike-
 *  Richtungserwartung) — deshalb ersetzt durch explizite Quellenangabe
 *  ("Weekly Cash KaChing-Methode nach T.R. Lawrence") statt des
 *  zweideutigen Fachbegriffs, mit praeziserer struktureller Beschreibung
 *  (Strike-Differenz statt "Spread-Breite").
 *
 *  Version: 2.20.1 (03.09.2026) — VIER FUNDE AUS DEM ERSTEN WEEKLY_INCOME-
 *  LIVE-TEST MIT STRATEGIEPRINZIP GEHÄRTET, externes Reviewer-Feedback:
 *  (1) RSI ~30-40 NIEMALS "neutral" (Fund: "RSI-Werte (31,34,36) ...
 *  neutrale bis leicht schwache Lagen") — VOR Umsetzung geprüft: keine
 *  einheitliche RSI-Klassifikation im Aggregator vorhanden (3 verschiedene
 *  Scoring-Funktionen mit unterschiedlichen Schwellen 25/30/35/45/60/70/
 *  75) — deshalb BEWUSST KEINE starre 5-Stufen-Matrix uebernommen (Reviewer
 *  hatte eine vorgeschlagen), sondern nur die sicher belegbare Mindest-
 *  regel: unter 40 ist "neutral" in KEINER Aggregator-Funktion korrekt.
 *  (2) Gate-Regel um dritten Fund erweitert: gruene Momentum-/Breakout-/
 *  Swing-Gates implizieren KEINE Aussage ueber operative Zuverlaessigkeit
 *  von Rollvorgaengen oder Optionsliquiditaet (Fund: "...signalisieren,
 *  dass die strukturelle Voraussetzung fuer zuverlaessiges woechentliches
 *  Rollen ... gegeben ist"). (3) Abschnitt 1: "strukturelle Markt-
 *  belastungen sind nicht erkennbar" verboten (klingt wie umfassende
 *  Marktbeurteilung) — STATTDESSEN eng gefasst auf "keine spezifische
 *  systemische Belastung, die diese Strategie ausschliesst". (4) Abschnitt
 *  9: "profitiert von [Kennzahl]" verboten (impliziert einen von UIQ
 *  bewerteten Vorteil) — STATTDESSEN rein deskriptiv "weist die hoechste/
 *  niedrigste [Kennzahl] auf". OFFENE PRODUKTFRAGE, NICHT umgesetzt
 *  (Reviewer-Punkt 1, Axel-Entscheidung noch ausstehend): ob "CSP (Weekly)
 *  ist eine Diagonal-Put-Spread-Strategie" als UIQ-spezifische, vom
 *  klassischen CSP/Wheel-Verstaendnis abweichende Definition explizit
 *  gekennzeichnet werden soll — reine Terminologiefrage, kein Prompt-Bug.
 *
 *  Version: 2.20.0 (03.09.2026) — STATISCHES STRATEGIEPRINZIP + ABSCHNITT-
 *  2-SCHÄRFUNG (Axel-Idee: UIQ als dediziertes Coaching-Tool soll die
 *  Trading-Strategie am Anfang kurz vom Prinzip her erklären UND
 *  regelbasiert begründen, warum sie im aktuellen Regime mehr/weniger
 *  sinnvoll ist). Bewusst NICHT als KI-generierter 10. Abschnitt umgesetzt
 *  (Begründung: unnötige Tokens für etwas strukturell Statisches,
 *  Halluzinationsrisiko bei jedem Lauf neu, neue Angriffsflaeche fuer
 *  Compliance-Muster) — stattdessen zweigeteilt: (1) NEUER `principle`-
 *  Parameter in `_publicNinePointPrompt()`: statischer, von Axel/Claude
 *  einmal formulierter 2-3-Satz-Text pro Strategie, als PFLICHT-
 *  EINLEITUNG woertlich (NIEMALS umformulieren) vor Abschnitt 1 platziert,
 *  Ueberschrift "STRATEGIEPRINZIP". Fuer csp_wheel/atmna/weekly_income
 *  ergaenzt (die 3 bereits migrierten Strategien); die restlichen 11
 *  folgen mit ihrer jeweiligen Migration. Hinweis: eine echte, 100%
 *  driftfreie Loesung waere clientseitige Anzeige in index.html ausserhalb
 *  des LLM-Aufrufs — hier stattdessen nach dem bereits bewaehrten "PFLICHT-
 *  SATZMUSTER woertlich"-Muster umgesetzt (wie die Modell-Grenze-Regel),
 *  das in allen bisherigen Live-Tests zuverlaessig funktioniert hat, aber
 *  technisch nicht 100% garantiert ist. (2) Abschnitt 2 (Strategy Fit) um
 *  MECHANIK-BEZUG-Pflicht erweitert: "kompatibel"/"nicht ausgeschlossen" '
 *  allein reicht nicht mehr — die Antwort muss unter Rueckgriff auf das '
 *  STRATEGIEPRINZIP explizit benennen, WARUM das Regime die Strategie '
 *  mehr/weniger begünstigt (z.B. Volatilitaetsniveau → strukturelle '
 *  Praemienbasis), nicht nur das Gate-Ergebnis wiederholen. maxWords fuer '
 *  die 3 betroffenen Strategien von 450 auf 500 angehoben (Puffer fuer '
 *  den zusaetzlichen statischen Block).
 *
 *  Version: 2.19.8 (03.09.2026) — ERSTER WEEKLY_INCOME-LIVE-TEST: SEHR
 *  SAUBERER LAUF, keine neuen Rule-Violations. Wichtigste Bestätigung: die
 *  am 01.09. gefundene Model-Boundary/External-Validation-Vertauschung
 *  (damals als Output-Stochastik eingeordnet) tritt im neuen 9-Punkte-
 *  Schema NICHT wieder auf — Abschnitt 7/8 sauber getrennt, stützt die
 *  Hypothese aus dem v2.19.7-Changelog, dass die striktere Struktur diese
 *  Verwechslung strukturell verhindert. EIGENER FEHLER GEFUNDEN UND
 *  KORRIGIERT: die "Kein direkter Strike-Bezug"-Regel (seit v2.19.3/5)
 *  verbot "Strike-Niveau"-Erwaehnung bei Underlying-Indikatoren "auch in
 *  gehedgter/verneinter Form" — widersprach aber dem eigenen STATTDESSEN-
 *  Beispiel, das genau diese gehedgte Form nutzt ("...kann UIQ ohne
 *  Optionskettendaten nicht beurteilen"). Der Live-Output nutzte exakt
 *  dieses korrekte, gehedgte Muster — waere vom alten Scanner-Regex
 *  faelschlich als Verstoss geloggt worden. Regel klargestellt: verboten
 *  ist die KAUSALE/ASSERTIVE Verknuepfung (Indikator → Wirkung auf
 *  Strike), PFLICHT ist der explizite Kenntnis-Vorbehalt (Indikator →
 *  Risiko, getrennter Satz: "kann UIQ nicht beurteilen"). Scanner-Regex
 *  in ko-ai.js entsprechend praezisiert (negative Lookahead auf
 *  "beurteilen" im selben Satz) — gegen alle drei bekannten Faelle
 *  (2× Verstoss, 1× korrektes Muster) verifiziert.
 *
 *  Version: 2.19.7 (03.09.2026) — DRITTE STRATEGIE AUF 9-PUNKTE-SCHEMA
 *  MIGRIERT: weekly_income (Public-Zweig) von _publicOptionsPrompt() auf
 *  _publicNinePointPrompt() umgestellt (csp_wheel und atmna bereits
 *  gehärtet über mehrere Live-Test-Zyklen bis v2.19.6). Besondere
 *  Relevanz: weekly_income war die Strategie mit der am 01.09. entdeckten
 *  Model-Boundary/External-Validation-Vertauschung (damals als reine
 *  Output-Stochastik eingeordnet, kein Prompt-Bug, da der Code zu diesem
 *  Zeitpunkt wortidentisch mit csp_wheel/atmna/cc war) — mit dem neuen,
 *  strikter gelabelten 9-Punkte-Schema (Abschnitt 7 "Was UIQ ableiten
 *  kann" jetzt explizit von Abschnitt 8 "Modell-Grenze" getrennt) ist ein
 *  Wiederauftreten dieser spezifischen Verwechslung strukturell
 *  unwahrscheinlicher — im nächsten Live-Test gezielt gegenprüfen.
 *  marktumfeldFrage bereits sauber (kein "attraktiv"), keine proaktive
 *  Korrektur nötig.
 *
 *  Version: 2.19.6 (03.09.2026) — ZWEITER ATM/NA-LIVE-TEST: ALLE DREI
 *  v2.19.5-FIXES BESTAETIGT STABIL (kein "gehemmt", kein "verdichtet"/
 *  "komprimiert", kein Strike-Bezug aus RSI/D200 — erste erfolgreiche
 *  Regressionspruefung der Meta-Regel-Strategie). EIN neuer Fund: "das
 *  Modell bevorzugt trotzdem die Kombination aus stabiler Kurslage ... und
 *  nicht-panischen Volatilitaetsverhaeltnissen" (Abschnitt 2, Strategy
 *  Fit) — eine Modell-Praeferenz-Aussage AUSSERHALB des bisher bekannten
 *  Strike-/Aggressivitaets-Kontexts der TRADE-OFF-PRINZIP-Regel (29.08.).
 *  Bestehender COMPLIANCE_PATTERNS-Scanner-Regex in ko-ai.js war zu eng
 *  gefasst (verlangte "Modell bevorzugt/favorisiert die/den/eine" +
 *  spezifisches Adjektiv direkt danach) und liess "Modell bevorzugt
 *  trotzdem die Kombination aus..." durch (zwei Luecken: "trotzdem"
 *  zwischen bevorzugt/die, UND "Kombination" statt der vier erwarteten
 *  Adjektive) — Regex verbreitert auf blosses "Modell (favorisiert|
 *  bevorzugt)" ohne Objekt-Einschraenkung. TRADE-OFF-PRINZIP-Regel in
 *  ko-prompts.js um diesen zweiten Beleg erweitert: gilt jetzt explizit
 *  generisch fuer jede Markt-/Regime-Praeferenzaussage, nicht nur fuer
 *  Options-Stellschrauben.
 *
 *  Version: 2.19.5 (03.09.2026) — SYNONYM-UMGEHUNGS-MUSTER erkannt und
 *  gehärtet, nach parallelen Live-Tests von csp_wheel (4. Lauf) und atmna
 *  (1. Lauf, direkt nach Migration in v2.19.4). DREI Funde: (1)
 *  "verdichtete Volatilitätsbedingungen" statt "komprimiert" — zweiter
 *  Beleg zur bestehenden VIX-Regel ergänzt. (2) "wird ... nicht '
 *  strukturell gehemmt" statt "keine strukturellen Hemmnisse" — Verb '
 *  statt Nomen, gleiche verbotene Bedeutung. (3) DRITTER Fund fuer D200/'
 *  RSI→Strike-Annäherung (atmna-Lauf: "D200-Abstand ... bei einer '
 *  Korrektur zu schnellerer Strike-Annäherung führen kann", fast '
 *  wortgleich mit dem bereits zweifach belegten CSP/Wheel-Fund) — trotz '
 *  Guardrail-Regel mit zwei Beispielen erneut aufgetreten, deshalb jetzt '
 *  zusätzlich direkt in Abschnitt 5's eigenem Template verankert '
 *  (Proximity-Fix), nicht nur in der allgemeinen Guardrail. NEUE '
 *  ALLGEMEINE META-REGEL ergänzt: die bereits seit laengerem bestehende '
 *  abstrakte Klausel ("auch neue, hier nicht genannte Formulierungen mit '
 *  demselben Sinn sind verboten") wurde nachweislich zweimal am selben '
 *  Tag durch Synonym-Wahl umgangen — jetzt mit den zwei konkreten '
 *  Belegfällen und einer expliziten Selbstpruef-Frage verstärkt '
 *  ("dieselbe Bedeutung mit anderem Wortstamm?"). Scanner-Nachzug in '
 *  ko-ai.js: drei neue COMPLIANCE_PATTERNS (verdichtet, gehemmt, Strike-'
 *  Annäherung/-Niveau). ATM/NA-Lauf zusätzlich bestätigt: kein '
 *  faelschliches "ATM-orientiert"-Verbot ausgeloest (korrekt, da der '
 *  Strategienname selbst "ATM" enthaelt) — die stratName-Kopplung der '
 *  Regel funktioniert wie vorgesehen.
 *
 *  Version: 2.19.4 (03.09.2026) — ZWEITE STRATEGIE AUF 9-PUNKTE-SCHEMA
 *  MIGRIERT: atmna (Public-Zweig) von _publicOptionsPrompt() auf
 *  _publicNinePointPrompt() umgestellt (csp_wheel bereits seit v2.19.0,
 *  über drei Live-Test-Zyklen gehärtet bis v2.19.3). ATM-Verbot in
 *  Abschnitt 2 greift fuer atmna korrekt NICHT (an stratName gekoppelt,
 *  "CSP (ATM/NA)-Setups" enthaelt woertlich "ATM"). PROAKTIVER FUND beim
 *  Wiring (kein Live-Test noetig, direkt im Code sichtbar): atmnas
 *  marktumfeldFrage enthielt woertlich "attraktiv" ("Sind ATM-CSPs beim
 *  aktuellen VIX-Niveau strukturell attraktiv?") — genau das seit 01.09.
 *  gehaertete Wort, haette das Modell in Abschnitt 2 vermutlich direkt zur
 *  Wiederholung verleitet. Korrigiert auf "strukturell guenstig"
 *  (konsistent mit allen anderen 13 Strategien — Stichprobe aller
 *  marktumfeldFrage-Werte durchgefuehrt, kein weiteres Vorkommen von
 *  "attraktiv" gefunden).
 *
 *  Version: 2.19.3 (03.09.2026) — DRITTER 9-PUNKTE-LIVE-TEST (csp_wheel,
 *  nach v2.19.2): DREI der fuenf v2.19.2-Fixes bestaetigt wirksam (VIX≠
 *  komprimiert, IV-Crush-Externalisierung, Abschnitt-9-Differenzierung —
 *  alle sauber). ZWEI Fixes aus v2.19.1/2 jedoch ERNEUT VERLETZT, wortwoertlich
 *  in derselben Formulierung wie beim urspruenglichen Fund: "keine
 *  strukturellen Hemmnisse" UND "ATM-orientierte Theta-Strategien" —
 *  beide im selben Satz in Abschnitt 2. Gleiches Grundmuster wie
 *  attraktiv/Praemienerwartung/maximiert: ein Verbot allein in der
 *  allgemeinen PUBLIC_REGULATORY_GUARDRAIL (weit oben im Prompt) reicht
 *  nicht, wenn die Verletzung an einer spezifischen Stelle (hier:
 *  Abschnitt 2) auftritt — deshalb jetzt zusaetzlich direkt in Abschnitt
 *  2's eigenem Template-Text verankert (Salienz durch Naehe), PLUS zwei
 *  neue COMPLIANCE_PATTERNS-Scanner-Eintraege in ko-ai.js fuer beide
 *  Formulierungen (reine Sichtbarkeit, kein Blocking). Zusaetzlich: ein
 *  ZWEITER Beleg fuer "Kein direkter Strike-Bezug aus Underlying-
 *  Signalen" — diesmal mit D200 statt RSI ("D200-Abstand ... schnellerer
 *  Strike-Annaeherung") — bestaetigt, dass die Regel generisch fuer JEDEN
 *  Underlying-Indikator gilt, nicht nur RSI; entsprechendes zweites
 *  Beispiel in der Regel ergaenzt.
 *
 *  Version: 2.19.2 (03.09.2026) — FÜNF FUNDE AUS DEM ZWEITEN 9-PUNKTE-
 *  LIVE-TEST (csp_wheel, nach v2.19.1) GEHÄRTET, externes Reviewer-
 *  Feedback bestätigt 4/5 der v2.19.1-Fixes als wirksam (HVP, Grade,
 *  Ranking-Attribution, D200 — alle sauber). Fünf neue, kleinere Funde:
 *  (1) Gate-Regel erweitert um "keine strukturellen Hemmnisse" (zweiter
 *  belegter Fund trotz erster Guardrail-Runde — klingt weiterhin zu
 *  positiv/absolut), Pflichtformulierung "wird vom aktuellen Regime nicht
 *  ausgeschlossen" ergänzt. (2) NEUE REGEL VIX-Niveau ≠ "komprimiert" (Fund:
 *  "VIX 15.42 ... komprimierter Volatilitätszustand" — "komprimiert" ist
 *  reserviert für HVP-relative Aussagen, nicht für einen VIX-Absolutwert).
 *  (3) NEUE REGEL "Kein direkter Strike-Bezug aus reinen Underlying-
 *  Signalen" (Fund: "RSI ... eine Kursbewegung unterhalb eines gewählten
 *  Strike-Niveaus kann damit nicht ausgeschlossen werden" — RSI beschreibt
 *  Underlying-Risiko, UIQ kennt keinen konkreten Strike; zweistufige
 *  Pflichtformulierung mit explizitem Kenntnis-Vorbehalt ergänzt). (4)
 *  Abschnitt 5 (Gegenargumente/Risiken) für Options-Strategien umformuliert:
 *  IV-Crush/Earnings/Liquidität jetzt als EXTERNE, von UIQ nicht bewertete
 *  Risikofaktoren gekennzeichnet statt als "Downside-Risiko-Indikatoren des
 *  Modells, die sich erhöhen, wenn X auftritt" (UIQ hat keine Live-IV-/
 *  Optionskettendaten und kann einen künftigen IV-Crush nicht erkennen —
 *  die alte Formulierung implizierte das Gegenteil). (5) Abschnitt 9
 *  (Entscheidungsrahmen) um einen leichten Hinweis auf differenzierende
 *  Kurzsynthese je Titel ergänzt (weiche Qualitätsverbesserung, kein
 *  Regelverstoß — Reviewer empfand den bisherigen Text als "noch zu
 *  generisch"). BEWUSST NICHT ANGEFASST: die vom Reviewer beschriebene
 *  "hohe HVP → attraktive Prämien → hoher CSP-Fit"-Kausalitätsfrage — auf
 *  seinen eigenen ausdrücklichen Rat zurückgestellt, bis alle 14 Strategien
 *  im 9-Punkte-Schema laufen und sich zeigt, ob es ein systemisches
 *  Aggregator- oder ein rein sprachliches Interpretationsproblem ist.
 *
 *  Version: 2.19.1 (03.09.2026) — SECHS FUNDE AUS DEM ERSTEN 9-PUNKTE-
 *  LIVE-TEST (csp_wheel) GEHÄRTET, externes Reviewer-Feedback: (1) NEUE
 *  REGEL Grade ≠ Fundamentals (Fund: "B-Einstufung deutet auf stabile
 *  Fundamentals hin" — Grade ist reiner UIQ-interner Fit-Indikator). (2)
 *  NEUE REGEL Gate ≠ Performance-Prognose (Fund: gruene Gates wurden zu
 *  "strukturell ruhiges Szenario fuer Praemien-Einkommen" verdichtet). (3)
 *  NEUE REGEL Strategy Fit ≠ Strike-Moneyness (Fund: CSP/Wheel-Output
 *  sprach faelschlich von "ATM-orientierten Theta-Setups" — ATM ist keine
 *  CSP/Wheel-Eigenschaft, sondern Name einer eigenen Schwester-Strategie).
 *  (4) KAUSALITAETS-INTEGRITAET um konkretes D200-Beispiel erweitert
 *  (Fund: "positiver D200-Abstand → Gewinnmitnahmen → erhoehtes Downside-
 *  Risiko" ohne Stuetzsignal — Regel existierte bereits, wurde live
 *  verletzt, gleiches Muster wie maximiert/optimiert). (5) Strike-Abstand
 *  vs. EMA200-Abstand im Trade-off-Abschnitt (6) fuer Options-Strategien
 *  explizit entwirrt (Fund: "Puffer zur EMA200" statt Strike-Puffer —
 *  vermutlich durch die eigene csp_wheel-Fokuskriterie ausgeloest, die
 *  beide Konzepte im selben Satz nennt). (6) EIGENER FEHLER KORRIGIERT:
 *  der scan-Zweig von _publicNinePointPrompt() (Abschnitt 3, seit v2.19.0)
 *  verlangte gleichzeitig die Ueberschrift "HÖCHSTE...STRATEGY-FITS" UND
 *  die Pflichtformulierung "Reihenfolge ohne Wertung" — ein direkter
 *  Widerspruch, der im ersten Live-Test prompt sichtbar wurde. Aufgeloest
 *  zugunsten von Reviewer-Option A (Rangfolge existiert tatsaechlich im
 *  UIQ-Kriterien-Score, daher offen benennen UND attribuieren statt sie
 *  zu verschleiern) — NUR im scan-Zweig; der holding_review-Zweig (Collar)
 *  behaelt bewusst "Reihenfolge ohne Wertung", da dort eine implizite
 *  Priorisierung bestehender Positionen ein anderes regulatorisches
 *  Risiko waere als eine reine Kriterien-Scan-Rangfolge.
 *
 *  Version: 2.19.0 (03.09.2026) — 9-PUNKTE-SCHEMA-SPRINT GESTARTET
 *  (externes Reviewer-Feedback, Axel-Entscheidung 02.09.: Scope auf alle
 *  14 Strategien statt nur der 5 Options-Strategien erweitert). Neue
 *  gemeinsame Funktion _publicNinePointPrompt() ersetzt schrittweise
 *  _publicOptionsPrompt() UND _publicEquityPrompt() (beide bleiben
 *  vorerst als Fallback fuer noch nicht migrierte Strategien bestehen).
 *  Zwei zentrale Design-Entscheidungen (Axel, 03.09.2026): (1) EIN
 *  gemeinsamer Block je Abschnitt (4-8) fuer ALLE genannten Kandidaten
 *  zusammen (Reviewer-Referenzmodell) — NICHT pro Kandidat wiederholt wie
 *  im bisherigen a-d-Schema, haelt den Output ueber alle 14 Strategien
 *  handhabbar in der Laenge. (2) "Geringer Fit"/"Beobachtungsliste"
 *  (Ausschluss-Kandidaten) als kurzer Absatz am Ende von Abschnitt 3
 *  integriert, kein eigener 10. Abschnitt — Begruendung: das eigene
 *  Konsistenz-Versprechen des Sprints ("wie ein konsistentes DSS"), nicht
 *  9-oder-manchmal-10. Struktur: 1. Markt-/Regime-Kontext (neu, generisch,
 *  strategieunabhaengig) → 2. Strategy Fit (bisheriges "MARKTUMFELD"/
 *  o.marktumfeldFrage hierher verschoben — war strategiespezifisch, gehoert
 *  strukturell zu Strategy Fit, nicht zu Punkt 1) → 3. Kandidaten (inkl.
 *  Ausschluss-Absatz) → 4. Positive Modellfaktoren → 5. Gegenargumente/
 *  Risiken → 6. Strategischer Trade-off → 7. Was UIQ ableiten kann (NEU —
 *  existierte bisher nicht explizit) → 8. Modell-Grenze (bisher "d)") →
 *  9. Entscheidungsrahmen. Alle bestehenden BEGRIFFS-INTEGRITAET-Regeln
 *  (HVP, RSI, Andienungswahrscheinlichkeit), das maximiert-/optimiert-
 *  Beispielpaar und die Ranking-Vermeidungs-Pflichtformulierung
 *  ("Reihenfolge ohne Wertung") wurden uebernommen bzw. — bei Equity, wo
 *  sie bisher fehlten — erstmals ergaenzt. istOptionsStrategie-Flag
 *  steuert die wenigen inhaltlichen Unterschiede (Options-Risikobegriffe
 *  vs. Markt-/Sektor-/Datenrisiko bei Equity). ERSTER MIGRATIONSTEST:
 *  csp_wheel (Public-Zweig) auf _publicNinePointPrompt() umgestellt —
 *  naechster Schritt: Live-Test, dann schrittweise Migration der
 *  restlichen 13 Strategien.
 *
 *  Version: 2.18.3 (03.09.2026) — ZWEI FUNDE AUS RE-REVIEW DES CSP-ATM/NA-
 *  LIVE-TESTS VOM 02.09. GEHÄRTET (Priorität 0 + 1 des Zyklus): (1) NEUE
 *  REGEL "KEINE ABGELEITETE ANDIENUNGS-/AUSUEBUNGSWAHRSCHEINLICHKEIT AUS
 *  INDIKATORWERTEN" ergänzt (belegter Fund: "RSI 75 ... deutet eine
 *  erhoehte Andienungswahrscheinlichkeit an") — ein Indikatorwert
 *  beschreibt ein Kursrisiko, niemals direkt eine Assignment-
 *  Wahrscheinlichkeit; Kausal-Konditional-Pflichtformulierung ergänzt,
 *  direkt neben der bestehenden Ausuebungs-/Andienungsrisiko-Regel. (2)
 *  KONKRETES BEISPIELPAAR für das bereits seit 29.08. bestehende
 *  "maximiert"/"optimiert"-Wortverbot in Abschnitt c) "Strategischer
 *  Zielkonflikt" ergänzt (beide Zweige: holding_review UND scan) —
 *  belegter Fund 02.09.: das Verbot existierte bereits im Prompt, wurde
 *  aber trotzdem live verletzt ("Ein näherer ATM-Strike maximiert die
 *  verfügbare Prämie") — strukturell derselbe "Wortverbot allein reicht
 *  nicht"-Befund wie attraktiv/Prämienerwartung am 01.09., gleiche
 *  Gegenmaßnahme (Salienz durch konkretes NIEMALS/STATTDESSEN-Beispiel
 *  direkt an der Stelle, nicht nur als abstraktes Verbot). Scanner-
 *  Nachzug in ko-ai.js parallel: COMPLIANCE_PATTERNS um Verbform
 *  maximiert/optimiert (bisher nur Adjektiv "optimal" erfasst) sowie
 *  Andienungs-/Ausübungswahrscheinlichkeit ergänzt.
 *
 *  Version: 2.18.2 (02.09.2026) — RSI-BEGRIFFS-INTEGRITAET (externes
 *  Reviewer-Feedback zum CSP-ATM/NA-Live-Test 02.09.): zweifacher belegter
 *  Fund im selben Output (COP, LPG) — RSI 70/77 (UEBERKAUFT) wurde als
 *  "kurzfristige Ueberverkauftheit" bezeichnet, das GEGENTEIL. Strukturell
 *  identisch zum HVP-Richtungsfehler vom 29./30.08. (Bedeutungsumkehr statt
 *  Ungenauigkeit): die Folgeaussage ("Gegenbewegung nicht auszuschliessen")
 *  war inhaltlich korrekt, nur das Etikett verkehrt — analoge BEGRIFFS-
 *  INTEGRITAET-Regel direkt neben der HVP-Regel in
 *  PUBLIC_REGULATORY_GUARDRAIL ergaenzt, wirkt fuer alle 14 Strategien
 *  (Equity + Options teilen dieselbe Guardrail). Bewusst NICHT Teil dieses
 *  Fixes: die vom Reviewer vorgeschlagene serverseitige RSI-Vorklassifi-
 *  zierung (overbought/oversold/neutral als bereits gelabeltes Aggregator-
 *  Feld statt Modell-Interpretation) — das ist ein Architektur-Punkt fuer
 *  den geplanten 9-Punkte-Schema-Sprint, kein Quick-Fix.
 *
 *  Version: 2.18.1 (02.09.2026) — ZWEI HARTNAECKIGE COMPLIANCE-FUNDE
 *  AUS ÜBERGABEPROTOKOLL 01.09. GEHÄRTET (Priorität 0 + 1.1 des Zyklus):
 *  (1) HVP-KOMPRESSIONSREGEL AUF SCAN-ZWEIG AUSGEWEITET: die Regel war
 *  seit 30.08. nur im holding_review-Zweig von _publicOptionsPrompt()
 *  verankert (Collar) — csp_wheel/atmna/weekly_income/cc teilen sich den
 *  scan-Zweig und hatten die Regel dadurch strukturell nie erhalten, nicht
 *  vier separate Lücken, sondern EINE gemeinsame. Live-Beleg 01.09.: atmna
 *  bestätigt fehlend. (2) GUARDRAIL-VERSTÄRKUNG "attraktiv"/"Praemien-
 *  erwartung": direktes NIEMALS/STATTDESSEN-Beispielpaar unmittelbar neben
 *  der Wortliste in PUBLIC_REGULATORY_GUARDRAIL ergänzt (nicht nur weit
 *  unten im Prompt wie das bestehende Praemienerwartung-Beispiel) — Auslöser
 *  war die 4-fache/2-fache Wiederholung beider Begriffe am 01.09. trotz
 *  bestehendem Wortverbot. Bewusst NICHT Teil dieses Fixes: eine geteilte
 *  9-Punkte-Prompt-Architektur für alle 14 Strategien bleibt eigener,
 *  separat zu planender Sprint (Reviewer-Vorschlag 30.08., Scope am
 *  02.09. auf Equity-Strategien erweitert) — s. Übergabeprotokoll 02.09.
 *
 *  Version: 2.18.0 (31.08.2026) — COLLAR risikoBegriff/risikenText
 *  (Priorität 3 aus Übergabeprotokoll 30.08. §8, analog zum CC-Fund vom
 *  29.08.). Collar nutzte bislang den generischen Fallback "Andienung"
 *  in AUFGABE-Punkt 4 (RISIKEN) — begrifflich falsch für eine Struktur
 *  mit zwei unterschiedlichen Seiten: Protective Put (Kauf, kein
 *  Andienungsrisiko, nur Prämienkosten) vs. voller Collar (zusätzlicher
 *  Short Call, CC-analoges Ausübungsrisiko auf der Call-Seite). Neuer
 *  risikoBegriff + risikenText in STRATEGIES.collar.prompt(), Public-
 *  Zweig — trennt beide Fälle explizit, ersetzt "Andienung" durch
 *  "Ausübung/Assignment des Short Calls beim vollen Collar". EIC-Zweig
 *  unverändert (nutzt bereits eigene, korrekte Formulierungen ohne
 *  "Andienung"-Fallback). Nur collar geändert, isoliert verifiziert.
 *
 *  Version: 2.17.0 (31.08.2026) — EXTERNES REVIEWER-FEEDBACK ZU COLLAR-
 *  LIVE-TEST-2 EINGEARBEITET (s. Übergabeprotokoll 30.08. §6), bevor
 *  weitere Live-Test-Zyklen laufen. Sieben Punkte, alle collar-bezogen:
 *  (1) NEUER PFLICHT-TRENNSATZ Marktrisiko vs. Positionsrisiko, direkt
 *  nach der Überschrift in AUFGABE-Punkt 2 (holding_review), VOR der
 *  Titelliste — Reviewer stuft ihn als staerksten bislang ungenutzten
 *  Satz fuer UIQ ein ("Der Absicherungs-Hinweis stellt keine Aussage
 *  darueber dar, dass eine Position verkauft oder abgesichert werden
 *  sollte..."). Bewusst als eigener Pflicht-Satz VOR der Liste
 *  platziert, nicht nur in der Rolle — Lehre aus dem 30.08.-Fund (5.2):
 *  das Modell folgt der AUFGABE-Struktur, nicht der Rollenbeschreibung.
 *  (2) RANKING-ANMUTUNGS-FIX: reine Namensaufzaehlung ("LMT / PH / NUE")
 *  erzeugte trotz entfernter Ranking-Sprache weiterhin einen Ranking-
 *  Eindruck durch die Listenform allein. Fix: Pflichtvorgabe, die Titel
 *  in einen Fliesstext-Rahmen einzubetten ("Folgende Titel erfuellen
 *  die Modellkriterien fuer eine Absicherungsueberpruefung, Reihenfolge
 *  ohne Wertung: ..."), keine blosse Aufzaehlung.
 *  (3) HVP-KOMPRESSIONS-REGEL VERSCHAERFT: bestehende BEGRIFFS-
 *  INTEGRITAET-Regel (seit 29.08., s.u.) reichte laut zwei unabhaengigen
 *  Live-Belegen (30.08., beide NUE/HVP95%) allein nicht aus — Wortverbot
 *  ohne strukturelle Verankerung wird vom Modell nicht zuverlaessig
 *  befolgt. Zusaetzlich als PFLICHT-SATZMUSTER in die HVP-Bewertung
 *  jeder Absicherungs-Kandidatenzeile aufgenommen (b) Risikofaktoren)
 *  statt nur als allgemeines Verbot weiter oben im Prompt.
 *  (4) RSI-KOMBINATIONSLOGIK KORRIGIERT (STRATEGIES.collar.focus[0] +
 *  EIC-Zweig): "RSI niedrig + Protective Put" allein war konzeptionell
 *  widerspruechlich (ein bereits gefallener Titel braucht nicht
 *  automatisch mehr Absicherung). Kriterium jetzt explizit als
 *  Kombination: RSI (hoch ODER niedrig) NUR in Verbindung mit hoher HVP
 *  UND strukturell intaktem uebergeordnetem Trend, nie RSI allein.
 *  (5) "GEWINNMITNAHME" ERSETZT — unterstellte implizit bereits
 *  realisierten Gewinn, den UIQ nicht kennt. Neu: "gezielte Ueberpruefung
 *  des Absicherungsbedarfs bei gehaltenen Positionen mit ausgepraegter
 *  kurzfristiger Kursbewegung" (Public-Fokuskriterium + EIC-Zweig).
 *  (6) "Strategy Fit"-Vermeidung bei Collar (s. v2.16.0 §5.3) vom
 *  Reviewer explizit bestaetigt — keine Aenderung noetig, nur notiert.
 *  (7) "MODEL DECISION BOUNDARY" als formales Element: bestehender
 *  Punkt d) "Modell-Grenze:" bereits strukturell eigenstaendig und
 *  pflicht-satzmuster-gebunden — deckt die Reviewer-Absicht inhaltlich
 *  ab, keine Aenderung noetig. Das groessere 9-Punkte-Schema fuer alle
 *  vier Options-Strategien (Reviewer-Strukturvorschlag) ist AUSSERHALB
 *  des heutigen Scopes — vom Reviewer selbst als eigener, groesserer
 *  Qualitaetssprung eingestuft, nicht Teil eines Einzel-Prompt-Zyklus.
 *  Nur collar geaendert, alle 4 scan-Strategien unveraendert (isoliert
 *  verifiziert).
 *
 *  Version: 2.16.0 (30.08.2026) — COLLAR-LIVE-TEST NACH MODE-ACHSE, AUFGABE-
 *  STRUKTUR NACHGEZOGEN: v2.15.0s mode='holding_review' aenderte nur den
 *  einleitenden rolle-Satz — der Live-Test (echter Collar-Button-Klick,
 *  30.08.2026) zeigte einen strukturell unveraenderten Scan-Output ("HÖCHSTE
 *  STRATEGY-FITS", 3 Titel gerankt aus dem Universum) OHNE jede Spur der
 *  neuen Sprachregel. Root Cause: das Modell folgt der konkreten AUFGABE-
 *  Formulierung (Punkt 2: "Welche 3 Titel weisen die höchste Kriterien-
 *  Übereinstimmung auf?"), nicht der einleitenden Rollenbeschreibung — exakt
 *  dieselbe Fehlerklasse wie der 28.08.-Fund (eingebetteter EIC-Block
 *  widersprach dem System-Prompt, Modell folgte der konkreteren Anweisung).
 *  Fix: AUFGABE-Punkte 2/3/5 in _publicOptionsPrompt() jetzt nach mode
 *  verzweigt. holding_review bekommt eigene Formulierungen ("TITEL MIT
 *  MODELLBASIERTEM ABSICHERUNGS-HINWEIS" statt "HÖCHSTE ... STRATEGY-FITS",
 *  "liefern die Modellkriterien einen Hinweis, eine — falls gehaltene —
 *  Position hinsichtlich Absicherung zu überprüfen?" statt Ranking-Sprache,
 *  "KEIN MODELLBASIERTER ABSICHERUNGS-HINWEIS" statt "GERINGER STRATEGY FIT",
 *  Zusammenfassung ohne "höchste Übereinstimmung"-Formulierung) — bei
 *  identischer a-d-Struktur, identischen Pflicht-Satzmustern (Trade-off,
 *  Modell-Grenze) und identischen Bewertungskriterien wie scan. scan-Modus
 *  (csp_wheel/atmna/weekly_income/cc) strukturell unveraendert — per
 *  isolierter Funktionsausfuehrung verifiziert (alle 4 weiterhin exakt die
 *  alte "HÖCHSTE ... STRATEGY-FITS"-Formulierung, keine der neuen
 *  holding_review-Formulierungen).
 *
 *  Version: 2.15.0 (30.08.2026) — MODE-ACHSE + VERSION-DRIFT-FIX:
 *  (1) Neuer optionaler Parameter `mode` ('scan'|'holding_review'|
 *  'structure_selection') fuer _publicOptionsPrompt(), als lokale Variable
 *  am Anfang jeder der 5 Options-Strategie-Prompt-Funktionen deklariert und
 *  fuer Public UND EIC-Zweig sichtbar (Axel-Entscheidung 30.08.2026).
 *  csp_wheel/atmna/weekly_income/cc: mode='scan' (unveraendertes Verhalten).
 *  collar: mode='holding_review' — Public-Zweig bekommt zusaetzliche
 *  Sprachregel ("falls du haeltst" statt "deine Position"), da UIQ im
 *  Public-Modus keinen Zugriff auf echte Nutzerpositionen hat (24.08.-
 *  Vertraulichkeitsentscheidung); EIC-Zweig nur als Marker, keine
 *  Verhaltensaenderung ("Bestandspositionen" dort schon explizit verankert).
 *  'structure_selection' bewusst nur reserviert, keine Builder-Logik —
 *  Regeln folgen mit Options-Modul-Start (Multi-Leg/Iron Condor etc.).
 *  (2) VERSION-Drift-Fix: die exportierte KoPrompts.VERSION-Konstante stand
 *  seit dem gesamten gestrigen Regulatory-Umbau (v2.6.0→v2.14.0, neun
 *  Versionssprünge, alle 29.08.2026) unveraendert auf '2.5.7' — der
 *  Datei-Header wurde jedes Mal aktualisiert, die tatsaechlich von
 *  console.log() ausgelesene Konstante nicht. Live per Browser-Konsole
 *  bestaetigt (Axel-Fund, 30.08.2026): Funktionscode war die ganze Zeit
 *  aktuell, nur die Selbstauskunft war falsch. Jetzt synchronisiert.
 *
 *  Version: 2.14.0 (29.08.2026) — COLLAR-LIVE-TEST, HVP-RICHTUNGSFEHLER
 *  (letzter Fund des Tages): (1) WICHTIGSTER FUND — "HVP 96% zeigt
 *  Volatilitaetskompression" ist FAKTISCH FALSCH und erschien konsistent in
 *  MEHREREN Strategien (CSP/Wheel, CC, Collar) heute, obwohl nirgends im
 *  Prompt-Text so vorgegeben — reines LLM-Fehlkonzept, jetzt explizit
 *  gegengesteuert: hoher HVP = hohe realisierte Vol relativ zur Historie,
 *  nicht "komprimiert". (2) Neue Regel Beobachtung-vs-Einordnung bei
 *  Extremwerten: ein Extremwert darf nicht direkt zu einer einseitigen
 *  strategischen Interpretation ("klassisches Absicherungs-Setup") fuehren
 *  — Pflicht: Beobachtung + zweiseitige Einordnung (spricht fuer UND
 *  erhoehte Gegenbewegungs-Wahrscheinlichkeit). (3) "praemieneffiziente
 *  Absicherungsstruktur"/"rechtfertigt [Massnahme]" als weitere Variante
 *  der oekonomischen Tatsachenbehauptung verboten. (4) "strukturell
 *  unnoetig" bei Regime-Einschaetzungen verboten (klingt wie Handlungs-
 *  freigabe) — Pflichtformulierung inkl. explizitem "Modell bildet
 *  individuelle Ziele nicht ab"-Zusatz. Reviewer-Kernpunkte 1 (Trade-off/
 *  Modell-Grenze) und 5 (Collar-eigener Praemien/Upside-Zielkonflikt) waren
 *  bereits gut — keine Aenderung noetig, nur bestaetigt. Punkt 7 (gemeinsamer
 *  "UIQ Options Coaching Standard" ueber alle 4 Options-Strategien) bewusst
 *  NICHT in diesem Commit umgesetzt — Architektur-Aufgabe fuer naechste
 *  Session, s. UEBERGABE-2026-08-29.md.
 *  Version: 2.13.0 (29.08.2026) — COACHING-STRUKTUR-UPGRADE (Reviewer-
 *  Kernvorschlag zweiter CC-Live-Test: nicht mehr entschaerfen, sondern die
 *  gewonnene regulatorische Distanz fuer besseres Coaching nutzen). Der
 *  Reviewer schlug ein 8-teiliges Zielmuster vor: Market Context → Strategy
 *  Fit → Positive Factors → Risk Factors → Strategic Trade-offs → Modell-
 *  Grenze → External Validation → Summary. Umsetzung in
 *  _publicOptionsPrompt Sektion 2: Trade-off ("Strategischer Zielkonflikt:")
 *  und Modell-Grenze ("Modell-Grenze:") sind jetzt PFLICHT-GELABELTE
 *  Unterpunkte je Kandidat, nicht mehr nur beilaeufige Prosa — das war die
 *  Fehlerquelle fuer "maximiert" (Superlativ in freier Formulierung) und
 *  "beide Richtungen sind haltbar" (freie Paraphrase statt Pflichtsatz).
 *  Neu: (1) "maximiert"/"optimiert" in Zielkonflikt-Gegenueberstellungen
 *  verboten, neutrale "ist verbunden mit X, waehrend Y bedeutet"-Formel
 *  erzwungen; (2) Pflicht-Satzmuster fuer Modell-Grenze woertlich
 *  vorgegeben; (3) Sektion-3-Ueberschrift von "GERINGER UIQ STRATEGY FIT /
 *  AUSSCHLUSS NACH MODELLKRITERIEN" auf "GERINGER STRATEGY FIT NACH
 *  MODELLKRITERIEN" verkuerzt ("Ausschluss" klingt nach Handelsverbot, s.
 *  Reviewer-Punkt 5); (4) neuer Parameter o.risikoBegriff/o.risikenText fuer
 *  strategie-spezifische Risiko-Terminologie — cc nutzt jetzt "Ausübung/
 *  Assignment des Short Calls" statt des CSP-spezifischen "Andienung"
 *  (Reviewer-Punkt 6: Andienung ist Put-Assignment bei Kursverfall,
 *  Covered-Call-Risiko ist Call-Assignment bei Kursanstieg — entgegen-
 *  gesetzte Richtung, falscher Begriff waere ein Begriffs-Integritaets-
 *  Fehler analog zum HVP/IV-Fund); (5) Upside-Cap-Zielkonflikt (Praemie vs.
 *  gedeckeltes Aufwaertspotenzial) als explizit zu erklaerender Kernpunkt
 *  fuer Covered Call verankert, nicht nur Randrisiko.
 *  Version: 2.12.0 (29.08.2026) — CC-LIVE-TEST, TRADE-OFF-PRINZIP (neue
 *  Kernregel statt weiterer Wortverbote): externer Review des Covered-Call-
 *  Outputs zeigte einen neuen Fehlertyp — "Modell favorisiert/bevorzugt
 *  [Strike-Bereich]" und "wird vom Modell als günstiges Prämien-Umfeld
 *  bewertet" sind indirekte Optionsentscheidungen bzw. oekonomische
 *  Tatsachenbehauptungen, ohne dass ein einzelnes verbotenes Wort vorkommt.
 *  Reviewer-Kernidee: UIQ soll nicht mehr "Was soll ich tun?" beantworten,
 *  sondern "Welche Eigenschaften machen dieses Setup interessant — und
 *  welche Zielkonflikte bestehen?" (Trade-off-/Coaching-Sprache statt
 *  Praeferenz-Sprache). Fix: (1) neuer Regelblock TRADE-OFF-PRINZIP in
 *  PUBLIC_REGULATORY_GUARDRAIL — bei Strike-/Laufzeit-/Aggressivitaets-
 *  Aussagen IMMER beide Seiten des Zielkonflikts beschreiben, nie eine
 *  Richtung bevorzugen, mit Pflicht-Satzmuster + Vorher/Nachher-Beispiel
 *  aus dem Reviewer-Text; (2) "Modell bevorzugt/favorisiert" nur noch auf
 *  Aggregatebene (Titel-Ranking) erlaubt, nicht mehr auf Parameterebene
 *  (Strike-Wahl); (3) oekonomische-Tatsachenbehauptung-Verbot ("guenstiges
 *  Praemien-Umfeld", "reduziert die Gefahr") mit Pflicht-Ersatz "erhoehter
 *  Strategy Fit"/"wird beruecksichtigt, individuelles Risiko nicht
 *  ableitbar"; (4) Sektion-2-Ueberschrift in beiden Optionsstrategien jetzt
 *  mit exaktem Pflichttext "HÖCHSTE [STRATEGIE] STRATEGY-FITS" erzwungen
 *  (Live-Output hatte trotz Instruktion "SETUP-FIT" eigenmaechtig "TOP 3
 *  [STRATEGIE]-KANDIDATEN" gewaehlt — Beleg, dass unpraezise Ueberschriften-
 *  Vorgaben vom Modell umformuliert werden).
 *  Version: 2.11.0 (29.08.2026) — MORNING BRIEFING REVIEW-ZYKLUS-1-NACHZUG
 *  (drei offene Punkte aus dem allerersten externen MB-Review, 28.08.2026,
 *  nie umgesetzt): (1) CSP-Weekly-Contango-Regel in STRATEGIE_MATRIX war zu
 *  pauschal ("CONTANGO = gesundes Theta-Umfeld") — ergaenzt um VIX-Perzentil-
 *  Schwelle (>25), da bei sehr niedrigem VIX die Praemie trotz normaler
 *  Termstruktur limitierend bleibt (Reviewer-Punkt 8, Zyklus 1). (2) Neue
 *  Pflichtregel in ABSCHNITT 1 (MARKTLAGE): Widersprueche zwischen Regime und
 *  Fruehwarnindikatoren (z.B. BULL_QUIET bei steigenden Distribution Days)
 *  muessen explizit als Spannung benannt werden, nicht nur nebeneinander
 *  erwaehnt (Reviewer-Punkt 9, Zyklus 1). (3) s. ko-market-state.js fuer die
 *  dritte Korrektur ("Gesamteinschaetzung"-Zeile, Reviewer-Punkt 3, Zyklus 1).
 *  Version: 2.10.0 (29.08.2026) — CSP/WHEEL-LIVE-TEST, NEUE FEHLERKATEGORIE
 *  (Spec-Belastungstest-Fortsetzung): erster Live-Test von csp_wheel (bisher
 *  nur atmna durchlief die 5 Review-Zyklen, s. Spec §6 "noch nicht separat
 *  extern reviewed"). Ergebnis: (a) "attraktiv" und "Praemienerwartung" —
 *  BEIDE bereits seit v2.8.0/v2.7.0 wortwoertlich verboten — erschienen
 *  trotzdem im Output. Beweis, dass Wortverbote allein keine 100%ige
 *  Zuverlaessigkeit haben, auch bei exakter Uebereinstimmung. (b) NEUE
 *  Fehlerkategorie entdeckt: konkrete Exit-/Stop-Regeln ("Exit-Schwelle bei
 *  RSI oberhalb 45", "Stop unterhalb Support") in den "Parameter:"-Feldern —
 *  keine Strike-/Delta-/Praemien-Zahl, also von keinem bisherigen Verbot
 *  erfasst, aber inhaltlich dieselbe Kategorie: regelbasierte Trade-
 *  Management-Logik, laut Grundgesetz #11 (SUITE.md, Analyse/Execution-
 *  Trennung) EIC-exklusiv. Axel-Entscheidung: "sauber und gruendlich vor
 *  schnell" — daher nicht nur Wortliste erweitert, sondern (1) allgemeine
 *  Regel ergaenzt ("keine Handlungsschwelle jeglicher Art, unabhaengig von
 *  der Formulierung"), (2) "strukturell guenstig"/"strukturell attraktiv" neu
 *  verboten (moeglicher Ursprung: AUFGABE-Text selbst enthielt "passen
 *  strukturell am besten zu" — umformuliert, um das Wort nicht mehr
 *  vorzugeben), (3) explizite Exit-/Stop-/Roll-Verbote direkt in beiden
 *  AUFGABE-Sektionen (naeher an der Generierung platzierte Instruktionen
 *  gelten als zuverlaessiger befolgt als nur die Praeambel). WICHTIG: Punkt
 *  (a) zeigt, dass Wortlisten/Regeln allein nicht ausreichen — ein
 *  deterministischer serverseitiger Nachpruef-Schritt in ko-ai.js ist als
 *  naechster Schritt vorgesehen (separat von diesem Commit).
 *  Version: 2.9.0 (29.08.2026) — BEGRIFFS-/KAUSALITAETS-INTEGRITAET
 *  (UIQ-REGULATORY-LANGUAGE-SPEC.md §1.3/§1.4, Spec-v1.1 §11 Punkte 4-6):
 *  Axel wollte die HVP/IV-Percentile-Verwechslung aus Review-Zyklus 4 gegen
 *  die TATSAECHLICHE Indikator-Definition pruefen, bevor am Prompt
 *  weitergearbeitet wird. Ergebnis der Code-Recherche: HVP
 *  (calc_hv_percentile() in market_aggregator.py) ist rein aus historischen
 *  Schlusskursen berechnet, KEINE Options-/IV-Daten beteiligt — die
 *  Indikator-Definition selbst ist sauber und eindeutig. Die eigentliche
 *  Fehlerquelle war KEIN Sprachfehler der KI: in
 *  axel-scanner/index.html::runOptionsKiBriefing() (Zeile ~24921) war das
 *  Label-Praefix "IVR:" fix verdrahtet, auch im HVP-Fallback-Zweig — der
 *  Prompt enthielt dadurch woertlich "IVR:HVP96%" (zwei Indikator-Namen
 *  unaufgeloest im selben Feld). Die KI hat das im Output korrekt zitiert
 *  ("Extreme IV-Percentile (HVP96%)") — sie hat nicht halluziniert, sondern
 *  einen bereits mehrdeutigen Prompt-Input wiedergegeben. Separat gefixt in
 *  index.html (uebernimmt das an drei anderen Stellen bereits etablierte
 *  Muster label = isHV ? 'HVP' : 'IVP'). Dieser Fund aendert die
 *  Fehlerklasse: Begriffs-Integritaet ist in erster Linie ein
 *  Daten-Serialisierungs-Thema, nicht nur ein Prompt-Wortlaut-Thema —
 *  deshalb hier zusaetzlich als Verteidigung in der Tiefe kodiert (falls
 *  weitere, noch nicht gefundene Serialisierungs-Bugs aehnliche
 *  Mehrdeutigkeiten erzeugen). Ergaenzt: RSI-Richtungskonsistenz
 *  (ueberkauft/ueberverkauft muss zur Zahl passen), Kausalitaets-Integritaet
 *  (keine mehrgliedrigen Kausalketten ohne Datenbeleg), ersatzlose
 *  Streichung von Praemien-Richtungsvermutungen statt Hedging (Spec §9
 *  Punkt 2), Verrechnungs-Suggestion "kompensiert" verboten, Ausschluss-
 *  Formulierung jetzt explizit auf die Strategie skaliert ("erfuellt die
 *  Kriterien der [Strategie] nicht" statt nur "erfuellt die Kriterien
 *  nicht", Spec 10.4).
 *  Version: 2.8.0 (29.08.2026) — DRITTER LEGAL-REVIEW-ZYKLUS (Backlog №65
 *  Fortsetzung, externe Rechtsberatung zum ATM/NA-Public-Output nach
 *  v2.7.0): Struktur und Zahlenfreiheit wurden diesmal als "sehr viel
 *  besser" bewertet — Rest sind sechs lexikalische Einzelstellen, kein
 *  strukturelles Problem mehr. Fix: PUBLIC_REGULATORY_GUARDRAIL um sechs
 *  konkrete Wort-/Satzmuster-Verbote mit woertlichen Pflicht-Ersatz-
 *  formulierungen erweitert: (1) "strukturelle Attraktivitaet fuer
 *  [Strategie]" → "Das Modell weist ... einen hohen Strategy Fit ... zu."
 *  (2) "optimal" vollstaendig verboten (nicht nur "optimalerweise ...
 *  fokussiert" wie in v2.6.0). (3) "Andienung nicht auszuschliessen" →
 *  Pflicht-Kausal-Konditional-Format. (4) "Strike sollte ... validiert
 *  werden" verboten (impliziert UIQ waehle den Strike) → Pflichtsatz "Die
 *  konkrete Strike-Auswahl ... sind ausserhalb von UIQ im Broker zu
 *  pruefen." (5) "Praemienerwartung" verboten → Volatilitaetssignal-
 *  Formulierung mit Broker-Verweis. (6) Sektion-5-Einstieg jetzt mit
 *  woertlichem Pflicht-Satzmuster ("Unter Anwendung der definierten
 *  Modellkriterien weisen [Titel] ... den hoechsten Strategy Fit ... auf.")
 *  statt freier Formulierung — verhindert das vom Reviewer als heikelsten
 *  Satz markierte "Die Modell-Analyse identifiziert [Titel] als
 *  top-gerankt". Reviewer-Fazit zu diesem Zyklus: Version nicht weiter
 *  entschaerfen, nur noch diese lexikalischen Stellen systematisch auf
 *  "Strategy Fit / Modellkriterien / Risikoindikatoren / externe
 *  Validierung" umstellen — genau das leistet dieser Fix.
 *  Version: 2.7.0 (29.08.2026) — ZWEITER LEGAL-REVIEW-ZYKLUS (Backlog №65
 *  Fortsetzung, externe Rechtsberatung zum ATM/NA-Public-Output nach
 *  v2.6.1): der v2.6.1-Fix (kein Fazit, keine Zahlen) reichte nicht — der
 *  Live-Output enthielt weiterhin direktive Formulierungen OHNE konkrete
 *  Zahlen ("optimalerweise ... fokussiert", "reduziert Andienungsrisiken
 *  erheblich", "Praemienniveau ausreichend", "Defensiv aussitzen",
 *  "Handlungsorientierte Einschaetzung: Fokus auf LMT + AMZN"). Externe
 *  Einschaetzung: ESMA fasst "Investment Recommendation" auch bei
 *  indirekter/nicht-technischer Sprache weit — Zahlenfreiheit allein reicht
 *  nicht. Fix: neuer gemeinsamer Baustein PUBLIC_REGULATORY_GUARDRAIL
 *  (expliziter Verbotswoerter-Katalog + Pflicht-Ersatzformulierungen +
 *  Hedging-Pflicht fuer Praemien-/Volatilitaetsaussagen + Modellsignal- statt
 *  Tatsachen-Framing fuer Risikoaussagen), in beide Public-Builder
 *  eingebaut. Options-Builder: Sektion 3 "NICHT GEEIGNET" umbenannt in
 *  "GERINGER UIQ STRATEGY FIT / AUSSCHLUSS NACH MODELLKRITERIEN" (UIQ
 *  bewertet ein Modell, nicht die individuelle Eignung des Nutzers). Beide
 *  Builder: neue optionale Sektion 5 "UIQ ... ZUSAMMENFASSUNG" erlaubt einen
 *  Schlussabschnitt wieder — aber nur als reine Wiederholung der bereits
 *  genannten Kriterien-Uebereinstimmung + Pflicht-Verweis auf eigene
 *  Pruefung ausserhalb UIQ, nie als neue Praeferenz/Handlungsanweisung
 *  (ersetzt das v2.6.1-Verbot jedes Schlussabschnitts durch ein praeziseres,
 *  auf das sichere Format beschraenktes Verbot). EIC-Zweig weiterhin in
 *  jeder Strategie unveraendert (Axel-Entscheidung 29.08., s. №65/№66).
 *  Version: 2.6.1 (29.08.2026) — NACHSCHLIFF zu v2.6.0 (Backlog №65):
 *  Axel hat den v2.6.0-Fix live verifiziert (CDN-Pin auf 141a7c1
 *  aktualisiert, CSP-ATM/NA-Output neu generiert im Public-Modus) — die
 *  neue deskriptive Struktur (SETUP-FIT/NICHT GEEIGNET/RISIKEN, keine
 *  Strikes/Deltas/DTE/Praemien) griff korrekt. Ein Rest blieb: das Modell
 *  haengte von sich aus ein nicht angefordertes "Fazit: LMT + AMZN beste
 *  Kandidaten... Treasury-Stress erfordert engere Stops" an — keine
 *  konkreten Zahlen mehr, aber wieder naeher an einer Rangfolgen-Empfehlung/
 *  Handlungsanweisung als an reiner Kriterien-Beschreibung. Fix: beide
 *  Public-Builder (_publicEquityPrompt/_publicOptionsPrompt) verbieten jetzt
 *  explizit ein abschliessendes Fazit, eine zusammenfassende Rangfolge
 *  ("beste Kandidaten"/"Favorit") sowie pauschale Handlungsanweisungen nach
 *  Punkt 4 — die Antwort endet mit den Risiken.
 *  Version: 2.6.0 (29.08.2026) — REGULATORISCHER FIX (Legal-Briefing-Audit,
 *  Backlog №65 Fortsetzung/Abschluss): die verbliebene, gestern offen
 *  gelassene Frage — verlangen die 14 Strategie-Templates selbst
 *  (unabhaengig vom v2.5.7-System-Prompt-Fix) konkrete Handlungsparameter?
 *  — wurde fuer alle 14 Templates mit Ja beantwortet (vorher nur fuer
 *  cc/atmna/csp_wheel/weekly_income/collar/momentum gesichtet, jetzt
 *  vollstaendig geprueft: auch ko/breakout/vcp/swing/meanrev/dividend/
 *  value/fading_short verlangten TOP-3-Kandidaten mit Stop-Loss/Entry/
 *  Strike/Delta/Praemien-Zahlen, "NICHT EMPFOHLEN"/"VALUE-TRAPS"-Direkt-
 *  sprache). Fix: jede der 14 .prompt(ctx)-Funktionen prueft jetzt zuerst
 *  ctx.isEic — nur bei explizit true (EIC-Modus) laeuft der bestehende,
 *  unveraenderte Code-Zweig mit den konkreten Zahlen. Sonst (Default,
 *  fail-safe wie v2.5.7) liefert einer von zwei neuen, geteilten Public-
 *  Buildern (_publicEquityPrompt/_publicOptionsPrompt) eine deskriptive
 *  "Statistische Kontext-Analyse" (§1 WpHG) ohne Kursziele/Stop-Loss/
 *  Strikes/Deltas/Praemien — basierend auf dem je Strategie bereits
 *  vorhandenen, neutral formulierten focus-Array als Bewertungskriterien
 *  (keine zweite Kriterienliste noetig, Grundgesetz #1). Zusatzfund beim
 *  Umsetzen: (a) index.html berechnete fuer 'value' bereits ctx.isEic/
 *  ctx.mode, aber die value-Template las das nie — toter Code, jetzt
 *  verdrahtet; (b) ctx.tickers (Kandidatenliste) wurde vom value-Aufrufer
 *  uebergeben, aber im Template nie serialisiert — die KI bekam fuer
 *  Value bislang praktisch keine Einzeltitel-Kennzahlen, nur den kurzen
 *  Datums/Regime/VIX-Header. Beides in diesem Fix mitbehoben. WICHTIGE
 *  EINSCHRAENKUNG (bewusst nicht geglaettet): ctx.isEic wird weiterhin
 *  clientseitig in index.html aus _expertModeActive/_eicUnlocked gesetzt
 *  (selbstgesetzter PIN, s. №60) — dieser Fix schliesst die Regelwerk-
 *  Luecke (Public-Nutzer OHNE gesetzten EIC-PIN bekommen jetzt zuverlaessig
 *  die deskriptive Variante), macht ctx.isEic aber nicht faelschungssicher.
 *  Eine harte serverseitige Herkunftspruefung des User-Prompt-Inhalts
 *  selbst (nicht nur des System-Prompts wie bei isOwner/№60) waere die
 *  strukturell robustere, aber deutlich groessere Loesung (Prompt-Bau auf
 *  den Server verlagern) — hier bewusst nicht umgesetzt, da ausserhalb
 *  des heutigen Auftrags. Betroffene Aufrufstellen in index.html
 *  (openKiBriefing/runOptionsKiBriefing) muessen ctx.isEic konsistent
 *  setzen, sonst greift ueberall der neue Public-Default — s. axel-scanner
 *  Changelog vom selben Tag.
 *  Version: 2.5.7 (28.08.2026) — SICHERHEITS-FIX (Legal-Briefing-Audit,
 *  Folgefund zu Backlog №60/61 in SUITE.md): _getSystemPrompt() und
 *  _getMorningPrompt() bauten bisher clientseitig einen kompletten
 *  "EIC-Instruktions-Block" (u.a. "gib KONKRETE, DIREKTE Handlungs-
 *  empfehlungen") direkt in den User-Prompt-Text ein, gesteuert allein
 *  durch _expertModeActive/_eicUnlocked (Client-Variablen, selbstgesetzter
 *  PIN — s. №60). Das lief am serverseitigen isOwner-Gate in ko-ai.js
 *  komplett vorbei: der Worker waehlt zwar korrekt den Public-Systemprompt
 *  fuer Nicht-Owner, aber der eingebettete User-Prompt-Text enthielt
 *  trotzdem die EIC-Instruktion — das Modell folgt in der Praxis eher der
 *  konkreten Aufgabenstellung im User-Text als dem widersprechenden
 *  Systemprompt (live beobachtet: Covered-Call-Analyse im Public-Toggle-
 *  Zustand enthielt trotzdem Strike/Delta/Praemien-Zahlen + Rangfolge).
 *  Fix: eic-Parameter wird in beiden Funktionen nicht mehr zur Text-
 *  auswahl verwendet — liefern jetzt IMMER die deskriptive Coaching-
 *  Variante. Die eigentliche Public/Expert-Unterscheidung liegt
 *  ausschliesslich noch serverseitig in ko-ai.js::selectSystemPrompt()
 *  (bereits isOwner-gehaertet). Fuer Axel als Owner aendert sich die
 *  Ausgabequalitaet nicht (Server-Systemprompt traegt die Experten-
 *  Rahmung bereits zuverlaessig, am 27.08. verifiziert). Betrifft NICHT
 *  die Options-Desk-Strategie-Templates (cc/atmna/csp_wheel/weekly_income),
 *  die strukturell verwandt aber separat sind — s. Backlog №65/66.
 *  Version: 2.5.6 (23.08.2026) — Deep-Dive-Crash behoben (EIC-/Expert-
 *  Modus-Teil): generateDeepDiveKI() in index.html erwartet pro Strategie
 *  ein focus-Array (strat.focus[0..3]) fuer den Expert-Prompt-Aufbau — das
 *  fehlte bei ALLEN 14 Strategien seit der Umstellung auf .prompt()-
 *  Funktionen, wodurch der Deep-Dive fuer jede Strategie in jedem Modus
 *  crashte (TypeError beim Public-seitigen prompt_context, der zusaetzlich
 *  eine tote/ungenutzte Zeile war -- separat in index.html gefixt). Diese
 *  Version ergaenzt bei allen 14 Strategien ein focus-Array (3 Analyse-
 *  punkte + 1 Risikopunkt), abgeleitet aus dem bereits in .prompt()
 *  vorhandenen strategiespezifischen Wissen -- keine .prompt()-Funktion
 *  veraendert, nur ergaenzt (0 Zeilen entfernt, 84 Zeilen hinzugefuegt,
 *  s. Diff). Betrifft nur den EIC-/Expert-Modus (privates Tool) -- der
 *  Public-Modus-Crash war ein separater, in index.html behobener Fund.
 *  Version: 2.5.5 (18.08.2026) — Letzter offener Punkt aus
 *  UEBERGABE-2026-08-13.md §4 nachgezogen: EIC-System-Prompt-Zeile
 *  ("• OPTIONS (CSP/CC/Spread): ...") zeigte noch "Delta 0.20–0.30 · DTE
 *  21–45 Tage" — korrigiert auf "Delta 0.15–0.30 (CSP) / 0.20–0.30
 *  (CC/Spread) · DTE 30–45 Tage". Bei der Gelegenheit verifiziert: die
 *  übrigen 5 der 6 Punkte aus §4 waren bereits umgesetzt (vermutlich
 *  15.08.2026-Session, deren UEBERGABE-Protokoll nie committed wurde —
 *  Dokumentationslücke, kein Code-Problem). Zusätzlich einen veralteten,
 *  irreführenden Kommentar in axel-scanner/index.html
 *  (getTargetDteForStrategy()) korrigiert, der noch "Default 21" nannte,
 *  obwohl der Code selbst bereits 30 nutzte.
 *  Version: 2.5.4 (17.08.2026) — csp_wheel.rollRules-Anbindungspruefung
 *  (Folgepunkt aus UEBERGABE-2026-08-15.md §4/§7): Befund — rollRules wurde
 *  von KEINER Funktion konsumiert (getEffectiveRules() reichte nur delta-
 *  Range/dteRange durch; der zweite in der Registry genannte Konsument,
 *  evaluateOptionsTradeAgainstUIQRules()/Trade-Doktor, existiert als Code
 *  nirgends). Gemeinsam mit Axel entschieden: rollRules bleibt bewusst
 *  UNVERDRAHTET — die Intent-basierte Verzweigung (urspruengliche Handels-
 *  absicht einer BESTEHENDEN Position) passt strukturell nicht in den
 *  Kandidaten-Scanner dieses Prompts, sondern in den geplanten Options-
 *  Doktor (Positions-Management). stopLoss/profitTaking dagegen SIND jetzt
 *  eingebunden (getEffectiveRules() erweitert, neuer Punkt "g) EXIT-
 *  KRITERIEN" im csp_wheel-Prompt) — Exit-Kriterien fuer eine NEU zu
 *  eroeffnende Position passen strukturell in den Scanner-Kontext.
 *  Noch NICHT live verifiziert (echter API-Call steht aus).
 *  Version: 2.5.3 (17.08.2026) — PFLICHTREGEL-Nachzug (Axel-Deep-Debug-Anfrage,
 *  Folgepunkt aus UEBERGABE-2026-08-16.md §4/§6): der server-seitige Fix
 *  (market_aggregator.py v5.36.11) — jeder [CAUTION]/[RISK]-Faktor aus MARKET
 *  CONTEXT MUSS explizit genannt werden, unabhängig von der STRUKTUR-Liste —
 *  fehlte im Client-Fallback-Prompt (_getMorningPrompt, nur bei KV-Cache-Miss
 *  oder EIC-Force-Refresh aktiv). Beide Branches (EIC + Public) nachgezogen,
 *  Wortlaut analog zum Server-Prompt. messwerteLines enthaelt die [CAUTION]/
 *  [RISK]-Labels bereits laenger (contextToPromptLines()) — es fehlte nur die
 *  bindende Anweisung, sie auch zu erwaehnen. Noch NICHT live verifiziert
 *  (Pfad wird selten getriggert) — naechster KV-Cache-Miss oder EIC-Force-
 *  Refresh mit echtem caution/risk-Signal sollte das bestaetigen.
 *  Version: 2.5.2 (15.08.2026) — Morning-Briefing-Prompt (_getMorningPrompt)
 *  korrigiert: DIX/GEX standen nur in einer nachgelagerten Stilregel, nicht in
 *  der eigentlichen Abschnitts-Aufgabenstellung — KI erwaehnte sie dadurch nie,
 *  obwohl die Werte im Kontext vorlagen. GEX-Text von veralteter "AAPL-Proxy"-
 *  Formulierung auf "SqueezeMetrics SPY-Markt-Level" korrigiert (EIC+Public).
 *  DIX-Text erweitert auf "S&P-500-Basis UND ETF-Korb" (vorher nur ETF-Korb).
 *  _dixReal-Berechnung in index.html erweitert (erkennt jetzt beide DIX-Quellen).
 *  Bekannter, noch offener Punkt: Server-seitiger Python-Pfad (market_aggregator.py,
 *  KV-gecachtes Briefing) hat vermutlich eigene, unabhaengige Prompt-Logik — dieser
 *  Fix deckt nur den clientseitigen JS-Pfad ab. S. UEBERGABE-2026-08-15.md. 
 *  Version: 2.5.1 (15.08.2026) — getEffectiveRules() ergaenzt (liest Delta/DTE
 *  aus KoStrategyRegistry statt hartcodierter Werte), csp_wheel/cc-Prompts
 *  nutzen sie jetzt (neue Delta-Zeile, korrigierte DTE-Range 30-45 statt
 *  fälschlich 21-45), statischer "21-45 DTE"-Text im CC-Grundlagentext
 *  korrigiert auf "30-45 DTE". Fallback-Defaults (dte:21→30) an 2 Stellen.
 *  Repository: ahsub/ko-modules
 *
 * Enthält:
 *   - KI_ANTI_HALLUZINATION  → globale Schutzregel für alle KI-Calls
 *   - KoPrompts.SYSTEM       → getSystemPrompt(eic) — Public/EIC-Split
 *   - KoPrompts.MORNING      → getMorningPrompt(messwerteLines, eic, dixReal) — MB-Prompt
 *   - KoPrompts.STRATEGIES   → vollständige Strategie-Konfiguration (12 Strategien)
 *   - KoPrompts.get(strat, ctx) → prompt für eine Strategie holen
 *   - KoPrompts.getConfig(strat) → hint + color holen
 *   - KoPrompts.getIntermarketPrompt(ctx) → Intermarket/Makro-Analyse-Prompt
 *   - KoPrompts.getOversoldPrompt(ctx)    → Oversold-Rebound-Scan-Prompt
 *   - KoPrompts.getMetaAnalysisPrompt(ctx) → Backtesting Meta-Analyse-Prompt
 *
 * Kanonische Strategie-Liste (STRATEGY_ORDER aus ko-market-state.js):
 *   ko, momentum, breakout, vcp, swing, meanrev,
 *   csp_wheel, atmna, weekly_income, cc, collar, fading_short
 *
 * Hinweis Sicherheit:
 *   PUBLIC-Prompts (BaFin §1 WpHG) sind hier vollständig enthalten.
 *   EIC/Expert-Modus: getSystemPrompt(true) + getMorningPrompt(..., true)
 *   liefern die EIC-Varianten — kein separater Server-Prompt mehr nötig
 *   für die Standard-Strategien (ko-ai Worker behält EIC-Sonderfunktionen).
 *
 * Changelog:
 *   v2.6.0 (05.08.2026): Morning Briefing Coaching-Ton
 *   - _getMorningPrompt EIC: Coaching-Sprache (Mentor-Stil, Metrik-Erklärungen,
 *     Handlungshaltung je Abschnitt) — ersetzt rein deskriptive Abschnitts-Anweisungen
 *   - _getMorningPrompt Public: Erklär-Pflicht für jeden Messwert ("Zahl + Bedeutung"),
 *     TOP-KANDIDATEN-Begründungspflicht ergänzt, BaFin-REGEL präzisiert
 *   - Kein API-Änderung: getMorningPrompt(lines, eic, dixReal) unverändert
 *   v2.5.0 (30.07.2026): ko-indicators-registry Sprint — Strategie↔Leaderboard-Mapping
 *     - lbKey-Feld zu allen 14 Strategien in STRATEGIES ergänzt
 *       (Single Source of Truth für Strategie→Leaderboard-Zuordnung)
 *     - getLbKey(stratId) neu: gibt lbKey für eine Strategie zurück (null wenn kein LB-Tab)
 *     - stratFromLb(lbKey) neu: gibt stratId für einen Leaderboard-Key zurück
 *     - STRATEGY_TO_LB und _lbToStrat in index.html sind damit obsolet
 *   v2.4.0 (30.07.2026): ko-prompts-registry Sprint 2
 *     - getIntermarketPrompt(ctx) neu: Intermarket/Makro-Analyse-Prompt aus
 *       autoMakro()/generateDpKI()-Bereich externalisiert. ctx: {today, sp, nq,
 *       vix, gold, silver, copper, oil2, btc, eth, sol, imVvix, imAud, imJpy,
 *       imTip, imItb, imVnq, imSpread, imScore, sektorContext, newsContext,
 *       consistencyHint}. Gibt JSON-Prompt zurück (verdict/verdictText/factors).
 *     - getOversoldPrompt(ctx) neu: Oversold-Rebound-Scan-Prompt aus
 *       runOversoldScan() externalisiert. ctx: {vix, candidateStr}.
 *       Gibt JSON-Prompt zurück (candidates[]).
 *     - getMetaAnalysisPrompt(ctx) neu: Backtesting Meta-Analyse-Prompt aus
 *       runMetaAnalysis() externalisiert. ctx: {backtestCtx, dp}.
 *       Gibt strukturierten DE-Text-Prompt zurück (1-5 Punkte).
 *   v2.1.2 (21.07.2026): ko-prompts-registry Sprint
 *     - getSystemPrompt(eic) neu: Public/EIC-Split aus index.html externalisiert
 *     - getMorningPrompt(lines, eic, dixReal) neu: Morning-Briefing-Prompt inkl.
 *       STRATEGIE_MATRIX aus index.html externalisiert
 *     - STRATEGIE_MATRIX auf kanonische 12 UIQ-Strategien bereinigt:
 *       Breakout + VCP ergänzt, Breakdown Short + Tail-Risk-Hedge entfernt
 *       (nicht in UIQ), CC ergänzt
 *     - 'options' → 'csp_wheel' umbenannt (Konsistenz STRATEGY_ORDER)
 *     - 'ludwig' → 'atmna' umbenannt (P1-Rename, war überfällig)
 *     - 'cc' (Covered Call) neu hinzugefügt
 *     - Collar: bleibt als Prompt (KI kann es in BULL_FRAGILE erwähnen),
 *       kein STRATEGIE_MATRIX-Eintrag (Positions-Kontext fehlt in UIQ;
 *       vollständige Behandlung → Options-Doktor-Modul)
 *     - fading_short: STRATEGIE_MATRIX-Eintrag vorhanden, kein eigener
 *       Analyse-Prompt (Leaderboard hat keine Metriken für KI-Analyse)
 *   v1.0.0: Initialer Release
 */

(function(global) {
  'use strict';

  // ── GLOBALE ANTI-HALLUZINATIONS-REGEL ─────────────────────────────────────
  // Wird in JEDEN Strategie-Prompt vorangestellt.
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

Du erhältst unten EXAKTE Scanner-Daten mit SNAPSHOT-ZEITPUNKT. Diese Daten sind die EINZIGE Wahrheit.

⚠️ SNAPSHOT-BINDUNG: Der SNAPSHOT-ZEITPUNKT am Anfang der Messwerte ist der exakte Abrufzeitpunkt.
• Alle Kurse, Kennzahlen und Werte gelten NUR für diesen Zeitpunkt
• Dein Trainingswissen über Kurse, Gewinne, Umsätze dieses Tickers: VOLLSTÄNDIG IGNORIEREN
• Bei jedem Aufruf gelten NUR die übermittelten Messwerte — nie gecachte oder "erinnerte" Daten
• Unterschiedliche Aufruf-Ergebnisse für denselben Ticker = Datenfehler, NICHT Interpretationsspielraum

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

== COACHING-GRUNDHALTUNG — GILT FÜR ALLE ANALYSEN ==
UIQ ist ein diagnostisches Entscheidungssystem. Deine Rolle ist die eines Investment-Coaches,
nicht die eines Analysten der Fakten auflistet.

Das bedeutet konkret:
• HANDLUNGSORIENTIERT: Jede Analyse endet mit einer klaren Einschätzung — handeln oder abwarten, und warum.
• VERSTÄNDLICH: Erkläre jede Metrik kurz wenn du sie nennst. Nicht "ADX 15" sondern "ADX 15 — kein etablierter Trend".
• DIREKT: Keine Schachtelsätze, kein akademischer Stil. Sprich wie ein erfahrener Mentor.
• EHRLICH: Wenn die Datenlage unklar ist, sage das. "Die Signale widersprechen sich heute, weil..." ist besser als eine erzwungene Einschätzung.
• STRUKTURIERT: Zuerst Marktkontext, dann Titel-Situation, dann Einschätzung. Immer in dieser Reihenfolge.
• KEIN JARGON ohne Erklärung. "Confluence" erklären, "choppy" erklären, "ADX" erklären.
== ENDE COACHING-GRUNDHALTUNG ==

`;

  // ── SYSTEM-PROMPTS (Public / EIC-Split) ───────────────────────────────────
  // Vorher inline in index.html getKiSystemPrompt() — jetzt Single Source of Truth.
  //
  // SICHERHEITS-FIX (28.08.2026, Legal-Briefing-Audit, Folgefund zu №60/61):
  // Diese Funktion baute bisher clientseitig einen kompletten "EIC-Instruktions-
  // Block" (inkl. "gib KONKRETE, DIREKTE Handlungsempfehlungen") in den User-
  // Prompt-Text ein, gesteuert allein durch die Client-Variablen
  // _expertModeActive/_eicUnlocked (selbstgesetzter PIN, localStorage — siehe
  // №60). Das lief am serverseitigen isOwner-Gate in ko-ai.js komplett vorbei:
  // selbst wenn der Worker korrekt den Public-Systemprompt waehlt (expert_mode
  // korrekt auf false erzwungen fuer Nicht-Owner), enthielt der eingebettete
  // User-Prompt-Text trotzdem die EIC-Instruktion — das Modell folgt in der
  // Praxis eher der konkreten Aufgabenstellung im User-Text als dem
  // widersprechenden Systemprompt (empirisch beobachtet bei den Options-Desk-
  // Templates, z.B. 'cc', die strukturell dasselbe Problem haben, s. Backlog
  // №65/66).
  //
  // Fix: eic-Parameter wird nicht mehr zur Textauswahl verwendet — diese
  // Funktion liefert jetzt IMMER die deskriptive Coaching-Variante. Die
  // eigentliche Public/Expert-Unterscheidung liegt ausschliesslich noch
  // serverseitig in ko-ai.js::selectSystemPrompt() (morning_public/expert,
  // ki_briefing_public/expert), bereits korrekt auf isOwner gehaertet (№60).
  // Fuer Axel als Owner aendert sich die Ausgabequalitaet NICHT — die
  // eigentliche Experten-Rahmung kam ohnehin schon zuverlaessig vom Server
  // (am 27.08. verifiziert). Parameter `eic` bleibt in der Signatur fuer
  // Abwaertskompatibilitaet der Call-Sites, wird aber ignoriert.

  function _getSystemPrompt(context, eic) {
    // 03.09.2026 (Axel-Entscheidung, "Option C"): PUBLIC_REGULATORY_GUARDRAIL +
    // KI_ANTI_HALLUZINATION bedingungslos ergänzt (unabhaengig vom eic-Parameter,
    // konsistent mit dem 28.08.2026-Sicherheits-Fix — Client-Flags sind nicht
    // vertrauenswuerdig, nur ko-ai.js entscheidet serverseitig wirklich ueber
    // Owner/Expert-Status). Hintergrund: diese Funktion ist ueber
    // getKiSystemPrompt() die GEMEINSAME Basis fuer mindestens 6 kompakte
    // "Quick-Take"-Features (Alpha-Desk-Leaderboard-KI, Einzeltitel-Deep-Dive,
    // Beste Options-Kombination, Beste Chancen ueber alle Strategien, Dark
    // Pool) — bislang OHNE jede der 9-Punkte-Guardrail-Haertungen von heute,
    // obwohl diese Features laut Axel "general", also auch fuer Beta-/Public-
    // User zugaenglich sind. Bewusst NICHT auf das volle 9-Punkte-Schema
    // umgestellt (waere ein deutlich groesserer, fuer diese kompakten Formate
    // unpassender Umbau) — stattdessen die eine gemeinsame Funktion gehaertet,
    // die bereits alle 6 Stellen speisen. Einleitungssatz entschaerft: "ob ein
    // Setup heute handlungswuerdig ist" widersprach sonst direkt der nun
    // ergaenzten Guardrail-Regel "keine direkten Kauf-/Verkaufsempfehlungen".
    return KI_ANTI_HALLUZINATION
      + 'Du bist ein quantitativer Markt-Analyst und Coach, der Investoren hilft, '
      + 'Marktdaten besser zu verstehen. Deine Aufgabe: ordne ein Setup anhand der '
      + 'gegebenen Kriterien ein — welche Modellfaktoren dafür, welche dagegen '
      + 'sprechen — OHNE eine Handlungsempfehlung fuer heute auszusprechen. '
      + 'Schreibe klar und direkt, aber nie als Kauf-/Verkaufsaufforderung.\n\n'
      + 'STIL-REGELN:\n'
      + '- Klare, direkte Sprache. Kein akademischer Stil, keine Schachtelsätze.\n'
      + '- Erkläre jede Metrik in einem Halbsatz: "ADX 15 — kein etablierter Trend" statt nur "ADX 15".\n'
      + '- Wenn du eine Einschätzung gibst, sage warum: "...weil [Metrik] zeigt, dass [Bedeutung]".\n'
      + '- Regime-Konfidenz von 0% bei Range-Regime ignorieren — das ist ein technischer Wert, nicht inhaltlich relevant.\n'
      + '- Statt "rechnerisch konsistent" oder "methodisch sinnvoll": einfach sagen was die Datenlage nahelegt.\n\n'
      + 'ABSOLUTE REGELN:\n'
      + '- ALLE Aussagen ausschliesslich aus den gegebenen Messwerten ableiten.\n'
      + '- Keine direkten Kauf-/Verkaufsempfehlungen (BaFin §1 WpHG). '
      + 'Stattdessen: "Die Datenlage spricht für..." oder "Das Risiko überwiegt heute, weil...".\n'
      + '- Kein Markdown, kein "Ich".\n'
      + (context ? '\nKONTEXT: ' + context : '')
      + '\n\n' + PUBLIC_REGULATORY_GUARDRAIL;
  }

  // ── MORNING BRIEFING PROMPT ────────────────────────────────────────────────
  // Vorher inline in index.html getMorningBriefingPrompt() — jetzt hier.
  // STRATEGIE_MATRIX auf kanonische 12 UIQ-Strategien bereinigt (21.07.2026):
  //   + Breakout ergänzt (war vergessen), VCP ergänzt, CC ergänzt
  //   - Breakdown Short entfernt (nicht in UIQ)
  //   - Tail-Risk-Hedge entfernt (nicht in UIQ)
  //   Collar: kein STRATEGIE_MATRIX-Eintrag (kein Positions-Kontext in UIQ)

  function _getMorningPrompt(messwerteLines, eic, dixReal) {
    var basis = 'MESSWERTE:\n' + messwerteLines.join('\n');
    var _dixReal = dixReal || false;

    var STRATEGIE_MATRIX =
      '\n\nPFLICHT-ABSCHNITT STRATEGIE-AMPEL (immer als letzter Abschnitt, keine Ausnahmen):\n'
      + 'Bewerte JEDE der folgenden Strategien mit genau einer Ampelfarbe — ausschließlich aus den oben stehenden Messwerten abgeleitet.\n'
      + 'KEINE Ampelfarbe erfinden oder schätzen. Fehlt ein Datenpunkt für eine Regel → diese Teilregel ignorieren, nicht durch Trainingswissen ersetzen.\n'
      + 'Format: [Ampel] STRATEGIE-NAME — 1 Satz Begründung mit konkretem Messwert (Zahl nennen, keine vagen Worte).\n\n'
      + '🟢 = heute bevorzugt | 🟡 = situativ möglich | 🔴 = heute pausieren | ⬜ = Daten fehlen\n\n'
      + 'PRIORITÄTSREGEL (bindend, vor allem anderen): Wenn im Abschnitt "STRATEGIE-AMPEL (bereits berechnet, regelbasiert)" Context-Downgrades aufgeführt sind, MUSST du diese zwingend übernehmen — sie haben absolute Priorität vor der Drei-Stufen-Logik unten. Beispiel: "momentum amber→red (Breadth-Weak)" bedeutet Momentum ist HEUTE 🔴, unabhängig vom Regime. Begründe mit dem Downgrade-Grund (z.B. NDX-Breadth 40%).\n'
      + 'DREI-STUFEN-LOGIK (immer in dieser Reihenfolge denken, bevor du die Ampel setzt):\n'
      + 'STUFE 1 — Regime & Trend (Wo handeln wir?): MSE-Regime, SPY/QQQ SMA200-Status, Breadth (RSP/SPY), Rotation (QQQ/SPY, SMH/SPY).\n'
      + '  → Bullish/Risk-On: Delta-positive Strategien bevorzugen. Bearish/Risk-Off: Delta-neutral/absichernd.\n'
      + 'STUFE 2 — Volatilität & Sentiment (Wie handeln wir?): VIX-Z/Perzentil, VIX-Termstruktur (Contango/Backwardation), SKEW-Z, VVIX-Z, SKEW/VVIX-Divergenz, MOVE Index, HY-Spread, PCR.\n'
      + '  → Hohe IV/Angst im Markt (VIX-Z hoch, Contango steil): CSP/Wheel und Bull-Put-Spreads bevorzugen (Prämie übertrieben).\n'
      + '  → Sehr niedrige IV + SKEW hoch/Divergenz-Warnung (Sorglosigkeit + verstecktes Tail-Hedging): Short-Options-Neuaufbau zurückhaltend, bestehende Positionen eng führen.\n'
      + 'STUFE 3 — Marktbreite & Sektor-Stärke (Was handeln wir?): Sektor-RS-Tabelle, Net Liquidity Trend.\n'
      + '  → Schwache Sektoren (RS negativ) meiden, relative Stärke bevorzugen. Schrumpfende Net Liquidity = Gegenwind für alle Short-Vol-Strategien, im Text erwähnen.\n\n'
      + 'LONG-STRATEGIEN:\n'
      + '• Momentum/SEPA: 🟢 wenn Regime=BULL_QUIET/BULL_FRAGILE + Breadth(RSP/SPY)=True + IOS-Market-Score>65. 🔴 wenn Regime=STRESS_UNSTABLE oder SPY unter SMA200.\n'
      + '• Breakout: 🟢 wenn Regime=BULL_QUIET + Titel nahe 52W-Hoch + Volumen überdurchschnittlich. 🔴 wenn Regime=STRESS_UNSTABLE oder NDX-Breadth<40%.\n'
      + '• VCP-Setup: 🟢 wenn Regime=BULL_QUIET + VIX komprimiert (Perzentil<50) + Stage-2-Trend intakt. 🔴 wenn Regime=STRESS_UNSTABLE oder Breadth schwach.\n'
      + '• Swing-Trading: 🟢 wenn VIX-Perzentil 20-60 (moderat) + Rotation nicht klar negativ. 🔴 wenn VIX-Z>+1.5 oder VIX-Perzentil>85.\n'
      + '• Mean Reversion Long: 🟢 wenn VIX-Z>+1.5 UND Fear&Greed<30 (echtes Überverkauft-Signal, nicht nur ein Kriterium). 🔴 wenn Regime=BULL_QUIET mit klarem Aufwärtstrend.\n'
      + '• KO-Long: 🟢 wenn Regime bullisch + VVIX-Z<+1 (kein Volatilitätsstress) + Net-Liquidity-Trend nicht stark schrumpfend. 🔴 wenn VVIX-Z>+2 oder SKEW/VVIX-Divergenz "WARNUNG".\n'
      + '\nOPTIONS-INCOME-STRATEGIEN:\n'
      + '• CSP/Wheel: 🟢 wenn VIX-Perzentil>50 (überdurchschnittliche Prämie) + kein akuter Stress (Regime≠STRESS_UNSTABLE). 🔴 wenn VIX-Perzentil<15 (Prämie zu mager) oder HY-Spread-Signal="STRESS".\n'
      + '• CSP (ATM/NA): 🟢 wenn VIX-Perzentil 30-75 + Regime nicht STRESS_UNSTABLE. 🔴 wenn VIX-Perzentil>90 (Prämie riskant hoch, große Bewegung erwartet).\n'
      + '• CSP (Weekly): 🟢 wenn VIX-Termstruktur CONTANGO (normales Volatilitätsregime) + MOVE-Signal≠STRESS + VIX-Perzentil>25 (Contango allein reicht nicht — bei sehr niedrigem VIX bleibt die erzielbare Prämie limitierend, das im Begründungssatz benennen). 🟡 wenn CONTANGO aber VIX-Perzentil≤25 (Prämie/Tail-Risk-Verhältnis ungünstig trotz normaler Struktur). 🔴 wenn VIX-Termstruktur BACKWARDATION (Absicherungsnotstand).\n'
      + '• Covered Call: 🟢 wenn bestehende Long-Positionen vorhanden + VIX moderat (15-25) + Regime nicht STRESS_UNSTABLE. 🟡 wenn VIX<15 (Prämie mager, aber CC auf starke Positionen sinnvoll). 🔴 wenn Regime=POST_PANIC_REVERSION (Upside nicht deckeln).\n'
      + '\nSHORT-STRATEGIEN:\n'
      + '• Fading Short (KO-Short): 🟢 wenn Regime=BULL_FRAGILE/STRESS_UNSTABLE + Fear&Greed>70 (Überhitzung) + SKEW/VVIX-Divergenz vorhanden. 🔴 wenn Fear&Greed<40 oder Regime=BULL_QUIET.\n'
      + '\nWICHTIG: Gib ausschließlich Ampelfarben und 1-Satz-Begründungen mit konkretem Messwert aus den obigen Daten. '
      + (_dixReal
          ? 'DIX (ETF-Korb) darf nur mit dieser Kennzeichnung erwähnt werden, niemals als "DIX" pur — es ist kein 1:1-Ersatz für den klassischen S&P-500-DIX. '
          : 'DIX darf in KEINER Begründung erwähnt werden (kein Datenfeed vorhanden). ')
      + 'Keine Strategie-Beschreibung, keine allgemeinen Marktkommentare in diesem Abschnitt.';

    // SICHERHEITS-FIX (28.08.2026, s. Kommentar bei _getSystemPrompt oben):
    // Der eic-Zweig ist entfernt — diese Funktion liefert jetzt IMMER die
    // deskriptive/BaFin-konforme Struktur, unabhängig vom eic-Parameter.
    // Die Expert/Public-Unterscheidung liegt ausschliesslich noch serverseitig
    // in ko-ai.js::selectSystemPrompt() (morning_public/morning_expert),
    // bereits korrekt auf isOwner gehaertet.
    return _getSystemPrompt(null, false) + '\n\n'
        + 'AUFGABE: Morning Briefing — Marktüberblick zum Tagesstart.\n'
        + 'Erkläre klar und verständlich, was der Markt heute zeigt — und was das für einen Investor bedeutet. '
        + 'Kein Fachjargon ohne Erklärung. Jede Zahl bekommt eine Bedeutung in einem Halbsatz.\n\n'
        + 'PFLICHTREGEL (bindend, vor der STRUKTUR unten — 17.08.2026, Konsistenz-Nachzug zum Server-Prompt): '
        + 'JEDER Faktor aus MESSWERTE mit Signal [CAUTION] oder [RISK] MUSS explizit in einem der 5 Abschnitte '
        + 'namentlich genannt werden — unabhängig davon, ob er unten als Pflichtinhalt aufgeführt ist. Die STRUKTUR '
        + 'ist eine Mindestanforderung, keine abschließende Aufzählung.\n\n'
        + 'STRUKTUR (5 Abschnitte, je 2-4 Sätze, BaFin-konform gem. §1 WpHG):\n\n'
        + basis + '\n\n'
        + 'ABSCHNITTE:\n'
        + '1. MARKTLAGE: Was ist das aktuelle Regime (MSE) — und was bedeutet das heute konkret? '
        + 'Breadth und Rotation einordnen: bestätigen sie das Regime oder widersprechen sie ihm? '
        + 'Falls Distribution Days, Bull-Indikator oder andere Frühwarnindikatoren dem aktuellen Regime '
        + 'widersprechen (z.B. BULL_QUIET bei gleichzeitig steigenden Distribution Days), das explizit als '
        + 'Spannung benennen — z.B. "[Regime] ist aktuell das dominante Regime, wird jedoch durch '
        + '[konkreter Gegenindikator] belastet" — nicht nur beide Fakten nebeneinander nennen, ohne den '
        + 'Zusammenhang zu erklären.\n'
        + '2. SENTIMENT: Fear & Greed, PCR (als Proxy kennzeichnen falls source=vix_proxy), IOS-Market-Score — '
        + 'einordnen und erklären was der Wert bedeutet, nicht nur nennen. '
        + (_dixReal ? 'DIX (ETF-Korb, als solcher gekennzeichnet) UND ' : '')
        + 'GEX (SPY-Markt-Level, falls verfügbar) als Dark-Pool-/Gamma-Indikatoren mit einbeziehen.\n'
        + '3. MAKRO-KONDENSAT: HY Credit Spread, US Net Liquidity (Trend!), MOVE Index — '
        + 'je Messwert in einem Halbsatz erklären was er heute signalisiert.\n'
        + '4. STRATEGIE-AMPEL: Alle Strategien mit Ampelfarbe + 1-Satz-Begründung inkl. konkretem Messwert.\n'
        + '5. TOP-KANDIDATEN: Aus den Shortlist-Daten — welche 3-5 Titel passen heute am besten zum Marktumfeld, und warum?\n'
        + '\nSTRIKTE BaFin-REGEL: Keine Empfehlungen zum Kauf, Verkauf oder Halten von Wertpapieren, Derivaten oder Hebelprodukten, '
        + 'auch nicht implizit. Ausschließlich deskriptive Einordnung. Fehlende Werte als \"nicht verfügbar\" benennen — niemals schätzen. '
        + (_dixReal
            ? 'DIX (S&P-500-Basis UND ETF-Korb, beide getrennt kennzeichnen) deskriptiv einordnen.\n'
            : 'DIX ist grundsätzlich nicht verfügbar — niemals erwähnen.\n')
        + STRATEGIE_MATRIX;
  }
  // NEU (15.08.2026): Effektive Regeln pro Strategie — liest Basis-Werte aus
  // KoStrategyRegistry (Single Source of Truth), ueberschreibt NUR die DTE-
  // untere-Grenze mit dem nutzerseitig einstellbaren optsCfg.dte (ausser bei
  // atmna, das strategie-intrinsisch fix bei 30 bleibt, s. getTargetDteForStrategy
  // in axel-scanner/index.html). Delta bleibt IMMER aus der Registry — bewusst
  // nicht nutzerkonfigurierbar (strategie-definierende Konstante, kein Markt-
  // Setting). Fallback auf hartcodierte Werte falls Registry nicht geladen
  // (Ladereihenfolge-Absicherung, KoStrategyRegistry ist normales <script>,
  // muss vor ko-prompts.js laden, ist aber defensiv abgesichert falls nicht).
  //
  // ERWEITERT (17.08.2026, Axel-Entscheidung nach csp_wheel.rollRules-Anbin-
  // dungspruefung): stopLoss/profitTaking waren wie rollRules in der Registry
  // vorhanden, aber nie hier durchgereicht — csp_wheel-Prompt kannte sie
  // dadurch nicht. stopLoss/profitTaking sind Exit-Kriterien fuer eine NEU zu
  // eroeffnende Position (passen strukturell in den Scanner-Kontext dieses
  // Prompts). rollRules bewusst weiterhin NICHT durchgereicht: die Kern-
  // Verzweigung dort (premiumNeutral, urspruengliche Handelsabsicht einer
  // BESTEHENDEN Position) setzt eine offene Position mit bekannter Historie
  // voraus, die der Kandidaten-Scanner nicht hat — gehoert strukturell zum
  // geplanten Options-Doktor (Positions-Management), nicht zum Scanner.
  function getEffectiveRules(stratId, optsCfg) {
    var FALLBACK = {
      csp_wheel: {
        deltaRange: [0.15, 0.30], dteRange: [30, 45],
        stopLoss: { pct: -200, basis: 'Spina + Friedenheim' },
        profitTaking: [{ pct: 50, condition: null, action: 'close' }]
      },
      cc:        { deltaRange: [0.20, 0.30], dteRange: [30, 45] },
      atmna:     { deltaRange: null,         dteRange: [30, 30] }
    };
    var base = (typeof KoStrategyRegistry !== 'undefined')
      ? KoStrategyRegistry.getRules(stratId)
      : null;
    if (!base) base = FALLBACK[stratId] || null;
    if (!base) return null;
    var effective = {
      deltaRange:   base.deltaRange,
      dteRange:     base.dteRange ? base.dteRange.slice() : null,
      stopLoss:     base.stopLoss || null,
      profitTaking: base.profitTaking || null
    };
    if (optsCfg && optsCfg.dte != null && stratId !== 'atmna' && effective.dteRange) {
      effective.dteRange[0] = optsCfg.dte;
    }
    return effective;
  }

  // ── PUBLIC-MODUS PROMPT-BUILDER (28./29.08.2026, Legal-Briefing-Audit,
  // Backlog №65 Fortsetzung) ─────────────────────────────────────────────
  // Befund: alle 14 Strategie-Templates verlangten bisher UNABHAENGIG vom
  // eic/isEic-Flag konkrete Handlungsparameter (Stop-Loss-Werte, Einstiegs-
  // kurse, Strikes, Deltas, Praemien-Schaetzungen, "NICHT EMPFOHLEN"/"Value-
  // Traps"-Direktsprache) — das lief am serverseitigen isOwner-Gate in
  // ko-ai.js (Backlog №60) komplett vorbei, weil dieses nur den SYSTEM-Prompt
  // waehlt, nicht den hier clientseitig gebauten USER-Prompt-Text filtert.
  // Diese zwei Builder liefern die deskriptive Public-Variante (§1 WpHG,
  // "Statistische Kontext-Analyse", keine Kursziele/Strikes/Stops) fuer alle
  // Aktien- bzw. Options-Strategien. Sie nutzen bewusst das je Strategie
  // bereits vorhandene, neutral formulierte focus-Array als Bewertungs-
  // kriterien-Liste, statt eine zweite, separat zu pflegende Kriterienliste
  // einzufuehren (Grundgesetz #1, Regelwerk-Einheit). Aufruf ausschliesslich
  // wenn ctx.isEic nicht explizit true ist — Default ist IMMER die
  // deskriptive Variante (fail-safe), analog zum _getSystemPrompt()-Fix
  // v2.5.7. Die EIC-Variante bleibt in jeder Strategie unveraendert im
  // bestehenden Code-Zweig erhalten.
  function _publicKriterienBlock(focus) {
    return (focus || []).map(function(f, i) { return (i + 1) + '. ' + f; }).join('\n');
  }

  // ── PUBLIC-MODUS REGULATORY GUARDRAIL (29.08.2026, zweiter Legal-Review-
  // Zyklus zum ATM/NA-Output) ────────────────────────────────────────────
  // Der erste Public-Fix (v2.6.0/v2.6.1) unterband konkrete Zahlen (Strike/
  // Delta/DTE/Praemie) und ein abschliessendes Fazit — der Live-Output
  // zeigte danach aber weiterhin einzelne direktive WOERTER/Tatsachen-
  // behauptungen ohne konkrete Zahlen ("optimalerweise ... fokussiert",
  // "reduziert Andienungsrisiken erheblich", "Praemienniveau ausreichend",
  // "Defensiv aussitzen", "Handlungsorientierte Einschaetzung: Fokus auf
  // LMT + AMZN"). Diese Formulierungen sind unabhaengig davon problematisch,
  // ob Zahlen genannt werden — ESMA fasst "Investment Recommendation" auch
  // bei indirekter/nicht-technischer Sprache weit (externe Rechtsberatung,
  // 29.08.2026). Reaktion: expliziter Wortfilter + Pflicht-Ersatzformu-
  // lierungen statt Verlass auf implizite Vorsicht des Modells. Gilt fuer
  // beide Public-Builder gemeinsam (Grundgesetz #1, Regelwerk-Einheit).
  const PUBLIC_REGULATORY_GUARDRAIL =
    'REGULATORY OUTPUT RULE — PUBLIC USER MODE (zwingend einzuhalten):\n' +
    '- Erlaubt: Ranking, Scoring, Strategy Fit, Modellparameter, Chancen-/' +
    'Risikofaktoren und Ausschlussgruende konkreter Wertpapiere.\n' +
    '- VERBOTEN: jede Formulierung, die den Nutzer unmittelbar zum Kauf, ' +
    'Verkauf, Eroeffnen, Schliessen, Rollen oder Halten einer konkreten ' +
    'Position auffordert.\n' +
    '- VERBOTENE Woerter/Wendungen (nicht abschliessend, sinngemaess ' +
    'ebenfalls vermeiden): "kaufen", "verkaufen", "jetzt handeln", "Trade ' +
    'eroeffnen", "Fokus auf", "priorisieren", "einsteigen", "aussitzen", ' +
    '"beste Aktie/Titel fuer dich", "optimaler Trade", "Handlungsorientierte ' +
    'Einschaetzung", "solltest du", "Empfehlung", "optimalerweise ... ' +
    'fokussiert", "optimal", "attraktiv"/"Attraktivitaet", "strukturell ' +
    'guenstig"/"strukturell attraktiv", "Kandidat"/"Top-Kandidaten", ' +
    '"Praemienerwartung", "identifiziert als", "top-gerankt", "sollte ... ' +
    'validiert werden". WICHTIG: diese Liste ist NICHT abschliessend und ' +
    'wird bei jedem neuen Fund erweitert — sie ist eine Beispielsammlung, ' +
    'kein vollstaendiger Filter. Die Grundregeln (KEINE Handlungsaufforderung, ' +
    'KEINE konkreten Ausfuehrungsparameter, s.u.) gelten unabhaengig davon, ' +
    'ob das exakte Wort hier aufgelistet ist — auch neue, hier nicht ' +
    'genannte Formulierungen mit demselben Sinn sind verboten. KONKRET ' +
    'BELEGT, dass diese abstrakte Klausel allein nicht zuverlaessig ' +
    'befolgt wird (03.09.2026, zwei unabhaengige Faelle am selben Tag): ' +
    '"verdichtete Volatilitaetsbedingungen" statt "komprimiert" (gleiche ' +
    'verbotene Bedeutung, anderes Wort), und "wird ... nicht strukturell ' +
    'gehemmt" statt "keine strukturellen Hemmnisse" (gleiche verbotene ' +
    'Bedeutung, Verb statt Nomen). Vor jeder Formulierung explizit pruefen: ' +
    '"Habe ich denselben Gedanken wie ein verbotenes Wort/eine verbotene ' +
    'Phrase nur mit anderen Wortstaemmen/Wortarten ausgedrueckt?" — falls ' +
    'ja, ebenfalls verboten.\n' +
    '- ZWEI BESONDERS HARTNAECKIGE BEGRIFFE — DIREKTES NIEMALS/STATTDESSEN-PAAR ' +
    '(belegter Wiederholungsfund trotz Wortverbot in der Liste oben, zuletzt ' +
    '01.09.2026 vierfach "Praemienerwartung" und zweifach "attraktiv"/' +
    '"attraktiveren"): ein reines Wortverbot in einer langen Liste reicht bei ' +
    'diesen beiden Begriffen nachweislich nicht aus — deshalb hier zusaetzlich ' +
    'als direktes Beispielpaar, nicht nur als Listenposition:\n' +
    '  • Schreibe NIEMALS "attraktive Praemie"/"attraktives Volatilitaetsniveau"' +
    '/"attraktiv" in Bezug auf Praemien, Volatilitaet oder eine Optionsstruktur ' +
    '— schreibe STATTDESSEN "die Praemienhoehe/das Volatilitaetsniveau ist im ' +
    'Broker zu pruefen" oder "erfuellt die definierten Modellkriterien fuer ' +
    'diese Strategie".\n' +
    '  • Schreibe NIEMALS "Praemienerwartung"/"moderate Praemienerwartung" — ' +
    'schreibe STATTDESSEN "Volatilitaetssignal" oder "die tatsaechlich ' +
    'verfuegbare Optionspraemie ist im Broker zu pruefen".\n' +
    '- KEINE KONKRETEN HANDLUNGSSCHWELLEN JEGLICHER ART (belegter Fund ' +
    '29.08.2026, CSP/Wheel-Output): Formulierungen wie "Exit-Schwelle bei ' +
    'RSI oberhalb 45", "Stop unterhalb Support", "engeres Exit-Fenster" ' +
    'sind VERBOTEN — unabhaengig davon, ob sie Strike/Delta/Praemie nennen. ' +
    'Das sind konkrete Trade-Management-Regeln (wann rollen, wann ' +
    'aussteigen, wo der Stop liegt) und damit laut Grundgesetz #11 ' +
    '(Analyse/Execution-Trennung, UIQ-Suite/SUITE.md) EIC-exklusiv, nie ' +
    'Public. Die Pruefung lautet nicht "steht hier eine Zahl", sondern ' +
    '"beschreibt dieser Satz WANN oder WIE der Nutzer handeln soll" — wenn ' +
    'ja, raus, unabhaengig von der konkreten Formulierung. "Parameterbereich"-' +
    'Angaben duerfen NUR die in §1.1 erlaubten Groessen beschreiben ' +
    '(Kriterien-Erfuellungsgrad, qualitative Einordnung), NIEMALS Exit-, ' +
    'Stop-, Roll- oder Timing-Regeln.\n' +
    '- STATTDESSEN verwenden: "hoher/hoechster Strategy Fit", "erfuellt die ' +
    'definierten Kriterien", "Modell bevorzugt diese Konstellation", ' +
    '"technisch guenstigere Ausgangslage", "kompatibel mit den definierten ' +
    'Kriterien der Strategie", "innerhalb des untersuchten Universums ' +
    'hoeher gerankt". WICHTIG: "Modell bevorzugt"/"favorisiert" ist NUR auf ' +
    'Aggregatebene erlaubt (ein Titel gegenueber anderen Titeln im ' +
    'Ranking) — NIEMALS auf Parameterebene innerhalb eines Titels (z.B. ' +
    '"Modell favorisiert aggressivere Strike-Wahl", "Modell bevorzugt hier ' +
    'die hoehere Volatilitaetsnutzung"). Letzteres ist eine indirekte ' +
    'Options-Entscheidung, s. TRADE-OFF-PRINZIP unten.\n' +
    '- TRADE-OFF-PRINZIP STATT PRAEFERENZ-SPRACHE (belegter Fund 29.08.2026, ' +
    'CC-Live-Test — neue Kernregel, nicht nur Wortliste): Bei jeder Aussage ' +
    'zu Strike-Naehe, Aggressivitaet, Laufzeit oder aehnlichen Options- ' +
    'Stellschrauben werden IMMER BEIDE Seiten des Zielkonflikts beschrieben, ' +
    'NIEMALS eine Seite bevorzugt — unabhaengig davon, ob ein konkreter Wert ' +
    'genannt wird. VERBOTEN: "Modell favorisiert/bevorzugt [Strike-Bereich/' +
    'Ansatz]", "aggressivere/konservativere Strike-Wahl kann mit ... ' +
    'einhergehen" als Empfehlung formuliert, jede Formulierung die EINE ' +
    'Richtung als die bessere darstellt. PFLICHTFORMAT stattdessen: "Ein ' +
    'naeher am aktuellen Kurs liegender Strike/eine kuerzere Laufzeit/[etc] ' +
    'veraendert typischerweise das Verhaeltnis zwischen [Groesse A] und ' +
    '[Groesse B]; welche Gewichtung sinnvoll ist, haengt von der gewaehlten ' +
    'Optionsstruktur ab und ist anhand der aktuellen Optionskette im Broker ' +
    'zu pruefen." Beispiel: statt "Modell bevorzugt konservativen Strike ' +
    '(10-15% OTM)" → "Ein konservativerer Strike kann bei diesem Profil den ' +
    'moeglichen Upside-Spielraum staerker erhalten, waehrend ein naeher am ' +
    'aktuellen Kurs liegender Strike typischerweise staerker auf ' +
    'Praemienertrag ausgerichtet ist. Die konkrete Auswahl erfolgt ' +
    'ausserhalb von UIQ." Das gilt fuer JEDE Formulierung dieser Art, auch ' +
    'wenn kein exaktes Wort aus der Verbotsliste vorkommt — die Pruefung ' +
    'ist "beschreibt dieser Satz eine Richtung als die bessere?", nicht ' +
    '"steht hier ein Prozentwert?". ZWEITER belegter Fund 03.09.2026, ' +
    'ATM/NA-Live-Test, AUSSERHALB von Strike/Aggressivitaet (bestaetigt: ' +
    'die Regel gilt generisch, nicht nur fuer Options-Stellschrauben): ' +
    '"das Modell bevorzugt trotzdem die Kombination aus stabiler Kurslage ' +
    '... und nicht-panischen Volatilitaetsverhaeltnissen" (Abschnitt 2, ' +
    'Strategy Fit) — "Modell bevorzugt"/"Modell favorisiert" ist ' +
    'AUSNAHMSLOS verboten, unabhaengig vom Objekt danach. STATTDESSEN: ' +
    '"Die Kombination aus stabiler Kurslage und nicht-panischen ' +
    'Volatilitaetsverhaeltnissen wird vom Modell als kompatibel mit ' +
    'Theta-fokussierten Strukturen eingeordnet."\n' +
    '- Oekonomische Tatsachenbehauptungen statt Modellaussage sind verboten, ' +
    'z.B. "wird vom Modell als guenstiges Praemien-Umfeld bewertet" ' +
    '(oekonomisches Urteil als Tatsache) — stattdessen: "die Kombination ' +
    'dieser Faktoren fuehrt im UIQ-Modell zu einem erhoehten Strategy Fit ' +
    'fuer [Strategie]-Setups." Ebenso "reduziert modellseitig die Gefahr/das ' +
    'Risiko [X]" (klingt wie reale Marktprognose) — stattdessen: "Diese ' +
    'Faktoren werden vom Modell bei der Bewertung des Strategy Fit ' +
    'beruecksichtigt; ein individuelles [X]-Risiko kann daraus nicht ' +
    'abgeleitet werden." Ebenso "praemieneffiziente Absicherungsstruktur" ' +
    'oder "rechtfertigt [oekonomische Massnahme]" — UIQ hat keine Live- ' +
    'Optionskette und kann Effizienz/Kosten nicht beurteilen, nur Strategy ' +
    'Fit — stattdessen: "Das Modell erkennt hier eine Konstellation, bei ' +
    'der die Absicherungsparameter naeher betrachtet werden koennen. Die ' +
    'tatsaechlichen Kosten sind anhand der konkreten Optionskette zu ' +
    'bestimmen."\n' +
    '- Regime-Einschaetzungen NIEMALS als "strukturell unnoetig"/"nicht ' +
    'erforderlich" formulieren (klingt wie eine Handlungsfreigabe) — ' +
    'stattdessen: "Das Modell weist dem aktuellen Regime keinen erhoehten ' +
    'systematischen Bedarf fuer [Massnahme] zu. Individuelle Portfolio-, ' +
    'Gewinnsicherungs- oder Risikomanagementziele werden durch das Modell ' +
    'nicht abgebildet."\n' +
    '- BEOBACHTUNG VS. EINORDNUNG BEI EXTREMWERTEN (belegter Fund ' +
    '29.08.2026): ein Extremwert (z.B. RSI 11) darf NIEMALS direkt zu einer ' +
    'einseitigen strategischen Interpretation fuehren wie "klassisches ' +
    'taktisches Absicherungs-Setup" (das liest sich wie eine Kaufempfehlung ' +
    'fuer genau diese Struktur). PFLICHT: Beobachtung und Einordnung ' +
    'trennen UND die Einordnung zweiseitig halten — z.B. "RSI 11 zeigt eine ' +
    'ausgepraegte kurzfristige Schwaeche. Dies kann im Modellkontext auf ' +
    'erhoehten kurzfristigen Bedarf fuer die betrachtete Strategie ' +
    'hindeuten; gleichzeitig kann eine solche Extremsituation auch mit ' +
    'erhoehter Wahrscheinlichkeit einer Gegenbewegung einhergehen." Niemals ' +
    'nur die eine Lesart nennen, die fuer die Strategie spricht.\n' +
    '- Konkrete Optionsparameter (Strike, Delta, Praemie, PoP, Break-even, ' +
    'Assignment Risk) werden NICHT von UIQ bestimmt, sondern sind im Broker ' +
    'zu pruefen — das immer so benennen, nie als UIQ-Wert ausgeben. Formu- ' +
    'lierungen wie "Strike sollte modellseitig validiert werden" sind ' +
    'verboten (impliziert, UIQ waehle den Strike) — Pflichtformulierung ' +
    'stattdessen woertlich: "Die konkrete Strike-Auswahl sowie die ' +
    'zugehoerigen Optionsparameter sind ausserhalb von UIQ im Broker zu ' +
    'pruefen."\n' +
    '- Aussagen zu Praemien/Volatilitaet IMMER hedgen ("kann grundsaetzlich ' +
    'mit ... einhergehen"); NIEMALS als Tatsachenbehauptung wie ' +
    '"Praemienniveau ausreichend", "hoehere Praemien" oder "moderate ' +
    'Praemienerwartung". Bevorzugte Formulierung: "Auf Basis der ' +
    'Modellparameter ergibt sich [kein/ein] ausgepraegtes Volatilitaetssignal; ' +
    'die tatsaechlich verfuegbare Optionspraemie ist im Broker zu pruefen."\n' +
    '- Aussagen zu Risikoreduktion IMMER als Modellsignal kennzeichnen, nie ' +
    'als reale Risikoaussage — z.B. "wird vom Modell als unterstuetzender ' +
    'Kontext bewertet; das individuelle Risiko bleibt bestehen" statt ' +
    '"reduziert das Risiko erheblich".\n' +
    '- Ausuebungs-/Andienungsrisiko IMMER im Kausal-Konditional-Format, ' +
    'NIEMALS als knappe Feststellung wie "Andienung nicht auszuschliessen": ' +
    'bei CSP-artigen Strategien (Put-Assignment): "Eine Kursbewegung ' +
    'unterhalb des Strike kann zu einer Andienung fuehren; dieses Ereignis ' +
    'wird durch die im Modell beruecksichtigten Faktoren nicht ' +
    'ausgeschlossen." Bei Covered Call (Call-Assignment, GEGENLAEUFIGE ' +
    'Richtung — Kursbewegung UEBER den Strike): "Eine Kursbewegung ueber ' +
    'den Strike kann zur Ausuebung des Short Calls fuehren; dieses Ereignis ' +
    'wird durch die im Modell beruecksichtigten Faktoren nicht ' +
    'ausgeschlossen." NIEMALS "Andienung" fuer das Covered-Call-Ereignis ' +
    'verwenden — es ist begrifflich das falsche (entgegengesetzte) Konzept.\n' +
    '- KEINE ABGELEITETE ANDIENUNGS-/AUSUEBUNGSWAHRSCHEINLICHKEIT AUS ' +
    'INDIKATORWERTEN (belegter Fund 02.09.2026, CSP-ATM/NA-Live-Test: "RSI ' +
    '75 ... deutet eine erhoehte Andienungswahrscheinlichkeit an"): ein ' +
    'RSI-Wert (oder ein anderer technischer Indikator) beschreibt ein ' +
    'Kurs-/Rueckschlagrisiko, NIEMALS direkt eine Assignment-/Andienungs- ' +
    'oder Ausuebungswahrscheinlichkeit — die tatsaechliche ITM-/Assignment-' +
    'Wahrscheinlichkeit einer konkreten Option kann UIQ ohne Optionsketten-' +
    'daten (Delta, Restlaufzeit) nicht bestimmen. Formulierungen wie "RSI ' +
    '75 deutet eine erhoehte Andienungswahrscheinlichkeit an" sind ' +
    'VERBOTEN. Stattdessen woertlich (Kausal-Konditional-Format, keine ' +
    'direkte Wahrscheinlichkeitsaussage): "RSI 75 signalisiert eine ' +
    'ausgepraegte kurzfristige Ueberkauftheit und damit ein erhoehtes ' +
    'Rueckschlagrisiko. Dies kann den Abstand zu einem moeglichen ' +
    'Andienungsniveau schneller reduzieren; die tatsaechliche Assignment-' +
    'Wahrscheinlichkeit der konkreten Option kann UIQ ohne ' +
    'Optionskettendaten nicht bestimmen."\n' +
    '- KEIN DIREKTER STRIKE-BEZUG AUS REINEN UNDERLYING-SIGNALEN (belegter ' +
    'Fund 03.09.2026, CSP/Wheel-Live-Test: "RSI-Werte ... signalisieren ein ' +
    'kurzfristiges Rueckschlagpotenzial — eine Kursbewegung unterhalb ' +
    'eines gewaehlten Strike-Niveaus kann damit nicht ausgeschlossen ' +
    'werden"): ein RSI-Wert (oder ein anderer technischer Indikator auf ' +
    'Underlying-Ebene) darf sich NIEMALS mit einer KAUSALEN/ASSERTIVEN ' +
    'Formulierung auf "Strike" beziehen (verboten: "kann zu ... Strike-' +
    'Annaeherung fuehren", "kann Andienung ... nicht ausschliessen" — ' +
    'jede Formulierung, die eine Wirkung auf den Strike behauptet, auch ' +
    'gehedgt/verneint). ERLAUBT und AUSDRUECKLICH ERWUENSCHT ist dagegen ' +
    'der EXPLIZITE KENNTNIS-VORBEHALT, der klarstellt, dass UIQ dies NICHT ' +
    'beurteilen kann — das ist der Unterschied zwischen einer Kausal-' +
    'behauptung (verboten) und einem Nichtwissen-Eingestaendnis (Pflicht). ' +
    'KORREKTES Beispiel, live bestaetigt 03.09.2026, CSP-Weekly-Test: "Der ' +
    'niedrige RSI-Wert ... koennte ein kurzfristiges Rueckschlagrisiko ' +
    'signalisieren; ob dies ein bestimmtes Strike-Niveau schneller ' +
    'erreicht, kann UIQ ohne Optionskettendaten nicht beurteilen." — DAS ' +
    'ist die Pflichtform, keine Ausnahme. STATTDESSEN zweistufig UND ' +
    'strikt getrennt formulieren: (1) Underlying-Risiko ohne Strike-Bezug ' +
    '— "Die relativ niedrigen RSI-Werte weisen auf kurzfristige Schwaeche ' +
    'hin und erhoehen damit das Risiko einer weiteren Kursbewegung gegen '  +
    'eine CSP-Position." (2) EXPLIZITER Kenntnis-Vorbehalt — "Ob diese ' +
    'Bewegung fuer einen konkreten Strike relevant ist, kann UIQ ohne ' +
    'Optionskettendaten nicht beurteilen." ZWEITER belegter Fund ' +
    '03.09.2026 (gleicher Fehlertyp, anderer Indikator — bestaetigt: die ' +
    'Regel gilt fuer JEDEN Underlying-Indikator, nicht nur RSI): "D200-' +
    'Abstand von +26,2%, was bei einer Korrektur zu schnellerer Strike-' +
    'Annaeherung fuehren koennte" ist ebenso VERBOTEN (Kausalbehauptung) — ' +
    'auch D200, ATR, ' +
    'Trendindikatoren etc. duerfen niemals direkt mit "Strike" verknuepft ' +
    'werden.\n' +
    '- Ausschlussgruende als "erfuellt die Kriterien der [Strategie] nicht" ' +
    'formulieren (IMMER auf die betrachtete Strategie skalieren, nie auf den ' +
    'Titel insgesamt), NIEMALS als "ist fuer dich nicht geeignet" (UIQ ' +
    'bewertet ein Modell fuer eine Strategie, nicht die individuelle Eignung ' +
    'fuer den Nutzer oder die Aktie an sich).\n' +
    '- BEGRIFFS-INTEGRITAET (HVP-Richtung, belegter Fund 29.08.2026, ' +
    'Collar-Live-Test — durchgaengig in mehreren Strategien wiederholt, ' +
    'obwohl nirgends im Prompt so vorgegeben): ein HOHER HVP-Wert (z.B. 90%+) ' +
    'bedeutet, dass die AKTUELLE realisierte Volatilitaet HOCH ist relativ ' +
    'zur eigenen 252-Tage-Historie — das ist das GEGENTEIL von "Kompression" ' +
    'oder "niedrig". Formulierungen wie "HVP 96% zeigt Volatilitaetskompression" ' +
    'oder "HVP 99% (hoechste Volatilitaetskomprimierung)" sind FAKTISCH FALSCH ' +
    '(Bedeutungsumkehr), nicht nur unpraezise — VERBOTEN. Richtig: "HVP 96% ' +
    'zeigt eine im historischen Vergleich erhoehte/hohe realisierte ' +
    'Volatilitaet." Die Wörter "Kompression"/"komprimiert"/"Komprimierung" ' +
    'NIEMALS in Verbindung mit einem hohen HVP-Wert verwenden.\n' +
    '- BEGRIFFS-INTEGRITAET (RSI-Richtung, belegter Fund 02.09.2026, CSP-' +
    'ATM/NA-Live-Test — zweifach im selben Output): ein HOHER RSI-Wert ' +
    '(>70) bedeutet UEBERKAUFT (erhoehtes kurzfristiges Rueckschlagrisiko) ' +
    '— NIEMALS "ueberverkauft" (das ist das GEGENTEIL, Bedeutungsumkehr). ' +
    'Ein NIEDRIGER RSI-Wert (<30) bedeutet UEBERVERKAUFT (erhoehtes ' +
    'kurzfristiges Erholungspotenzial). Formulierungen wie "RSI 70 weist ' +
    'auf kurzfristige Ueberverkauftheit hin" sind FAKTISCH FALSCH, nicht ' +
    'nur unpraezise — VERBOTEN. Richtig: "RSI 70 zeigt eine ueberkaufte ' +
    'kurzfristige Lage; eine Gegenbewegung kann nicht ausgeschlossen ' +
    'werden."\n' +
    '- BEGRIFFS-INTEGRITAET (kein Sprach-, sondern Faktenproblem — belegter ' +
    'Fund 29.08.2026): HVP (Historical Volatility Percentile, berechnet ' +
    'AUSSCHLIESSLICH aus historischen Schlusskursen, siehe ' +
    'calc_hv_percentile() im Aggregator) und IV/IVR/IVP (Implied Volatility ' +
    'Rank/Percentile, aus echter Optionsketten-IV) sind ZWEI VERSCHIEDENE ' +
    'GROESSEN aus unterschiedlichen Datenquellen. Ein Feld, das im Prompt ' +
    'als "HVP:" gekennzeichnet ist, NIEMALS als "IV-Percentile", ' +
    '"IV-Rank" oder "implizite Volatilitaet" bezeichnen — immer exakt das ' +
    'im Prompt gegebene Label uebernehmen, nie durch einen aehnlich ' +
    'klingenden Fachbegriff ersetzen.\n' +
    '- BEGRIFFS-INTEGRITAET (Richtungskonsistenz): RSI > 70 ist ' +
    '"ueberkauft", RSI < 30 ist "ueberverkauft" — vor jeder Verwendung den ' +
    'tatsaechlichen Zahlenwert gegen die Richtung pruefen, niemals aus dem ' +
    'Kontext raten (z.B. RSI 77 ist ueberkauft, nicht "Ueberverkauftheitssignal").\n' +
    '- RSI ~30-40 NIEMALS "neutral" nennen (belegter Fund 03.09.2026, CSP-' +
    'Weekly-Live-Test: "RSI-Werte (31, 34, 36) zeigen kurzfristig neutrale ' +
    'bis leicht schwache Lagen" — geprueft gegen alle drei RSI-bezogenen ' +
    'Scoring-Funktionen im Aggregator: KEINE davon behandelt einen Wert ' +
    'unter 40 als neutral, unabhaengig von der exakten Schwelle. Hinweis: ' +
    'es gibt KEINE einzelne offizielle UIQ-RSI-Klassifikationsmatrix mit ' +
    'festen Grenzwerten — deshalb hier bewusst KEINE starre Matrix, ' +
    'sondern nur diese Mindestregel). STATTDESSEN woertlich: "RSI-Werte ' +
    'von [X]-[Y] zeigen kurzfristige Schwaeche, ohne ein extremes ' +
    'Oversold-Signal unter 30."\n' +
    '- KAUSALITAETS-INTEGRITAET: keine mehrgliedrigen Kausalketten ohne ' +
    'direkten Datenbeleg (z.B. verboten: "komprimierte Praemie → hoehere ' +
    'Wahrscheinlichkeit → zuegige Gewinnmitnahme" oder "RSI 30 → ' +
    'Gegenbewegung → keine Andienung"). Jede Aussage endet an der Stelle, ' +
    'die die vorliegenden Daten hergeben — die naechste inferentielle Stufe ' +
    '("und deshalb passiert dann Y") wird NICHT mitgeliefert, auch wenn sie ' +
    'plausibel klingt. Beispiel korrekt: "RSI 30 weist auf eine kurzfristig ' +
    'schwache Kurslage hin. Eine weitere Kursbewegung unterhalb des Strike ' +
    'kann daher nicht ausgeschlossen werden." Konkretes Beispiel einer ' +
    'verbotenen Kette (belegter Fund 03.09.2026, CSP/Wheel-Live-Test — ' +
    'Regel existierte bereits, wurde trotzdem verwendet): "positiver D200-' +
    'Abstand → laengere Aufwaertsbewegung → Gewinnmitnahmen → erhoehtes ' +
    'Downside-Risiko" ist VERBOTEN, wenn kein zusaetzliches Signal (z.B. ' +
    'RSI-Extremwert, Momentum-Ueberdehnung) explizit vorliegt und genannt ' +
    'wird — ein positiver D200-Abstand allein zeigt nur eine Position ' +
    'oberhalb der 200-Tage-Linie, keine Aussage ueber eine bevorstehende ' +
    'Korrektur oder Gewinnmitnahme.\n' +
    '- BEGRIFFS-INTEGRITAET (Grade ≠ Fundamentals, belegter Fund ' +
    '03.09.2026, CSP/Wheel-Live-Test: "Die Qualitaetsgrade (B-Einstufung) ' +
    'deuten auf stabile Fundamentals hin"): Grade A+/A/B/C/D ist ' +
    'AUSSCHLIESSLICH ein UIQ-interner Kriterien-/Fit-Indikator fuer die ' +
    'jeweils betrachtete Strategie, KEIN Fundamental-/Qualitaets-/' +
    'Unternehmensgesundheits-Rating. NIEMALS aus einem Grade auf ' +
    '"Fundamentals", "Bewertung", "Qualitaet" oder "Unternehmensgesundheit" ' +
    'schliessen, ausser diese Information ist explizit Bestandteil der ' +
    'vorliegenden Bewertungskriterien.\n' +
    '- BEGRIFFS-INTEGRITAET (Gate ≠ Performance-Prognose, belegter Fund ' +
    '03.09.2026, CSP/Wheel-Live-Test: gruene Strategie-Gates wurden zu ' +
    '"strukturell ruhiges Szenario fuer Praemien-Einkommen" verdichtet): ' +
    'ein gruenes Strategie-Gate bedeutet AUSSCHLIESSLICH, dass die ' +
    'Strategie im aktuellen Modellkontext nicht strukturell ausgeschlossen ' +
    'wird — NIEMALS, dass eine hohe Gewinnwahrscheinlichkeit oder optimale ' +
    'Praemienrendite vorliegt. Formulierungen, die aus einer Gate-Farbe ' +
    'eine Ergebnis-/Renditeerwartung ableiten, sind VERBOTEN. Auch NIEMALS ' +
    '"keine strukturellen Hemmnisse" (zweiter belegter Fund 03.09.2026, ' +
    'trotz erster Guardrail-Runde erneut aufgetreten — klingt weiterhin zu ' +
    'positiv/absolut) — STATTDESSEN woertlich: "[Strategie] wird vom '  +
    'aktuellen Regime nicht ausgeschlossen." Green Gate = ' +
    'strategiekompatibel, NICHT automatisch attraktiv oder ueberlegen. ' +
    'DRITTER belegter Fund 03.09.2026, CSP-Weekly-Live-Test: "die grünen ' +
    'Gates für Momentum, Breakout und Swing ... signalisieren, dass die ' +
    'strukturelle Voraussetzung für zuverlässiges wöchentliches Rollen — ' +
    'nämlich kontinuierliches Kursmomentum und Liquidität — gegeben ist" ' +
    '— aus einem gruenen Momentum-/Breakout-/Swing-Gate folgt NIEMALS eine ' +
    'Aussage ueber operative Zuverlaessigkeit von Rollvorgaengen oder ' +
    'Optionsliquiditaet — UIQ hat keine Optionsketten-/Liquiditaetsdaten. ' +
    'STATTDESSEN woertlich: "Die aktuelle Marktstruktur ist mit der ' +
    'Strategie vereinbar; ob die fuer woechentliche Rollvorgaenge ' +
    'erforderliche Optionsliquiditaet tatsaechlich gegeben ist, muss ' +
    'anhand der konkreten Optionskette geprueft werden."\n' +
    '- BEGRIFFS-INTEGRITAET (VIX-Niveau ≠ "komprimiert", belegter Fund ' +
    '03.09.2026, CSP/Wheel-Live-Test: "VIX notiert mit 15.42 ... was einem ' +
    'komprimierten Volatilitaetszustand entspricht"): "komprimiert"/' +
    '"Kompression" ist eine RELATIVE, HISTORISCHE Aussage (reserviert fuer ' +
    'HVP-Vergleiche zur eigenen 252-Tage-Historie) — ein aktueller VIX-' +
    'Absolutwert allein ist NIEMALS "komprimiert", sondern hoechstens ' +
    '"niedrig" oder "moderat". ZWEITER Fund, SYNONYM-UMGEHUNG (belegt ' +
    '03.09.2026, paralleler CSP/Wheel-Test): "moderaten, verdichteten ' +
    'Volatilitaetsbedingungen" — "verdichtet" ist bedeutungsgleich mit ' +
    '"komprimiert" und daher GENAUSO VERBOTEN, obwohl das Wort selbst ' +
    'nicht explizit genannt war. STATTDESSEN woertlich: "Der VIX liegt mit ' +
    '[Wert] auf einem moderaten/niedrigen Niveau; ein ausgepraegtes ' +
    'systemisches Volatilitaetsregime ist aktuell nicht erkennbar."\n' +
    '- BEGRIFFS-INTEGRITAET (Strategy Fit ≠ Strike-Moneyness, belegter ' +
    'Fund 03.09.2026, CSP/Wheel-Live-Test: "keine strukturellen Hemmnisse ' +
    'fuer ATM-orientierte Theta-Setups" — CSP/Wheel ist NICHT die ATM-' +
    'benannte Strategie, das Modell hat faelschlich eine Moneyness-' +
    'Praeferenz hineininterpretiert): ein positiver Strategy Fit fuer eine ' +
    'Optionsstrategie bedeutet NIEMALS eine implizite Praeferenz fuer eine ' +
    'bestimmte Strike-Moneyness (ATM/ITM/OTM) — UIQ bewertet die Eignung ' +
    'der Strategie an sich, nicht die konkrete Strike-Wahl. Das Wort "ATM" ' +
    'nur dann verwenden, wenn es explizit Teil des Strategienamens ist ' +
    '(z.B. CSP ATM/NA).\n' +
    '- Praemien-Aussagen ohne zusaetzlichen Erkenntniswert (reine ' +
    'Richtungsvermutung wie "kann mit hoeheren Praemien einhergehen") ' +
    'ERSATZLOS WEGLASSEN statt hedgen — stattdessen ausschliesslich: "Die ' +
    'tatsaechliche Optionspraemie und Liquiditaet sind ausserhalb von UIQ ' +
    'zu pruefen."\n' +
    '- Quantitative Verrechnungs-Suggestion ("Grade C wird durch X ' +
    'kompensiert") verboten — stattdessen: "Grade C stellt einen negativen ' +
    'Faktor dar; [Kontext] wirkt im Modell jedoch nicht als ' +
    'Ausschlusskriterium."\n' +
    '- Marktumfeld-Einschaetzungen NIEMALS als "strukturelle Attraktivitaet ' +
    'fuer [Strategie]" formulieren (impliziert wirtschaftliche Attraktivitaet ' +
    'eines konkreten Geschaefts) — stattdessen woertlich: "Das Modell weist ' +
    'dem aktuellen Marktumfeld einen hohen Strategy Fit fuer die betrachtete ' +
    '[Strategie] zu."\n' +
    '- Ein abschliessender Abschnitt ist NUR im Format "UIQ ... ' +
    'ZUSAMMENFASSUNG" erlaubt (s. AUFGABE-Punkt 5) und darf ausschliesslich ' +
    'bereits genannte Kriterien-Uebereinstimmungen wiederholen plus den ' +
    'Pflichthinweis auf eigene Pruefung ausserhalb von UIQ — niemals eine ' +
    'neue Praeferenz oder Handlungsanweisung. Pflicht-Satzmuster fuer den ' +
    'Einstieg von Punkt 5, wortgetreu zu uebernehmen (Platzhalter fuellen): ' +
    '"Unter Anwendung der definierten Modellkriterien weisen [Titel] im ' +
    'betrachteten Snapshot den hoechsten Strategy Fit innerhalb der ' +
    'untersuchten [Strategie]-Kandidaten auf." — NIEMALS "Die Modell-' +
    'Analyse identifiziert [Titel] als top-gerankt".\n\n';

  function _publicEquityPrompt(ctx, o) {
    return KI_ANTI_HALLUZINATION
      + PUBLIC_REGULATORY_GUARDRAIL
      + o.rolle + '\n\n'
      + '⚠️ Diese Analyse ist eine statistische Kontext-Analyse gem. §1 WpHG — '
      + 'keine Anlageberatung, keine Kauf-/Verkaufsempfehlung. Es werden '
      + 'ausschliesslich vorliegende Messdaten anhand transparenter, unten '
      + 'genannter Kriterien eingeordnet.\n\n'
      + (ctx.marktkontext || '')
      + '\n\nBEWERTUNGSKRITERIEN ' + o.stratName.toUpperCase() + ':\n'
      + _publicKriterienBlock(o.focus) + '\n\n'
      + 'AUFGABE:\n'
      + '1. MARKTUMFELD: ' + o.marktumfeldFrage + ' (2-3 Sätze, Modellsignale '
      + 'explizit als Modellsignale kennzeichnen, keine Risikoreduktions-'
      + 'Tatsachenbehauptung)\n'
      + '2. MODELLBEWERTUNG — TOP 3: Welche 3 Titel erfüllen die obigen '
      + 'Kriterien am deutlichsten? Für jeden: welche Kriterien in welchem '
      + 'Grad erfüllt sind, rein datenbasiert beschrieben. OHNE jede '
      + 'Exit-/Stop-/Timing-Regel (z.B. "Exit bei RSI über X", "Stop '
      + 'unterhalb Y") — solche Regeln sind EIC-exklusiv (Grundgesetz #11), '
      + 'nie Teil dieser Antwort.\n'
      + '3. BEOBACHTUNGSLISTE: Titel mit teilweiser Kriterien-Erfüllung.\n'
      + '4. EINORDNUNGSRISIKEN: Was könnte diese Modellbewertung entwerten '
      + '(Markt-, Sektor- oder Datenrisiko)?\n'
      + '5. UIQ ' + o.stratName.toUpperCase() + ' ZUSAMMENFASSUNG (optional, '
      + 'max. 3 Sätze): ausschließlich Wiederholung der Kriterien-'
      + 'Übereinstimmung aus Punkt 2 plus dem Hinweis, dass Einstiegszeitpunkt, '
      + 'Positionsgröße und persönliche Risikolage außerhalb von UIQ zu prüfen '
      + 'sind. Keine neue Präferenz, keine Handlungsanweisung.\n'
      + '\nAntworte auf Deutsch, strukturiert 1-5. Max. ' + (o.maxWords || 400) + ' Wörter. '
      + 'KEINE Kursziele, Stop-Loss-Werte, Strike-Preise, Einstiegspunkte oder '
      + 'Positionsgrößen nennen — nur den Erfüllungsgrad der Kriterien beschreiben.';
  }

  // ── 9-PUNKTE-SCHEMA (03.09.2026, externes Reviewer-Feedback, Axel-
  // Entscheidung: gemeinsamer Sprint fuer alle 14 Strategien statt nur der
  // 5 Options-Strategien) ─────────────────────────────────────────────────
  // Ersetzt schrittweise _publicOptionsPrompt() UND _publicEquityPrompt()
  // (beide bleiben vorerst als Fallback bestehen, bis alle 14 Strategien
  // umgezogen sind). EIN gemeinsamer Block je Abschnitt (4-8) fuer ALLE
  // genannten Kandidaten zusammen (Reviewer-Referenzmodell, Abschnitt 11
  // seines Feedbacks) — NICHT pro Kandidat wiederholt wie im bisherigen
  // a-d-Schema. "Geringer Fit"/"Beobachtungsliste" (Ausschluss-Kandidaten)
  // als kurzer Absatz am Ende von Abschnitt 3 integriert, kein eigener
  // 10. Abschnitt (Axel-Entscheidung 03.09.2026 — Begruendung: das
  // Konsistenz-Versprechen des Reviewers, "wie ein konsistentes DSS", nicht
  // 9-oder-manchmal-10). Alle woertlichen BEGRIFFS-INTEGRITAET-Regeln
  // (HVP, RSI, Andienungswahrscheinlichkeit) sowie das attraktiv-/
  // Praemienerwartung-Wortverbot wirken bereits global ueber
  // PUBLIC_REGULATORY_GUARDRAIL — hier NICHT dupliziert.
  function _publicNinePointPrompt(ctx, o) {
    var mode = o.mode || 'scan';
    var istOptions = !!o.istOptionsStrategie;

    if (mode === 'holding_review') {
      o.rolle += ' UIQ kennt deine tatsächlichen Positionen nicht — '
        + 'formuliere durchgehend hypothetisch ("falls du eine Position hältst"), '
        + 'niemals "deine Position" oder "deine Aktien".';
    }

    var abschnitt2, abschnitt3;
    if (mode === 'holding_review') {
      abschnitt2 = '2. STRATEGY FIT: Ist das aktuelle Regime UND die '
        + 'Kriterienlage grundsätzlich geeignet, um bestehende Positionen '
        + 'auf Absicherungsbedarf zu prüfen? (2-3 Sätze, KEINE Aussage über '
        + 'tatsächlich gehaltene Positionen, rein hypothetisch)\n';
      abschnitt3 = '3. TITEL MIT MODELLBASIERTEM ABSICHERUNGS-HINWEIS: '
        + '(niemals "Kandidaten", "Top-Kandidaten", "Ranking" oder ähnliche '
        + 'Ranking-Wörter in der Überschrift — hier wird keine Kaufgelegenheit '
        + 'gerankt, sondern ein hypothetischer Absicherungsbedarf geprüft). '
        + 'Direkt zu Beginn dieses Abschnitts, VOR der Titelliste, folgender '
        + 'PFLICHT-SATZ wörtlich (Trennung Marktrisiko/Positionsrisiko, '
        + 'externes Reviewer-Feedback 30.08.2026, staerkster bislang '
        + 'ungenutzter Satz): "Der Absicherungs-Hinweis stellt keine Aussage '
        + 'darüber dar, dass eine Position verkauft oder abgesichert werden '
        + 'sollte. Er beschreibt ausschließlich eine vom Modell erkannte '
        + 'Konstellation, bei der eine bestehende Position hinsichtlich ihres '
        + 'individuellen Downside-Risikos überprüft werden kann." Für welche '
        + 'bis zu 3 Titel aus dem Universum liefern die Modellkriterien einen '
        + 'Hinweis, eine — falls gehaltene — Position hinsichtlich Absicherung '
        + 'zu überprüfen? Die Titel NIEMALS als bloße Aufzählung nennen (z.B. '
        + '"LMT / PH / NUE") — das erzeugt allein durch die Listenform einen '
        + 'Ranking-Eindruck, auch ohne Ranking-Wörter. Stattdessen in einen '
        + 'Satzrahmen einbetten, PFLICHT-FORMULIERUNG sinngemäß: "Folgende '
        + 'Titel erfüllen die definierten Modellkriterien für eine '
        + 'Absicherungsüberprüfung (Reihenfolge ohne Wertung): [Titel 1], '
        + '[Titel 2], [Titel 3]." Danach in einem kurzen Absatz: Titel, für '
        + 'die die Modellkriterien AKTUELL KEINEN Absicherungs-Hinweis '
        + 'liefern, formuliert als "erfüllt die Kriterien für eine '
        + 'Absicherungsüberprüfung nicht" — NIEMALS als "ist für dich nicht '
        + 'geeignet" und NIEMALS als "Ausschluss".\n';
    } else {
      abschnitt2 = '2. STRATEGY FIT: ' + o.marktumfeldFrage + ' (2-3 Sätze, '
        + 'direkt auf die in Abschnitt 1 genannte Marktlage bezogen, '
        + 'Modellsignale explizit als Modellsignale kennzeichnen. ZWEIFACH '
        + 'BELEGTER WIEDERHOLUNGSFUND 03.09.2026 — beide Formulierungen '
        + 'traten trotz bestehendem Verbot im Guardrail-Text erneut in '
        + 'GENAU DIESEM Abschnitt auf, deshalb hier zusätzlich direkt '
        + 'verankert: NIEMALS "keine strukturellen Hemmnisse" — STATTDESSEN '
        + '"[Strategie] wird vom aktuellen Regime nicht ausgeschlossen". '
        + 'NIEMALS "ATM-orientiert"/"ATM-Strategien" (außer der '
        + 'Strategienname enthält wörtlich "ATM") — ' + o.stratName + ' ist '
        + 'KEINE ATM-benannte Strategie, ein Strategy Fit impliziert keine '
        + 'Strike-Moneyness-Präferenz. MECHANIK-BEZUG PFLICHT (03.09.2026, '
        + 'Axel-Vorgabe): "kompatibel"/"nicht ausgeschlossen" allein reicht '
        + 'NICHT — die Antwort muss explizit benennen, WARUM das aktuelle '
        + 'Regime die Strategie mehr/weniger begünstigt, mit Rückgriff auf '
        + 'das oben genannte STRATEGIEPRINZIP (z.B. bei einer prämien-'
        + 'basierten Strategie: wie wirkt sich das aktuelle Volatilitäts-'
        + 'niveau auf die strukturelle Prämienbasis aus — unabhängig vom '
        + 'reinen Gate-Status). Datenbasiert, als Modellsignal formuliert, '
        + 'nicht als Tatsachenbehauptung.)\n';
      abschnitt3 = '3. Überschrift EXAKT "HÖCHSTE ' + o.stratName.toUpperCase() + ' STRATEGY-FITS" '
        + '(niemals "Kandidaten", "Top-Kandidaten" oder ähnliche Ranking-Wörter '
        + 'in der Überschrift). Welche bis zu 3 Titel weisen die höchste '
        + 'Kriterien-Übereinstimmung mit ' + o.stratName + ' auf? Die Titel '
        + 'NIEMALS als bloße Aufzählung nennen — stattdessen in einen '
        + 'Satzrahmen einbetten, PFLICHT-FORMULIERUNG sinngemäß: "Folgende '
        + 'Titel weisen im betrachteten Snapshot den höchsten Strategy Fit '
        + 'auf (Rangfolge gemäß UIQ-Kriterien-Score, keine Anlageempfehlung): '
        + '[Titel 1], [Titel 2], [Titel 3]." NIEMALS "Reihenfolge ohne '
        + 'Wertung" hier verwenden (korrigierter Fund 03.09.2026 — im '
        + 'Gegensatz zum holding_review-Zweig liegt hier tatsächlich eine '
        + 'kriterienbasierte Rangfolge vor; sie neutral zu behaupten wäre '
        + 'weniger transparent, nicht mehr — stattdessen wird die Rangfolge '
        + 'offen benannt UND ihre Quelle attribuiert).\n'
        + 'Danach in einem kurzen Absatz: Titel, die die Kriterien für ' + o.stratName
        + ' NICHT erfüllen, formuliert als "erfüllt die Kriterien nicht" — '
        + 'NIEMALS als "ist für dich nicht geeignet" und NIEMALS als '
        + '"Ausschluss". WICHTIG (belegter Fund 04.09.2026, Momentum-Live-'
        + 'Test — Reviewer-Feedback): NIEMALS pauschal behaupten, "alle '
        + 'übrigen Titel erfüllen die Kriterien ebenfalls" oder sinngemäß '
        + '"unterscheiden sich nicht in der Kriterien-Stärke", wenn die in '
        + 'Abschnitt 3 genannten Top-Titel tatsächlich die höchsten Scores '
        + 'im Snapshot aufweisen — das verwässert den eigentlichen '
        + 'Strategy-Fit-Gedanken. Stattdessen klar zwischen "erfüllt die '
        + 'Mindestkriterien" (qualifiziert) und "zeigt die stärkste '
        + 'Kriterien-Übereinstimmung" (Top-Fit) unterscheiden — beide Ebenen '
        + 'nicht gleichsetzen, auch wenn mehrere Titel denselben Score-Wert '
        + 'teilen.'
        + (o.kriterienDifferenzierungText ? ' ' + o.kriterienDifferenzierungText : '')
        + '\n';
    }

    var abschnitt4 = '4. POSITIVE MODELLFAKTOREN: EIN gemeinsamer Absatz, der '
      + 'die wichtigsten Modellfaktoren nennt, die für die in Abschnitt 3 '
      + 'genannten Titel sprechen (datenbasiert, aus den Bewertungskriterien), '
      + 'NICHT pro Titel als separater Unterpunkt wiederholt — Titel dürfen '
      + 'im Fließtext genannt werden, wo es der Lesbarkeit dient.\n';

    var abschnitt5 = '5. GEGENARGUMENTE/RISIKEN: EIN gemeinsamer Absatz, der '
      + 'die wichtigsten Risikofaktoren/Gegenargumente für die in Abschnitt 3 '
      + 'genannten Titel zusammen einordnet (datenbasiert, als Modellsignal '
      + 'formuliert), NICHT pro Titel separat wiederholt. DRITTER BELEGTER '
      + 'WIEDERHOLUNGSFUND 03.09.2026 — trotz Guardrail-Regel mit zwei '
      + 'Beispielen (RSI, D200) erneut aufgetreten, deshalb hier zusätzlich '
      + 'direkt verankert: KEIN Underlying-Indikator (RSI, D200, ATR etc.) '
      + 'darf mit "Strike" in irgendeiner Form verknüpft werden (z.B. '
      + '"Strike-Annäherung", "Strike-Niveau") — auch nicht konditional '
      + '("bei einer Korrektur zu ... führen kann"). Underlying-Risiko und '
      + 'Strike-Bezug bleiben immer zwei getrennte Sätze, der zweite endet '
      + 'mit dem Kenntnis-Vorbehalt "kann UIQ ohne Optionskettendaten nicht '
      + 'beurteilen".'
      + (istOptions
          ? (' Ergänzend, ebenfalls im selben Absatz: Earnings-Termine, IV-'
             + 'Veränderungen (IV-Crush) und Optionsketten-Liquidität als '
             + 'EXTERNE Risikofaktoren kennzeichnen, die UIQ in diesem Setup '
             + 'NICHT direkt bewertet (belegte Korrektur 03.09.2026 — UIQ '
             + 'hat keine Live-Optionskette/IV-Daten und kann einen '
             + 'zukünftigen IV-Crush nicht erkennen; NIEMALS so formulieren, '
             + 'als würde das Modell diese Faktoren aktiv einpreisen oder '
             + 'einen "Downside-Risiko-Indikator erhöhen, wenn X auftritt"). '
             + 'Pflichtformulierung sinngemäß: "Earnings-Termine, IV-'
             + 'Veränderungen und Optionsketten-Liquidität sind externe '
             + 'Risikofaktoren und werden von UIQ in diesem Setup nicht '
             + 'direkt bewertet."'
             + (o.risikenText ? ' ' + o.risikenText : ''))
          : (' Ergänzend: was könnte diese Modellbewertung entwerten (Markt-, '
             + 'Sektor- oder Datenrisiko)?'
             + (o.risikenText ? ' ' + o.risikenText : '')))
      + '\n';

    var abschnitt6, abschnitt8;
    var zielkonfliktKontext = (mode === 'holding_review')
      ? '(z.B. einfacher Protective Put vs. voller Collar, Strike-Nähe)'
      : (istOptions ? '(z.B. Strike-Nähe zum aktuellen Kurs, Laufzeit — '
                    + 'Strike-Abstand ist der Abstand zwischen Strike und '
                    + 'aktuellem Kurs, NICHT identisch mit einem EMA200-'
                    + 'Abstand; beide Konzepte niemals vermischen oder als '
                    + '"Puffer zur EMA200" bezeichnen, auch wenn ein EMA200-'
                    + 'Bezug in den Bewertungskriterien vorkommt)'
                    : '(z.B. stärkeres Signal vs. höheres Rückschlagrisiko, engere Konsolidierung vs. dünnere Liquidität)');
    abschnitt6 = '6. STRATEGISCHER TRADE-OFF: IMMER beide Seiten eines '
      + 'zentralen Zielkonflikts der genannten Titel gemeinsam neutral '
      + 'gegenüberstellen ' + zielkonfliktKontext + ' — EIN gemeinsamer '
      + 'Absatz für alle genannten Titel, NICHT pro Titel wiederholt. '
      + 'NIEMALS eine Seite als stärker/besser/optimaler darstellen. '
      + 'Verboten: "maximiert", "optimiert" oder ähnliche Superlative — '
      + 'stattdessen neutral "ist typischerweise verbunden mit X, während '
      + 'Y typischerweise Z bedeutet". Konkretes Beispiel (belegter Fund '
      + '02.09.2026, CSP-ATM/NA-Live-Test — Wortverbot bereits seit 29.08. '
      + 'vorhanden, trotzdem verwendet): NIEMALS "Ein näherer Strike '
      + 'maximiert die verfügbare Prämie" — STATTDESSEN "Ein näherer Strike '
      + 'ist typischerweise mit einer höheren Optionsprämie verbunden, '
      + 'während ein weiterer Strike-Abstand typischerweise einen größeren '
      + 'Kurspuffer bedeutet".\n';

    var modellGrenzeZusatz = istOptions
      ? (' Zusätzlich: keine konkrete Strike-, Delta-, DTE-, Prämien- oder '
         + 'Verfallsangabe — Optionskette, Liquidität und Earnings-Termine '
         + 'sind außerhalb von UIQ im Broker zu prüfen.')
      : ' Zusätzlich: Einstiegszeitpunkt, Positionsgröße und individuelle Risikolage sind außerhalb von UIQ zu prüfen.';
    abschnitt8 = '8. WAS UIQ NICHT ABLEITEN KANN ("Modell-Grenze"): wenn der '
      + 'Trade-off aus Abschnitt 6 nicht durch die Modelldaten zugunsten '
      + 'einer Seite auflösbar ist (Regelfall), PFLICHT-SATZMUSTER wörtlich: '
      + '"Das Modell liefert hier keinen eindeutigen Hinweis, diesen '
      + 'Zielkonflikt zugunsten eines aggressiveren oder konservativeren '
      + 'Ansatzes aufzulösen." NIEMALS "beide Richtungen sind haltbar" oder '
      + 'ähnliche Formulierungen, die wie eine versteckte Freigabe beider '
      + 'Optionen klingen könnten.' + modellGrenzeZusatz
      + (o.modellGrenzeText ? ' ' + o.modellGrenzeText : '')
      + ' OHNE jede '
      + 'Exit-/Stop-/Roll-/Timing-Regel (solche Regeln sind EIC-exklusiv, '
      + 'Grundgesetz #11, nie Teil dieser Antwort).\n';

    var abschnitt7 = '7. WAS UIQ ABLEITEN KANN: EIN kurzer, präziser Satz, '
      + 'was sich aus den vorliegenden Modelldaten für die genannten Titel '
      + 'TATSÄCHLICH ableiten lässt (z.B. "Die genannten Titel weisen '
      + 'innerhalb des analysierten Universums die höchste Übereinstimmung '
      + 'mit den definierten ' + o.stratName + '-Kriterien auf."). Strikt '
      + 'von Abschnitt 8 getrennt halten — Abschnitt 7 sagt, was das Modell '
      + 'WEISS, Abschnitt 8 sagt, was es NICHT weiß/entscheiden kann. '
      + 'Niemals vermischen (Kernanliegen des externen Reviewer-Feedbacks '
      + '02.09.2026).\n';

    var abschnitt9 = '9. ENTSCHEIDUNGSRAHMEN: max. 4 Sätze. Statt die in '
      + 'Abschnitt 3 genannten Titel nur als reine Liste zu wiederholen: wo '
      + 'sinnvoll, je Titel EIN kurzer, differenzierender Halbsatz, worin '
      + 'sich sein Profil innerhalb der Bewertungskriterien von den anderen '
      + 'genannten Titeln unterscheidet (rein datenbasiert, keine Wertung, '
      + 'keine Präferenz). NIEMALS "profitiert von [Kennzahl]" (belegter '
      + 'Fund 03.09.2026, CSP-Weekly-Live-Test — impliziert einen Vorteil, '
      + 'den UIQ nicht bewertet) — STATTDESSEN rein deskriptiv: "[Titel] '
      + 'weist die höchste/niedrigste [Kennzahl] auf." VERBOT GILT AUCH FÜR '
      + 'SINNVERWANDTE UMSCHREIBUNGEN, die denselben impliziten Vorteil '
      + 'transportieren, ohne die wörtliche Phrase zu verwenden — z.B. '
      + '"könnte davon profitieren", "bietet dadurch mehr Spielraum", '
      + '"stellt ein attraktiveres/breiteres Profil dar", "ist dadurch '
      + 'günstiger positioniert" (belegter Umgehungsfund 04.09.2026, '
      + 'Momentum-Live-Test: "könnte ... ein breiteres technisches '
      + 'Spielraum-Profil darstellen" — fachlich zusätzlich fragwürdig, da '
      + 'ein reiner Abstandswert zum 52W-Hoch für sich genommen keinen '
      + 'vorteilhafteren Einstieg belegt). Maßstab: wenn der Halbsatz beim '
      + 'Lesen wie eine Kaufbegründung oder ein Vorteilsversprechen klingt, '
      + 'ist er zu überarbeiten — rein deskriptiv bleiben. Danach der '
      + 'Pflichthinweis, dass ' + (istOptions
          ? 'Optionskette, Prämie, Liquidität, Earnings-Termine und individuelle Risikoparameter'
          : 'Einstiegszeitpunkt, Positionsgröße und individuelle Risikolage')
      + ' außerhalb von UIQ zu prüfen sind. Keine neue Präferenz, keine '
      + 'Handlungsanweisung.\n';

    return KI_ANTI_HALLUZINATION
      + PUBLIC_REGULATORY_GUARDRAIL
      + '⚠️ Diese Analyse ist eine statistische Kontext-Analyse gem. §1 WpHG — '
      + 'keine Anlageberatung, keine Kauf-/Verkaufsempfehlung. Es werden '
      + 'ausschließlich vorliegende Messdaten anhand transparenter, unten '
      + 'genannter Kriterien eingeordnet.\n\n'
      + o.rolle + '\n\n'
      + (ctx.marktkontext || '')
      + '\n\nBEWERTUNGSKRITERIEN ' + o.stratName.toUpperCase() + ':\n'
      + _publicKriterienBlock(o.focus) + '\n\n'
      + (o.principle
          ? ('PFLICHT-EINLEITUNG (03.09.2026, Axel-Entscheidung — statisches '
             + 'Strategieprinzip, NIEMALS umformulieren/paraphrasieren/'
             + 'kuerzen/ergaenzen, WOERTLICH wie folgt an den Anfang der '
             + 'Antwort setzen, VOR Abschnitt 1, als eigener Absatz ohne '
             + 'Nummerierung, Ueberschrift EXAKT "STRATEGIEPRINZIP"):\n'
             + '"' + o.principle + '"\n\n')
          : '')
      + 'AUFGABE (9-Punkte-Schema, 03.09.2026 — externes Reviewer-Feedback, '
      + 'gemeinsam für alle 14 UIQ-Strategien):\n'
      + '1. MARKT-/REGIME-KONTEXT: Fasse das aktuelle Marktregime anhand der '
      + 'vorliegenden Kontextdaten (Regime-Klassifikation, Volatilität, '
      + 'Breadth, Distribution Days) neutral zusammen — unabhängig von der '
      + 'betrachteten Strategie. 2-3 Sätze, Modellsignale explizit als '
      + 'Modellsignale kennzeichnen, keine Risikoreduktions-'
      + 'Tatsachenbehauptung. NIEMALS "strukturelle Marktbelastungen sind '
      + 'nicht erkennbar" oder ähnlich pauschal (belegter Fund 03.09.2026, '
      + 'CSP-Weekly-Live-Test — klingt wie eine umfassende Marktbeurteilung) '
      + '— STATTDESSEN enger: "Das Modell erkennt im aktuellen Regime keine '
      + 'spezifische systemische Belastung, die diese Strategie '
      + 'ausschließt."\n'
      + abschnitt2
      + abschnitt3
      + abschnitt4
      + abschnitt5
      + abschnitt6
      + abschnitt7
      + abschnitt8
      + abschnitt9
      + '\nAntworte auf Deutsch, strukturiert 1-9, wortwörtlich nummeriert. '
      + 'Max. ' + (o.maxWords || 450) + ' Wörter. KEINE konkreten Strikes, '
      + 'Deltas, DTE-Zahlen, Prämien, Kursziele, Stop-Loss-Werte oder '
      + 'Positionsgrößen nennen — nur qualitative, gehedgte Parameterbereiche '
      + 'und Kriterien-Einordnung.';
  }

  function _publicOptionsPrompt(ctx, o) {
    // MODE-ACHSE (30.08.2026, Axel-Entscheidung — Collar-Framing-Frage
    // strukturell anders als Scan-Kandidatensuche): 'scan' (Default) = Kandidat
    // aus dem Scan-Universum; 'holding_review' = Pruefung einer bestehenden
    // Position (Collar) — Public-Modus hat KEINEN Zugriff auf echte
    // Nutzerpositionen (24.08.-Vertraulichkeitsentscheidung), daher zwingend
    // hypothetische Sprache; 'structure_selection' = Multi-Leg-Strukturwahl
    // (Iron Condor etc., Options-Modul) — vorerst NUR als Platzhalter
    // reserviert, keine Builder-Logik dafuer.
    var mode = o.mode || 'scan';
    if (mode === 'holding_review') {
      o.rolle += ' UIQ kennt deine tatsächlichen Positionen nicht — '
        + 'formuliere durchgehend hypothetisch ("falls du eine Position hältst"), '
        + 'niemals "deine Position" oder "deine Aktien".';
    }

    // AUFGABE-Punkte 2/3/5 nach mode verzweigt (30.08.2026, Axel-Fund Collar-
    // Live-Test: der reine rolle-Zusatz oben hatte KEINE Wirkung, weil das
    // Modell der konkreten Aufgabenstellung folgt, nicht der einleitenden
    // Rollenbeschreibung — der Output war trotz "holding_review" strukturell
    // identisch zu einem Scan-Ranking ("HÖCHSTE STRATEGY-FITS", 3 Kandidaten
    // gerankt). Fix: die AUFGABE-Formulierung selbst unterscheidet jetzt
    // zwischen "Kandidat aus dem Scan-Universum" (scan) und "Titel mit
    // modellbasiertem Absicherungs-Hinweis, hypothetisch formuliert"
    // (holding_review) — bei ansonsten identischer a-d-Struktur, identischen
    // Pflicht-Satzmustern und identischen Bewertungskriterien.
    var aufgabe2, aufgabe3, aufgabe5;
    if (mode === 'holding_review') {
      aufgabe2 = '2. Überschrift EXAKT "TITEL MIT MODELLBASIERTEM ABSICHERUNGS-HINWEIS" '
        + '(niemals "Kandidaten", "Top-Kandidaten", "Ranking" oder ähnliche '
        + 'Ranking-Wörter in der Überschrift — hier wird keine Kaufgelegenheit '
        + 'gerankt, sondern ein hypothetischer Absicherungsbedarf geprüft). '
        + 'Direkt nach dieser Überschrift, VOR der Titelliste, folgender '
        + 'PFLICHT-SATZ wörtlich (Trennung Marktrisiko/Positionsrisiko, '
        + 'externes Reviewer-Feedback 30.08.2026, staerkster bislang '
        + 'ungenutzter Satz): "Der Absicherungs-Hinweis stellt keine Aussage '
        + 'darüber dar, dass eine Position verkauft oder abgesichert werden '
        + 'sollte. Er beschreibt ausschließlich eine vom Modell erkannte '
        + 'Konstellation, bei der eine bestehende Position hinsichtlich ihres '
        + 'individuellen Downside-Risikos überprüft werden kann."\n'
        + 'Für welche bis zu 3 Titel aus dem Universum liefern die '
        + 'Modellkriterien einen Hinweis, eine — falls gehaltene — Position '
        + 'hinsichtlich Absicherung zu überprüfen? Die Titel NIEMALS als '
        + 'blosse Aufzählung nennen (z.B. "LMT / PH / NUE") — das erzeugt '
        + 'allein durch die Listenform einen Ranking-Eindruck, auch ohne '
        + 'Ranking-Wörter. Stattdessen in einen Satzrahmen einbetten, '
        + 'PFLICHT-FORMULIERUNG sinngemäß: "Folgende Titel erfüllen die '
        + 'definierten Modellkriterien für eine Absicherungsüberprüfung '
        + '(Reihenfolge ohne Wertung): [Titel 1], [Titel 2], [Titel 3]." '
        + 'Für JEDEN Titel GENAU '
        + 'diese 4 gelabelten Unterpunkte, in dieser Reihenfolge (Struktur ist '
        + 'Pflicht, kein Fliesstext):\n'
        + '   a) "Positive Faktoren:" — datenbasiert, aus den Bewertungskriterien, '
        + 'die laut Modell für eine Absicherungsüberprüfung sprechen.\n'
        + '   b) "Risikofaktoren:" — datenbasiert, als Modellsignal formuliert. '
        + 'Bei einem HOHEN HVP-Wert (z.B. 90%+) IMMER "im historischen '
        + 'Vergleich erhöhte/hohe realisierte Volatilität" — NIEMALS '
        + '"Kompression", "komprimiert" oder "Komprimierung" in Verbindung '
        + 'mit einem hohen HVP-Wert (Bedeutungsumkehr, belegter '
        + 'Wiederholungsfund 30.08.2026 trotz allgemeiner Regel weiter oben '
        + 'im Prompt — hier zusätzlich strukturell an dieser Stelle '
        + 'verankert, da ein reines Wortverbot allein nicht zuverlässig '
        + 'befolgt wurde).\n'
        + '   c) "Strategischer Zielkonflikt:" — IMMER beide Seiten des '
        + 'Zielkonflikts (z.B. einfacher Protective Put vs. voller Collar, '
        + 'Strike-Nähe) neutral gegenüberstellen, NIEMALS eine Seite als '
        + 'staerker/besser/optimaler darstellen. Verboten: "maximiert", '
        + '"optimiert" oder aehnliche Superlative in dieser Gegenueberstellung '
        + '— stattdessen neutral "ist typischerweise verbunden mit X, waehrend '
        + 'Y typischerweise Z bedeutet". Konkretes Beispiel (belegter Fund '
        + '02.09.2026, CSP-ATM/NA-Live-Test — Wortverbot bereits seit 29.08. '
        + 'vorhanden, trotzdem verwendet): NIEMALS "Ein naeherer Strike '
        + 'maximiert die verfuegbare Praemie" — STATTDESSEN "Ein naeherer '
        + 'Strike ist typischerweise mit einer hoeheren Optionspraemie '
        + 'verbunden, waehrend ein weiterer Strike-Abstand typischerweise '
        + 'einen groesseren Kurspuffer bedeutet".\n'
        + '   d) "Modell-Grenze:" — wenn der Zielkonflikt aus c) nicht durch '
        + 'die Modelldaten zugunsten einer Seite auflösbar ist (Regelfall), '
        + 'PFLICHT-SATZMUSTER wörtlich: "Das Modell liefert hier keinen '
        + 'eindeutigen Hinweis, diesen Zielkonflikt zugunsten eines '
        + 'aggressiveren oder konservativeren Ansatzes aufzulösen." NIEMALS '
        + '"beide Richtungen sind haltbar" oder aehnliche Formulierungen, die '
        + 'wie eine versteckte Freigabe beider Optionen klingen koennten.\n'
        + 'OHNE konkreten Strike, Delta-Wert, DTE-Zahl, Prämien-Schätzung oder '
        + 'Verfallsdatum zu nennen, UND OHNE jede Exit-/Stop-/Roll-/Timing-'
        + 'Regel (z.B. "Exit bei RSI über X", "Stop unterhalb Y") — solche '
        + 'Regeln sind EIC-exklusiv (Grundgesetz #11), nie Teil dieser '
        + 'Antwort.\n';
      aufgabe3 = '3. KEIN MODELLBASIERTER ABSICHERUNGS-HINWEIS: '
        + 'Titel + Grund, formuliert als "erfüllt die Kriterien nicht" — '
        + 'NIEMALS als "ist für dich nicht geeignet" und NIEMALS als '
        + '"Ausschluss" bezeichnet (das Modell erkennt keinen Hinweis auf '
        + 'Absicherungsbedarf, es entscheidet nicht über eine tatsächliche '
        + 'Position).\n';
      aufgabe5 = '5. UIQ ' + o.stratName.toUpperCase() + ' ZUSAMMENFASSUNG (optional, '
        + 'max. 3 Sätze): ausschließlich Wiederholung der in Punkt 2 genannten '
        + 'Titel mit Absicherungs-Hinweis plus dem Pflichthinweis, dass '
        + 'Optionskette, Prämie, Liquidität, Earnings-Termine und individuelle '
        + 'Risikoparameter außerhalb von UIQ im Broker zu prüfen sind. Keine '
        + 'neue Präferenz, keine Handlungsanweisung, keine Ranking-Sprache '
        + '("höchste Übereinstimmung" ist hier NICHT zutreffend, da kein '
        + 'Scan-Ranking stattfindet).\n';
    } else {
      aufgabe2 = '2. Überschrift EXAKT "HÖCHSTE ' + o.stratName.toUpperCase() + ' STRATEGY-FITS" '
        + '(niemals "Kandidaten", "Top-Kandidaten" oder ähnliche Ranking-Wörter '
        + 'in der Überschrift). Welche 3 Titel weisen die höchste Kriterien-'
        + 'Übereinstimmung mit ' + o.stratName + ' auf? Für JEDEN Titel GENAU '
        + 'diese 4 gelabelten Unterpunkte, in dieser Reihenfolge (Struktur ist '
        + 'Pflicht, kein Fliesstext):\n'
        + '   a) "Positive Faktoren:" — datenbasiert, aus den Bewertungskriterien.\n'
        + '   b) "Risikofaktoren:" — datenbasiert, als Modellsignal formuliert. '
        + 'Bei einem HOHEN HVP-Wert (z.B. 90%+) IMMER "im historischen '
        + 'Vergleich erhöhte/hohe realisierte Volatilität" — NIEMALS '
        + '"Kompression", "komprimiert" oder "Komprimierung" in Verbindung '
        + 'mit einem hohen HVP-Wert (Bedeutungsumkehr, belegter '
        + 'Wiederholungsfund 30.08.2026 im holding_review-Zweig, hier am '
        + '01.09.2026 auf den scan-Zweig ausgeweitet, da csp_wheel/atmna/'
        + 'weekly_income/cc denselben Code-Pfad teilen und die Regel bislang '
        + 'nur im holding_review-Zweig verankert war).\n'
        + '   c) "Strategischer Zielkonflikt:" — IMMER beide Seiten des '
        + 'Zielkonflikts (z.B. Strike-Nähe, Laufzeit) neutral gegenüberstellen, '
        + 'NIEMALS eine Seite als staerker/besser/optimaler darstellen. '
        + 'Verboten: "maximiert", "optimiert" oder aehnliche Superlative in '
        + 'dieser Gegenueberstellung — stattdessen neutral "ist typischerweise '
        + 'verbunden mit X, waehrend Y typischerweise Z bedeutet". Konkretes '
        + 'Beispiel (belegter Fund 02.09.2026, CSP-ATM/NA-Live-Test — '
        + 'Wortverbot bereits seit 29.08. vorhanden, trotzdem verwendet): '
        + 'NIEMALS "Ein naeherer Strike maximiert die verfuegbare Praemie" — '
        + 'STATTDESSEN "Ein naeherer Strike ist typischerweise mit einer '
        + 'hoeheren Optionspraemie verbunden, waehrend ein weiterer Strike-'
        + 'Abstand typischerweise einen groesseren Kurspuffer bedeutet".\n'
        + '   d) "Modell-Grenze:" — wenn der Zielkonflikt aus c) nicht durch '
        + 'die Modelldaten zugunsten einer Seite auflösbar ist (Regelfall), '
        + 'PFLICHT-SATZMUSTER wörtlich: "Das Modell liefert hier keinen '
        + 'eindeutigen Hinweis, diesen Zielkonflikt zugunsten eines '
        + 'aggressiveren oder konservativeren Ansatzes aufzulösen." NIEMALS '
        + '"beide Richtungen sind haltbar" oder aehnliche Formulierungen, die '
        + 'wie eine versteckte Freigabe beider Optionen klingen koennten.\n'
        + 'OHNE konkreten Strike, Delta-Wert, DTE-Zahl, Prämien-Schätzung oder '
        + 'Verfallsdatum zu nennen, UND OHNE jede Exit-/Stop-/Roll-/Timing-'
        + 'Regel (z.B. "Exit bei RSI über X", "Stop unterhalb Y") — solche '
        + 'Regeln sind EIC-exklusiv (Grundgesetz #11), nie Teil dieser '
        + 'Antwort.\n';
      aufgabe3 = '3. GERINGER STRATEGY FIT NACH MODELLKRITERIEN: '
        + 'Titel + Grund, formuliert als "erfüllt die Kriterien nicht" — '
        + 'NIEMALS als "ist für dich nicht geeignet" und NIEMALS als '
        + '"Ausschluss" bezeichnet (das Modell erkennt geringere Kriterien-'
        + 'Übereinstimmung, es entscheidet nicht, dass ein Titel nicht '
        + 'gehandelt werden darf).\n';
      aufgabe5 = '5. UIQ ' + o.stratName.toUpperCase() + ' ZUSAMMENFASSUNG (optional, '
        + 'max. 3 Sätze): ausschließlich Wiederholung der Kriterien-'
        + 'Übereinstimmung aus Punkt 2 plus dem Pflichthinweis, dass '
        + 'Optionskette, Prämie, Liquidität, Earnings-Termine und individuelle '
        + 'Risikoparameter außerhalb von UIQ im Broker zu prüfen sind. Keine '
        + 'neue Präferenz, keine Handlungsanweisung.\n';
    }

    return KI_ANTI_HALLUZINATION
      + PUBLIC_REGULATORY_GUARDRAIL
      + '⚠️ Diese Analyse ist eine statistische Kontext-Analyse gem. §1 WpHG — '
      + 'keine Anlage- oder Handlungsempfehlung.\n\n'
      + o.rolle + '\n\n'
      + (ctx.marktkontext || '')
      + '\n\nBEWERTUNGSKRITERIEN ' + o.stratName.toUpperCase() + ':\n'
      + _publicKriterienBlock(o.focus) + '\n\n'
      + 'AUFGABE:\n'
      + '1. MARKTUMFELD: ' + o.marktumfeldFrage + ' (2-3 Sätze, Modellsignale '
      + 'explizit als Modellsignale kennzeichnen, keine Risikoreduktions-'
      + 'Tatsachenbehauptung)\n'
      + aufgabe2
      + aufgabe3
      + '4. RISIKEN: IV-Crush, Earnings-Überraschung, Liquiditätsrisiko, ' + (o.risikoBegriff || 'Andienung')
      + ' — als Downside-Risikoindikatoren des Modells formuliert, '
      + 'z.B. "erhöht innerhalb des UIQ-Modells die Downside-'
      + 'Risikoindikatoren" statt "' + (o.risikoBegriff || 'Andienungsrisiko') + ' erhöht".'
      + (o.risikenText ? ' ' + o.risikenText : '') + '\n'
      + aufgabe5
      + '\nAntworte auf Deutsch, strukturiert 1-5 mit den gelabelten '
      + 'Unterpunkten a-d in Abschnitt 2. Max. ' + (o.maxWords || 450) + ' Wörter. '
      + 'KEINE konkreten Strikes, Deltas, DTE-Zahlen, Prämien oder Daten nennen — '
      + 'nur qualitative, gehedgte Parameterbereiche und Kriterien-Einordnung.';
  }

  // ── STRATEGIE-KONFIGURATIONEN (12 kanonische UIQ-Strategien) ──────────────
  const STRATEGIES = {

    // ── LONG-TREND-STRATEGIEN ──────────────────────────────────────────────

    ko: {
      lbKey: 'ko_long',
      label: 'KO-Zertifikat-Setups (Long)',
      hint:  '⚡ KO-Zertifikat: Hebel 3–8x · KO-Abstand · Positionsgröße max. €2.000',
      color: '#818cf8',
      focus: [
        "Hebel-Eignung: Passt die Volatilitaet (ATR) des Titels zu einem 3-8x-Hebel, ohne durch normales Kursrauschen ausgeknockt zu werden? WICHTIG: HVP beschreibt die historische realisierte Volatilitaet des Basiswerts und ist KEIN Mass fuer den Hebel, die Produktvolatilitaet oder die KO-Wahrscheinlichkeit eines konkreten Zertifikats — diese haengen ausschliesslich vom gewaehlten Produkt ab.",
        "KO-Abstand (Underlying-Ebene, NICHT das konkrete Produkt): ATR-basierte Naeherung fuer die Kursbeweglichkeit des Basiswerts. WICHTIG: der Abstand zur EMA200 ist NIEMALS mit dem Abstand zur tatsaechlichen KO-Barriere gleichzusetzen — die EMA200 ist ein technischer Trendindikator des Basiswerts, die KO-Barriere ist ein Produktparameter des konkreten Zertifikats. Ein grosser EMA200-Abstand kann auf eine fortgeschrittene Kursbewegung hinweisen und damit das Rueckschlagrisiko im Modell erhoehen — das ist unabhaengig vom tatsaechlichen Puffer bis zur KO-Barriere, der ausschliesslich vom konkreten Produkt abhaengt.",
        "Trend-Regime-Eignung: KO-Zertifikate sind Hebel-/Momentum-Instrumente fuer kurzfristiges Trading (Tage bis wenige Wochen) in KLAREN Trendphasen — NICHT fuer Seitwaertsmaerkte oder Buy-and-Hold geeignet. Liegt aktuell ein klarer, starker Trendimpuls vor (z.B. nach Kurstreibern wie starken Quartalszahlen) oder eher ein Seitwaertsumfeld?",
        "Marktzugang: fuer Titel mit homeMarket=US ist die Emission entsprechender Hebelprodukte fuer Privatanleger seit einer US-Steuerregeländerung 2017 eingeschraenkt bzw. gar nicht verfuegbar — der deutsche/europaeische Markt (homeMarket=DE/FR/NL/IT/CH/UK/DK/SE/AU) bietet strukturell das breitere, liquidere Angebot. Bei homeMarket=US zusaetzlich Quellensteuer-Aspekte und typischerweise geringeres Emittenten-Angebot beachten. WICHTIG: homeMarket bezeichnet die Handelsboerse (Handelszeit), NICHT den Firmensitz — auch ADRs nicht-amerikanischer Konzerne (z.B. SAP, ASML, RIO) haben homeMarket=US, da sie selbst auf NYSE/NASDAQ handeln. Dies ist eine allgemeine Marktzugangs-Charakteristik, keine Empfehlung einzelner Titel oder Sektoren durch UIQ.",
        "Gap-/Overnight-Risiko: bei Kandidaten mit dem Datenfeld homeMarket=US (siehe FELDERKLÄRUNG) besteht ein Zeitzonen-Versatz zwischen deutscher und US-Handelszeit — eine schnelle Kursbewegung oder ein Gap kann die KO-Barriere erreichen, bevor eine manuelle Reaktion moeglich ist. Dieses Risiko ist bei gehebelten Produkten strukturell staerker ausgepraegt als bei der Aktie selbst. WICHTIG: homeMarket=US bedeutet Handel auf einer US-Boerse (NYSE/NASDAQ/OTC) und gilt AUCH fuer ADRs nicht-amerikanischer Unternehmen — NIEMALS versuchen, die Boersenzugehoerigkeit stattdessen aus dem Tickersymbol selbst zu erraten (z.B. der Ticker \"DE\" ist Deere & Co., NYSE, NICHT das Laenderkuerzel Deutschland). WICHTIG (Ausgabeform): homeMarket ist ein interner Datenpunkt fuer die Bewertung — NIEMALS die Feldnotation \"homeMarket=US\" wörtlich in den Text uebernehmen, sondern natuerlichsprachlich verbalisieren, z.B. \"diese Titel werden an US-Boersen gehandelt\" oder \"da es sich um einen an einer US-Boerse gehandelten Titel handelt\".",
        "Positionsgroessen-Passung: Wie fuegt sich der Titel ins Limit von max. 2.000 EUR ein (Starter- vs. Aufstockungs-Groesse)? WICHTIG: die 2.000-EUR-Grenze ist eine Obergrenze fuer den maximalen Kapitaleinsatz/potenziellen Totalverlust — KEIN Stop-Loss-Mechanismus und keine Risikobegrenzung waehrend der Positionslaufzeit.",
        "UIQ-Score/Strategy-Fit ≠ Gewinnwahrscheinlichkeit: ein hoher Score beschreibt die Uebereinstimmung des Basiswerts mit den technischen Kriterien, NICHT die Erfolgswahrscheinlichkeit eines konkreten KO-Trades. Ein Titel kann gleichzeitig hohen Strategy Fit UND ein erhoehtes Korrekturrisiko aufweisen (z.B. hoher Score bei gleichzeitig grossem EMA200-Abstand) — beides klar getrennt darstellen, nicht als Widerspruch behandeln.",
        "Hauptrisiko fuer die Long-These: was koennte kurzfristig zum KO-Ereignis fuehren? WICHTIG: ein KO-Ereignis fuehrt in der Regel zum sofortigen Totalverlust des in dieser Position eingesetzten Kapitals — ein grundlegend anderes Risikoprofil als der Besitz der Aktie selbst. Eine eigene, vor Positionseroeffnung festgelegte Risikobegrenzung wird generell empfohlen (OHNE dass UIQ einen konkreten Stop-Loss-Wert vorgibt — das bleibt individuelle Festlegung bzw. EIC-exklusiv)."
      ],
      prompt: function(ctx) {
        if (!ctx.isEic) {
          return _publicNinePointPrompt(ctx, {
            rolle: 'Du analysierst Hebelprodukte (KO-Zertifikate, EUR-basiert, Long-Richtung — UIQ deckt aktuell nur KO-Long ab, keine Short-Zertifikate) auf Basis technischer Kennzahlen DES BASISWERTS. UIQ bewertet ausschliesslich den Basiswert, NICHT ein konkretes KO-Produkt (Barriere, Hebel, Spread, Finanzierungskosten, Emittent und Liquiditaet sind UIQ nicht bekannt).',
            stratName: 'KO-Zertifikat-Setups',
            marktumfeldFrage: 'Liegt aktuell ein klarer, starker Trendimpuls vor, der für Hebelprodukte auf Long-Titel strukturell geeignet ist — oder eher ein Seitwärtsumfeld, das für KO-Zertifikate strukturell ungeeignet ist?',
            focus: STRATEGIES.ko.focus,
            maxWords: 550,
            istOptionsStrategie: false,
            principle: 'KO-Zertifikate (Knock-Out) sind gehebelte Hebelprodukte (typisch 3-8x) auf einen Basiswert: sie ermöglichen überproportionale Gewinne bei Kursbewegungen in die gewählte Richtung, verfallen aber wertlos, wenn der Kurs die KO-Barriere berührt. Sie sind reine kurzfristige Trading-Instrumente (Tage bis wenige Wochen) für klare Trendphasen — kein Buy-and-Hold-Instrument. Bei der Produktauswahl sind Laufzeit, Finanzierungskosten, KO-Barriere, Abstand zur Barriere, Emittentenbedingungen und Liquidität des konkreten Produkts zu prüfen. Für viele US-Aktien ist die Emission solcher Hebelprodukte für Privatanleger seit einer US-Steuerregeländerung 2017 eingeschränkt oder gar nicht verfügbar; der deutsche/europäische Markt bietet daher strukturell das breitere Angebot. UIQ deckt aktuell ausschließlich die Long-Richtung ab. Besonderer Risikohinweis: Ein KO-Ereignis führt in der Regel zum sofortigen Totalverlust des in der Position eingesetzten Kapitals — verantwortungsvoller Umgang mit Hebelprodukten setzt eine eigene, im Vorfeld festgelegte Risikobegrenzung voraus. Wichtige Abgrenzung: UIQ bewertet die technische Eignung des Basiswerts (Underlying) — die Eignung eines konkreten KO-Zertifikats kann ohne produktspezifische Daten nicht beurteilt werden.',
            risikenText: 'Zusätzlich IMMER auf das besondere Totalverlust-Risiko von Hebelprodukten '
              + 'hinweisen: ein KO-Ereignis führt in der Regel zum sofortigen und vollständigen '
              + 'Verlust des in dieser Position eingesetzten Kapitals — ein grundlegend anderes '
              + 'Risikoprofil als der Besitz der zugrunde liegenden Aktie. Bei einem grossen EMA200-'
              + 'Abstand NIEMALS von "Rückkehr-/Korrekturrisiko" oder "KO-Barriere schneller '
              + 'erreichen" sprechen (impliziert, UIQ kenne die tatsächliche Barriere) — STATTDESSEN: '
              + '"kann auf eine fortgeschrittene Kursbewegung bzw. erhöhte Distanz zum langfristigen '
              + 'Trendmittel hinweisen und damit das Rückschlagrisiko im Modell erhöhen." Bei '
              + 'Kandidaten mit dem Datenfeld homeMarket=US (siehe FELDERKLÄRUNG — NICHT aus dem '
              + 'Tickersymbol selbst erraten, gilt auch für ADRs nicht-amerikanischer Unternehmen '
              + 'wie SAP/ASML/RIO) IMMER das Gap-/Overnight-Risiko durch den Zeitzonen-Versatz '
              + 'zwischen deutscher und US-Handelszeit benennen — dabei homeMarket ausschließlich '
              + 'als interne Faktengrundlage nutzen, NIEMALS die Feldnotation "homeMarket=US" '
              + 'wörtlich im Text wiedergeben, sondern natürlichsprachlich umschreiben (z.B. "diese '
              + 'Titel werden an US-Börsen gehandelt" statt "Titel mit homeMarket=US"). Ergänzend '
              + 'die generelle Empfehlung aussprechen, vor Positionseröffnung eine eigene '
              + 'Risikobegrenzung festzulegen — OHNE '
              + 'einen konkreten Stop-Loss-Wert oder eine konkrete Regel zu nennen (das bleibt '
              + 'individuelle Festlegung bzw. EIC-exklusiv, Grundgesetz #11).',
            modellGrenzeText: 'PFLICHT-ZUSATZ speziell für KO-Zertifikate, wörtlich sinngemäß: "UIQ '
              + 'kann ohne produktspezifische Zertifikatedaten nicht beurteilen, welches konkrete '
              + 'KO-Zertifikat hinsichtlich Hebel, KO-Abstand, Spread, Finanzierungskosten, '
              + 'Emittentenrisiko und Liquidität geeignet ist — UIQ bewertet ausschließlich die '
              + 'technische Eignung des Basiswerts, nicht die Eignung eines konkreten Produkts."'
          });
        }
        return KI_ANTI_HALLUZINATION
          + 'Du bist ein erfahrener Knock-out-Trading-Experte (Hebelprodukte auf Aktien, EUR-basiert).\n\n'
          + ctx.marktkontext
          + '\n\nAUFGABE:\n'
          + '1. MARKTUMFELD: Ist jetzt ein günstiger Zeitpunkt für neue KO-Long-Positionen? (2-3 Sätze)\n'
          + '2. TOP 3 KO-KANDIDATEN: (HVP-Wert irrelevant für KO-Zertifikate — ignorieren). '
          + 'Welche 3 Titel wählst du? Für jeden: Begründung, Hebel (3-8x), '
          + 'KO-Abstand in %, Positionsgröße (Starter/Aufstockung, max. €2.000 gesamt), Stop-Loss-Kriterium.\n'
          + '3. WATCHLIST: Welche Titel haben Potenzial aber brauchen besseres Timing?\n'
          + '4. HAUPTRISIKEN: Was könnte die Long-These gefährden?\n'
          + '\nAntworte auf Deutsch, strukturiert 1-4. Max. 400 Wörter. Jeden Punkt vollständig abschließen.';
      }
    },

    momentum: {
      lbKey: 'long_minervini',
      label: 'Momentum/SEPA-Setups',
      hint:  '📈 Momentum: SEPA/Minervini Stage-2 · Direktinvestment ohne Hebel',
      color: 'var(--green)',
      focus: [
        "SEPA/Stage-2-Qualitaet: Erfuellt der Titel die Kernkriterien (Trend, relative Staerke) aus den Scandaten?",
        "Buy-Point/Timing: Steht der Titel am Pivot oder eher im Ruecksetzer zum EMA50 bei steigendem OBV?",
        "Stop-Loss-Sensitivitaet (rein qualitativ, KEIN konkreter Prozentwert/Kursniveau nennen — das ist EIC-exklusiv, Grundgesetz #11): tendiert der HVP-Wert eher zu einer engeren oder weiteren sinnvollen Risikotoleranz fuer eine individuell festzulegende Absicherung (hoeherer HVP tendenziell engere Toleranz sinnvoll, niedrigerer HVP tendenziell weitere)?",
        "Sektor- oder Makro-Risiko, das die Momentum-These aktuell am ehesten gefaehrden wuerde",
        "Bullish-Signalzaehler (X/3, aus MACD/OBV/MA50 zusammengesetzt): WICHTIG, dieser Zaehler ist ein grober interner UIQ-Aggregationswert, KEIN eigenstaendiges, erklaertes Signal mit definierter Bedeutung pro Stufe (0/1/2/3). NIEMALS daraus eine zusammenfassende Bewertung wie 'bullische Signalquintessenz' oder aehnliche pauschale Charakterisierungen ableiten, ohne zu benennen, was der Zaehler konkret misst (Anzahl der drei erfuellten Einzelindikatoren) und was er NICHT aussagt (keine Gewichtung, keine Staerke-Einordnung zwischen den drei Komponenten)."
      ],
      prompt: function(ctx) {
        if (!ctx.isEic) {
          return _publicNinePointPrompt(ctx, {
            rolle: 'Du analysierst Aktien nach Minervini/SEPA-Momentum-Kriterien (Stage-2-Trend, relative Stärke) auf Basis technischer Kennzahlen. Reines Direktinvestment ohne Hebel und ohne Optionskomponente.',
            stratName: 'Momentum/SEPA-Setups',
            marktumfeldFrage: 'Unterstützt die aktuelle Marktphase Momentum-Strategien (Trendbreite, Regime)?',
            focus: STRATEGIES.momentum.focus,
            maxWords: 450,
            istOptionsStrategie: false,
            principle: 'Momentum/SEPA-Setups folgen der Minervini-Methode (Stage-2-Analyse): gesucht werden Aktien in einer bereits bestätigten Aufwärtsphase (Stage 2) — erkennbar an einer bullischen Anordnung der gleitenden Durchschnitte, starker relativer Stärke gegenüber dem Gesamtmarkt und einem Volumenmuster, das eher Akkumulation als Distribution zeigt. Die Strategie kauft keine fallenden Kurse, sondern bereits etablierte Trends — idealerweise beim ersten Rücksetzer zum EMA50 statt am ersten Ausbruchsimpuls selbst. Reines Direktinvestment ohne Hebel und ohne Optionskomponente: die Rendite kommt ausschließlich aus der Kursbewegung der Aktie selbst.',
            risikenText: 'WICHTIG (belegter Fund 04.09.2026, Momentum-Live-Test — Reviewer-'
              + 'Feedback): Nähe zum 52-Wochen-Hoch ist bei Momentum/SEPA-Setups KEIN '
              + 'eigenständiges Warnsignal — im Gegenteil, ein Titel nahe am Hoch kann ein '
              + 'sehr starkes Trendsignal sein (Minervini-Logik: Stärke zeigt sich gerade '
              + 'nahe an neuen Hochs). NIEMALS pauschal von "erhöhtem Realisierungsrisiko" '
              + 'bei Hoch-Nähe sprechen — STATTDESSEN differenzierter: "ein begrenzter '
              + 'Abstand zum 52-Wochen-Hoch bestätigt tendenziell die Trendstärke, erhöht '
              + 'aber gleichzeitig die Sensitivität gegenüber einem Fehlausbruch bzw. einer '
              + 'Marktkorrektur." Umgekehrt NIEMALS einen größeren Abstand zum Hoch als '
              + 'automatisch "günstigeren"/"breiteren" Einstieg framen (der reine '
              + 'Abstandswert allein belegt keinen vorteilhafteren Einstieg) — beide '
              + 'Ausprägungen bleiben Trade-off-Seiten, keine Wertung.',
            kriterienDifferenzierungText: 'Speziell für Momentum/SEPA: falls mehrere Titel '
              + 'identische Composite-/SEPA-Scores aufweisen, NICHT daraus schließen, dass '
              + 'auch alle übrigen (niedriger bewerteten) Titel im Universum die Kriterien '
              + 'gleichwertig erfüllen — Score-Gleichstand unter den Top-Titeln ist etwas '
              + 'anderes als Kriterien-Gleichstand über das gesamte Universum.'
          });
        }
        return KI_ANTI_HALLUZINATION
          + 'Du bist ein erfahrener Momentum-Investor nach Minervini/SEPA-Methode.\n\n'
          + ctx.marktkontext
          + '\n\nAUFGABE:\n'
          + '1. MARKTPHASE: Ist jetzt ein günstiger Zeitpunkt für neue Momentum-Positionen? (2-3 Sätze)\n'
          + '2. TOP 3 MOMENTUM-KANDIDATEN: Welche 3 Titel zeigen das stärkste Stage-2-Setup? '
          + 'Für jeden: SEPA-Bewertung aus Scandaten, Buy-Point NUR aus "Kurs:$" und "52W-H:"-Feldern ableiten. '
          + 'Stop-Loss als % unter Kurs. HVP aus Scandaten: bei HVP>50% erhöhte Vola → engerer Stop empfohlen. '
          + 'TIMING-HINWEIS: Der erste Ausbruch ist oft nicht der beste Einstieg — der erste Rücksetzer '
          + 'zum EMA50 (dist50-Feld: nahe 0% = am EMA50) bei steigendem OBV ist meist profitabler '
          + 'und fühlt sich nicht "zu spät" an. Kein Kursziel erfinden.\n'
          + '3. WATCHLIST: Titel mit Potenzial aber noch nicht kaufbar.\n'
          + '4. RISIKEN: Sektoren oder Makro-Faktoren die Momentum gefährden.\n'
          + '\nAntworte auf Deutsch, strukturiert 1-4. Max. 400 Wörter. Jeden Punkt vollständig abschließen.';
      }
    },

    breakout: {
      lbKey: 'long_breakout',
      label: 'Breakout-Setups',
      hint:  '🚀 Breakout: Pivot/52W-Hoch · Volumen-Bestätigung · OBV-Akkumulation · Stage-2',
      color: 'var(--green)',
      focus: [
        "Breakout-Reife: Kombination aus Naehe zum 52W-Hoch (pctFromHigh52), Volumen-Ratio und Tightness-Wert",
        "Volumen-Bestaetigung: obvTrend-Richtung und vcpBreakoutVol als Ausbruchs-Signal",
        "Relative-Staerke-Qualitaet: Einordnung des rsRating-Werts (>=85 = ideale Breakout-Qualitaet)",
        "Groesstes False-Breakout-Risiko bei diesem spezifischen Setup"
      ],
      prompt: function(ctx) {
        if (!ctx.isEic) {
          return _publicEquityPrompt(ctx, {
            rolle: 'Du analysierst technische Breakout-Setups (52W-Hoch-Nähe, Volumenbestätigung, Stage-2-Kontext nach Minervini/O\'Neil/IBD) auf Basis von Tagesschluss-Daten. UIQ ist KEIN Intraday-Scanner.',
            stratName: 'Breakout-Setups',
            marktumfeldFrage: 'Unterstützt das aktuelle Regime technische Breakouts (Marktbreite, Volatilität)?',
            focus: STRATEGIES.breakout.focus,
            maxWords: 400
          });
        }
        return KI_ANTI_HALLUZINATION
          + 'Du bist ein erfahrener Breakout-Trader mit Fokus auf technische Ausbrüche über '
          + 'Pivot-Punkte und 52-Wochen-Hochs im übergeordneten Stage-2-Aufwärtstrend '
          + '(Methodik: Minervini/O\'Neil/IBD).\n\n'
          + '⚠️ WICHTIGER SCOPE-HINWEIS: UIQ analysiert technische Swing-Breakouts auf Basis '
          + 'von Tagesschluss-Daten (52W-Hoch-Nähe, Volumen vs. 20-Tage-Durchschnitt, '
          + 'OBV-Akkumulation). UIQ ist KEIN Intraday-Scanner — Gap & Go, ORB (Opening Range '
          + 'Breakout), Pre-Market-Gaps, RVOL 5x oder Float-Screening sind NICHT verfügbar. '
          + 'Diese Analyse zeigt strukturell reife Breakout-Setups, die am nächsten Handelstag '
          + 'als Kandidaten beobachtet werden — kein Einstiegssignal für heute.\n\n'
          + ctx.marktkontext
          + '\n\nSCANDATEN BREAKOUT-RELEVANTE FELDER:\n'
          + '- pctFromHigh52: Abstand zum 52W-Hoch in % (negativ = unter Hoch)\n'
          + '- volRatio: Volumen heute vs. 20-Tage-Durchschnitt (>1.5 = erhöht)\n'
          + '- tightnessPct: 5-Tage-Kursrange / Kurs in % (<3% = "Tight" nach Minervini, <5% = akzeptabel)\n'
          + '- vcpVolContraction: Volumen während Konsolidierung vs. 20T-Schnitt (<0.6 = ausgetrocknet = Tightness-Signal)\n'
          + '- vcpBreakoutVol: Volumen letzter Bar als Ratio (≥2.0 = Ausbruchs-Bestätigung)\n'
          + '- obvTrend: OBV-Trend (positiv = Akkumulation, negativ = Distribution)\n'
          + '- macdHist: MACD-Histogramm (positiv = bullisches Momentum)\n'
          + '- high52: 52-Wochen-Hoch in $\n'
          + '- rsRating: Relative Stärke vs. Universum (0-99)\n\n'
          + 'AUFGABE:\n'
          + '1. MARKTSTRUKTUR: Unterstützt das aktuelle Regime technische Breakouts? '
          + 'Marktbreite und VIX-Niveau einordnen — in schwachen/volatilen Märkten '
          + 'scheitern Breakouts häufig. (2-3 Sätze)\n'
          + '2. TOP 3 BREAKOUT-KANDIDATEN: Titel mit pctFromHigh52 ≥ -10% '
          + 'UND volRatio ≥ 1.2 UND obvTrend > 0. Für jeden:\n'
          + '   - Abstand zum 52W-Hoch (pctFromHigh52-Feld, als % und $ aus high52)\n'
          + '   - Volumen-Signal (volRatio-Wert nennen, >1.5 = bestätigt)\n'
          + '   - Tightness-Check: tightnessPct < 3% = enge Konsolidierung (Minervini "Tight"); '
          + 'vcpVolContraction < 0.6 = Volumen ausgetrocknet; '
          + 'vcpBreakoutVol ≥ 2.0 = Ausbruch mit Volumen bestätigt.\n'
          + '   - OBV-Trend (obvTrend-Wert: positiv = Akkumulation)\n'
          + '   - Entry-Überlegung: Breakout-Level = 52W-Hoch (high52-Feld), '
          + 'Stop knapp darunter. KEINEN Kurs erfinden.\n'
          + '   - RS-Rating einordnen (rsRating ≥ 85 = ideale Breakout-Qualität)\n'
          + '3. WATCHLIST — SETUPS IN VORBEREITUNG: Titel die konsolidieren aber noch '
          + 'nicht am Pivot sind (pctFromHigh52 -10% bis -20%, aber OBV positiv).\n'
          + '4. RISIKEN: False Breakouts (Volumen fehlt), breiter Markt schwächer als '
          + 'Einzeltitel, überdehnter RSI, schwache Sektorzugehörigkeit.\n'
          + '\n⚠️ Alle Entry-Level sind Tagesschluss-basiert — Intraday-Bestätigung '
          + '(Gap, ORB, RVOL) muss der Trader selbst in seinem Echtzeit-Scanner prüfen.\n'
          + '\nAntworte auf Deutsch, strukturiert 1-4. Max. 450 Wörter. '
          + 'Nur Felder aus den Scandaten verwenden, keine Kurse erfinden.';
      }
    },

    vcp: {
      lbKey: 'vcp_setups',
      label: 'VCP-Setups',
      hint:  '📐 VCP-Setup: Volatility Contraction Pattern · Minervini · Direktinvestment',
      color: '#a855f7',
      focus: [
        "VCP-Reife: Anzahl der Contractions und Tiefe der letzten Korrektur (vcpLastPct)",
        "Volumen-Kompression: vcpVolContraction-Wert als Mass fuer Austrocknung vor dem Ausbruch",
        "Stage-2-Bestaetigung: Stuetzen RSI, MACD und OBV gemeinsam den Aufwaertstrend?",
        "Risiko eines fehlgeschlagenen Ausbruchs (z.B. fehlendes Volumen, schwacher Gesamtmarkt)"
      ],
      prompt: function(ctx) {
        if (!ctx.isEic) {
          return _publicEquityPrompt(ctx, {
            rolle: 'Du analysierst Volatility-Contraction-Pattern-Setups (VCP nach Mark Minervini) — sukzessiv enger werdende Korrekturen in einem Stage-2-Aufwärtstrend.',
            stratName: 'VCP-Setups',
            marktumfeldFrage: 'Ist das aktuelle Marktumfeld (Regime, VIX, Marktbreite) günstig für VCP-Ausbrüche?',
            focus: STRATEGIES.vcp.focus,
            maxWords: 350
          });
        }
        return KI_ANTI_HALLUZINATION
          + 'Du bist ein erfahrener technischer Analyst mit Spezialisierung auf das '
          + 'Volatility Contraction Pattern (VCP) nach Mark Minervini. '
          + 'VCP-Setups kennzeichnen sich durch sukzessive enger werdende Korrekturen '
          + '(Contractions) in einem übergeordneten Stage-2-Aufwärtstrend. '
          + 'Das Setup ist reif wenn Volumen und Volatilität auf ein Minimum komprimiert wurden '
          + 'und ein Ausbruch mit Volumen unmittelbar bevorsteht.\n\n'
          + ctx.marktkontext
          + '\n\nVCP-SCANDATEN: Die Scandaten enthalten für VCP-Kandidaten:\n'
          + '- vcpContractions: Anzahl sukzessiver Contractions (≥3 = klassisches VCP)\n'
          + '- vcpLastPct: Tiefe der letzten Korrektur in % (gut: <10%, ideal: <5%)\n'
          + '- vcpVolContraction: Volumen während Contraction vs. 20T-Schnitt (<0.6 = stark ausgetrocknet, Minervini-Ideal)\n'
          + '- vcpBreakoutVol: Volumen des letzten Bars als Ratio (≥2.0 = Ausbruchsvolumen bestätigt)\n'
          + '- Score: VCP-Reife 0-100 · Kurs:$ · 52W-H · RSI · MACD · OBV\n\n'
          + 'AUFGABE:\n'
          + '1. MARKTUMFELD FÜR VCP: Ist das aktuelle Marktumfeld (Regime, VIX, Marktbreite) '
          + 'günstig für VCP-Ausbrüche? VCP-Setups versagen häufig in schwachen oder '
          + 'volatilen Märkten. (2-3 Sätze)\n'
          + '2. TOP 3 VCP-KANDIDATEN: Für jeden Titel aus den Scandaten:\n'
          + '   - Anzahl Contractions (vcpContractions) + letzte Korrektur-% (vcpLastPct)\n'
          + '   - Volumen-Analyse: Ist Volumen während Contraction ausgetrocknet? '
          + '(vcpVolContraction < 0.6 = ideal). Gibt es Ausbruchs-Volumen? '
          + '(vcpBreakoutVol ≥ 2.0 = bestätigt)\n'
          + '   - Pivot-Punkt: Aus 52W-H und aktuellem Kurs ableiten — NUR aus Scandaten\n'
          + '   - Stage-2-Kontext: RSI > 50, MACD positiv, OBV steigend?\n'
          + '   - Stop-Loss: knapp unter letztem Contraction-Tief\n'
          + '   - KEIN Kursziel erfinden\n'
          + '3. SETUPS IN ENTWICKLUNG: Titel die ein VCP aufbauen aber noch nicht reif sind '
          + '(vcpVolContraction noch >0.6 oder vcpBreakoutVol fehlt).\n'
          + '4. RISIKEN: Was gefährdet VCP-Ausbrüche aktuell? '
          + '(Marktbreite, Makro, Sektor, False Breakout Risiko)\n'
          + '\nAntworte auf Deutsch, strukturiert 1-4. Max. 400 Wörter. '
          + 'Keine erfundenen Kursziele. Nur Daten aus den Scandaten verwenden.';
      }
    },

    swing: {
      lbKey: 'long_swing',
      label: 'Swing-Setups',
      hint:  '🔄 Swing-Trading: 5–20 Tage Haltedauer · Technische Muster',
      color: '#06b6d4',
      focus: [
        "Technisches Muster: Pullback, Breakout oder Reversal — welches liegt vor und wie klar ausgepraegt?",
        "Entry-Zone: Aktueller Kurs im Verhaeltnis zum erkannten Setup (nur aus Kurs-Feld ableiten)",
        "Stop-Loss in ATR-Einheiten: sinnvoller Abstand fuer die geschaetzte Haltedauer von 5-20 Tagen",
        "Was wuerde dieses Swing-Setup am ehesten invalidieren?"
      ],
      prompt: function(ctx) {
        if (!ctx.isEic) {
          return _publicEquityPrompt(ctx, {
            rolle: 'Du analysierst kurzfristige technische Swing-Setups (5-20 Tage Haltedauer-Horizont).',
            stratName: 'Swing-Setups',
            marktumfeldFrage: 'Wie ist die kurzfristige Trendrichtung und das Swing-Potenzial einzuordnen?',
            focus: STRATEGIES.swing.focus,
            maxWords: 350
          });
        }
        return KI_ANTI_HALLUZINATION
          + 'Du bist ein erfahrener Swing-Trader mit Fokus auf 5-20 Tage Haltedauer.\n\n'
          + ctx.marktkontext
          + '\n\nAUFGABE:\n'
          + '1. MARKTSTRUKTUR: Kurzfristige Trend-Richtung und Swing-Potenzial? (2-3 Sätze)\n'
          + '2. TOP 3 SWING-SETUPS: Für jeden Titel: technisches Muster (Pullback/Breakout/Reversal), '
          + 'Entry-Zone NUR aus "Kurs:$"-Feld ableiten, Stop-Loss in ATR-Einheiten, '
          + 'Haltedauer-Schätzung (5-20 Tage). Kursziel NICHT erfinden.\n'
          + '3. WATCHLIST: Setups die sich noch entwickeln müssen.\n'
          + '4. RISIKEN: Was könnte die Swing-Ideen invalidieren?\n'
          + '\nAntworte auf Deutsch, strukturiert 1-4. Max. 400 Wörter.';
      }
    },

    meanrev: {
      lbKey: 'long_mr',
      label: 'Mean-Reversion-Setups',
      hint:  '↩️ Mean Reversion: Rückkehr zum Mittelwert · Überverkauft/Überhitzt · ATR-Abstand',
      color: 'var(--yellow)',
      focus: [
        "Ueberverkauft-/Ueberhitzt-Grad: Wie extrem ist der aktuelle RSI-Wert einzuordnen?",
        "Abstand zum Zielniveau: Distanz des Kurses zur EMA200 als Mean-Reversion-Referenz",
        "ATR-Distanz: Wie viele ATR-Einheiten trennen Kurs und Mittelwert aktuell?",
        "Momentum-Fallen-Risiko: spricht das uebergeordnete Trendumfeld gegen eine Mean-Reversion-These?"
      ],
      prompt: function(ctx) {
        if (!ctx.isEic) {
          return _publicEquityPrompt(ctx, {
            rolle: 'Du analysierst statistische Über-/Unterverkauft-Situationen (Mean-Reversion-Kontext).',
            stratName: 'Mean-Reversion-Setups',
            marktumfeldFrage: 'Gibt es aktuell extreme Über-/Unterverkauft-Situationen im Markt?',
            focus: STRATEGIES.meanrev.focus,
            maxWords: 350
          });
        }
        return KI_ANTI_HALLUZINATION
          + 'Du bist ein quantitativer Analyst mit Fokus auf Mean-Reversion-Strategien.\n\n'
          + ctx.marktkontext
          + '\n\nAUFGABE:\n'
          + '1. MARKTSTRUKTUR: Gibt es aktuell extreme Über-/Unterverkauft-Situationen? (2-3 Sätze)\n'
          + '2. TOP 3 MEAN-REVERSION-KANDIDATEN: Titel mit extremem RSI (<30 oder >70) + BB-Abstand. '
          + 'Entry NUR aus "Kurs:$"-Feld, Ziel = EMA200 aus "EMA200-Kurs:$"-Feld. ATR-Abstand berechnen.\n'
          + '3. WATCHLIST: Titel die sich noch weiter ausdehnen könnten.\n'
          + '4. RISIKEN: Momentum-Falle, trendgetriebene Märkte wo MR gefährlich ist.\n'
          + '\nAntworte auf Deutsch, strukturiert 1-4. Max. 400 Wörter.';
      }
    },

    // ── OPTIONS-INCOME-STRATEGIEN ──────────────────────────────────────────

    csp_wheel: {
      lbKey: 'options_csp',
      label: 'CSP/Wheel-Setups',
      hint:  '⚙️ CSP/Wheel: Cash Secured Put + Covered Call · CapTrader/IBKR · Theta-Strategie',
      color: 'var(--amber)',
      focus: [
        "HVP-Eignung: Wie attraktiv ist die aktuelle Praemie gemessen am HVP-Wert des Titels?",
        "Strike-Naeherung: EMA200-Abstand als grobe Orientierung fuer einen sinnvollen Strike-Bereich",
        "Exit-Kriterien: Gewinnmitnahme- und Stop-Loss-Schwelle gemaess der hinterlegten Regel",
        "IV-Crush- oder Earnings-Risiko innerhalb der betrachteten Laufzeit"
      ],
      prompt: function(ctx) {
        var mode = 'scan';  // s. Kommentar in _publicOptionsPrompt — gilt fuer Public UND EIC
        var cfg = ctx.optsCfg || { minPrice: 15, maxPrice: 80, minHvp: 40, goodHvp: 55, idealHvp: 65, erDays: 30, dte: 30 };
        var rules = getEffectiveRules('csp_wheel', cfg) || {
          deltaRange: [0.15, 0.30], dteRange: [cfg.dte, 45],
          stopLoss: { pct: -200, basis: 'Spina + Friedenheim' },
          profitTaking: [{ pct: 50, condition: null, action: 'close' }]
        };
        // ERGAENZT (17.08.2026, Axel-Entscheidung nach rollRules-Anbindungspruefung):
        // stopLoss/profitTaking sind Exit-Kriterien fuer eine NEU zu eroeffnende
        // Position — passen strukturell in den Scanner (anders als rollRules, das
        // eine bestehende Position mit bekannter Handelsabsicht voraussetzt und
        // bewusst dem geplanten Options-Doktor vorbehalten bleibt).
        var _pt = (rules.profitTaking && rules.profitTaking[0]) ? rules.profitTaking[0].pct : 50;
        var _sl = rules.stopLoss ? rules.stopLoss.pct : -200;
        if (!ctx.isEic) {
          return _publicNinePointPrompt(ctx, {
            rolle: 'Du analysierst Titel auf strukturelle Eignung für eine Cash-Secured-Put/Covered-Call-Wheel-Strategie (Theta-Einkommen).',
            stratName: 'CSP/Wheel-Setups',
            marktumfeldFrage: 'Ist das aktuelle Volatilitätsniveau (VIX) strukturell günstig für Prämien-Strategien?',
            focus: STRATEGIES.csp_wheel.focus,
            maxWords: 500,
            mode: mode,
            istOptionsStrategie: true,
            principle: 'CSP/Wheel ist eine Theta-Einkommensstrategie: durch den Verkauf abgesicherter Puts (Cash-Secured Puts) wird Optionsprämie vereinnahmt; bei Andienung geht die Position in Aktien über, auf die anschließend Covered Calls verkauft werden können. Die Strategie lebt strukturell von der vereinnahmten Prämie, die maßgeblich von der impliziten/realisierten Volatilität abhängt — bei niedriger Volatilität ist die Prämienbasis strukturell kleiner, unabhängig vom übrigen Marktregime.'
          });
        }
        return KI_ANTI_HALLUZINATION
          + 'Du bist ein erfahrener Options-Trader mit Fokus auf Wheel-Strategie (CSP + Covered Calls).\n\n'
          + '⚠️ Diese Analyse dient ausschliesslich zu Informationszwecken gem. §1 WpHG.\n\n'
          + '🚫 SCHRITT 1 — HARTES AUSSCHLUSS-KRITERIUM (ZWINGEND VOR JEDER ANALYSE!):\n'
          + '   Diese Titel KOMPLETT IGNORIEREN:\n'
          + '   • Kurs < $' + cfg.minPrice + ' oder > $' + cfg.maxPrice + ': AUSSCHLUSS\n'
          + '   • HVP < ' + cfg.minHvp + '%: AUSSCHLUSS (Prämien zu niedrig)\n'
          + '   • ER innerhalb ' + cfg.erDays + ' Tage: AUSSCHLUSS\n'
          + '   Weniger als 3 übrig: NUR verbleibende empfehlen, NICHT auffüllen!\n\n'
          + '✅ SCHRITT 2 — Verbleibende Kandidaten bewerten:\n'
          + '  1. HVP-Bewertung:\n'
          + '     HVP ≥ ' + cfg.idealHvp + '%: ⭐ Ideal für CSP-Verkauf\n'
          + '     HVP ' + cfg.goodHvp + '–' + (cfg.idealHvp - 1) + '%: ✅ Gut\n'
          + '     HVP ' + cfg.minHvp + '–' + (cfg.goodHvp - 1) + '%: ⚠️ Grenzwertig — exakt in IBKR prüfen\n'
          + '     Kein HVP: ❓ IV in IBKR prüfen — NICHT schätzen\n'
          + '  2. OI am Strike > 500 Kontrakte — in IBKR prüfen\n'
          + '  3. Bid-Ask < 10% der Prämie\n'
          + '  4. Kein Earnings-Event innerhalb der Laufzeit\n\n'
          + ctx.marktkontext
          + '\n\nAUFGABE:\n'
          + '1. MARKTUMFELD: Günstig für neue CSPs? VIX-Niveau und Implikation für Prämien. (2-3 Sätze)\n'
          + '2. TOP 3 CSP/WHEEL-KANDIDATEN: Für jeden Titel:\n'
          + '   a) EMA200-Abstand: Strike-Empfehlung nahe/unter EMA200 in $\n'
          + '   b) Strike-Bereich in $ und % OTM vom aktuellen Kurs\n'
          + '   c) Laufzeit (bevorzugt ' + rules.dteRange[0] + '-' + rules.dteRange[1] + ' DTE)\n'
          + '   d) Delta-Bereich: ' + rules.deltaRange[0] + '-' + rules.deltaRange[1] + ' (≈' + Math.round((1-rules.deltaRange[1])*100) + '-' + Math.round((1-rules.deltaRange[0])*100) + '% rechnerische Gewinnwahrscheinlichkeit)\n'
          + '   e) Prämien-SCHÄTZUNG aus HVP — IMMER als Schätzung kennzeichnen\n'
          + '   f) PFLICHT-CHECKS: IV Rank in IBKR · OI > 500 · Bid-Ask < 10%\n'
          + '   g) EXIT-KRITERIEN (immer nennen): Gewinnmitnahme bei ' + _pt + '% der Prämie schließen. '
          + 'Stop-Loss bei ' + _sl + '% der Prämie (Position kostet dann das ' + Math.abs(_sl / 100) + '-fache des Verkaufspreises zum Rückkauf) — '
          + 'vor Eröffnung einplanen, nicht erst wenn die Position bereits bedrängt ist.\n'
          + '3. WATCHLIST: Titel die nach ER oder höherem IV interessant werden.\n'
          + '4. RISIKEN: IV-Crush, ER-Überraschungen, Titel unter 200d EMA.\n'
          + '\n⚠️ ABSCHLUSS: Immer mit Pflicht-Checks in IBKR/CapTrader abschliessen.\n'
          + '\nAntworte auf Deutsch, strukturiert 1-4. Max. 500 Wörter.';
      }
    },

    atmna: {
      lbKey: null,
      label: 'CSP (ATM/NA)-Setups',
      hint:  '🎯 CSP (ATM/NA): ATM-CSP · 50-70% Frühausstieg · 3-Stufen-Roll · Andienungs-Vermeidung',
      color: '#a371f7',
      focus: [
        "ATM-Strike-Logik: Wie gut passt der Titel zur Zeitwert-Maximierungs-Strategie bei aktuellem Kursniveau?",
        "Frueausstiegs-Schwelle: welche der 50/60/70%-Gewinnmitnahme-Stufen greift je nach Restlaufzeit zuerst?",
        "Roll-Eignung: Wie realistisch ist eine Andienungsvermeidung ueber die 3-Stufen-Rolllogik bei diesem Titel?",
        "Risiko einer Andienung trotz Rollversuchen (z.B. anhaltender Abwaertstrend unter den Strike)"
      ],
      prompt: function(ctx) {
        var mode = 'scan';  // s. Kommentar in _publicOptionsPrompt — gilt fuer Public UND EIC
        var cfg = ctx.optsCfg || { minPrice: 15, maxPrice: 80, minHvp: 40, goodHvp: 55, idealHvp: 65, erDays: 30, dte: 21 };
        if (!ctx.isEic) {
          return _publicNinePointPrompt(ctx, {
            rolle: 'Du analysierst Titel auf strukturelle Eignung für eine systematische ATM-Cash-Secured-Put-Strategie (Zeitwert-Maximierung, ~30 Tage Laufzeit).',
            stratName: 'CSP (ATM/NA)-Setups',
            marktumfeldFrage: 'Ist das aktuelle Volatilitätsniveau (VIX) strukturell günstig für ATM-CSPs?',
            focus: STRATEGIES.atmna.focus,
            maxWords: 500,
            mode: mode,
            istOptionsStrategie: true,
            principle: 'CSP (ATM/NA) ist eine systematische Variante der Cash-Secured-Put-Strategie: der Put wird bewusst nahe am Geld (At-The-Money) verkauft, um den Zeitwert zu maximieren, mit definierten Gewinnmitnahme-Schwellen (50/60/70%) und einer mehrstufigen Rolllogik zur Andienungsvermeidung. Die Strategie ist auf regelmäßige Wiederholung (~30-Tage-Zyklen) ausgelegt und reagiert empfindlicher auf Volatilitätsschwankungen als klassisches CSP/Wheel, da die ATM-Positionierung strukturell näher am Andienungsrisiko liegt.'
          });
        }
        return '⛔⛔⛔ EIC-MODUS — ABSOLUTES HALLUZINATIONS-VERBOT ⛔⛔⛔\n'
          + 'Verwende AUSSCHLIESSLICH Daten aus dem Prompt. Fehlende Werte: "N/A — in IBKR prüfen".\n\n'
          + 'Du bist ein erfahrener Options-Trader der eine systematische ATM-CSP-Wheel-Strategie anwendet.\n\n'
          + '## STRATEGIE-GRUNDLAGEN (CSP ATM/NA — At-The-Money-System):\n'
          + '- CSP wird AT-THE-MONEY verkauft — maximaler Zeitwert\n'
          + '- Laufzeit: ~30 Tage, bevorzugt 3. Freitag des Monats\n'
          + '- Frühausstieg (Profit-Taking):\n'
          + '  • 50% Gewinn: Schliessen wenn noch >50% Laufzeit verbleiben\n'
          + '  • 60% Gewinn: Standard-Regel bei 30-50% verbleibender Laufzeit\n'
          + '  • 70% Gewinn: Mindest-Ziel bei <30% Laufzeit\n'
          + '- Andienung vermeiden durch 3-Stufen-Rollen:\n'
          + '  Stufe 1: Niedrigerer Strike, 30-60 DTE, prämienneutral\n'
          + '  Stufe 2: Gleicher Strike, neue Laufzeit, prämienneutral\n'
          + '  Stufe 3: Niedrigerer Strike, doppelte Kontrakte\n'
          + '- Maximale Roll-Laufzeit: 90 Tage\n\n'
          + '## AKTIEN-CHECKLISTE:\n'
          + '- Kurs $' + cfg.minPrice + '–$' + cfg.maxPrice + '\n'
          + '- HVP ≥ ' + cfg.minHvp + '% (sonst Prämien zu niedrig)\n'
          + '- Strike-Staffelung ≤2.5% des Kurses\n'
          + '- OI/Volumen mindestens dreistellig\n'
          + '- Weekly Options verfügbar\n\n'
          + ctx.marktkontext
          + '\n\nAUFGABE:\n'
          + '1. MARKTUMFELD: ATM-CSPs sinnvoll? VIX-Level und Implikation. (2-3 Sätze)\n'
          + '2. TOP 3 ATM/NA-KANDIDATEN:\n'
          + '   HARTES AUSSCHLUSS-KRITERIUM:\n'
          + '   • HVP < ' + cfg.minHvp + '%: IGNORIEREN\n'
          + '   • Kurs < $' + cfg.minPrice + ' oder > $' + cfg.maxPrice + ': IGNORIEREN\n'
          + '   • ER innerhalb ' + cfg.erDays + ' Tage: IGNORIEREN\n'
          + '   Für jeden verbleibenden Kandidaten:\n'
          + '   a) HVP-Bewertung: ≥' + cfg.idealHvp + '% ⭐ · ' + cfg.goodHvp + '-' + (cfg.idealHvp-1) + '% ✅ · ' + cfg.minHvp + '-' + (cfg.goodHvp-1) + '% ⚠️\n'
          + '   b) ATM-Strike Empfehlung in $\n'
          + '   c) Laufzeit: nächster 3. Freitag (~' + cfg.dte + ' DTE)\n'
          + '   d) Prämien-SCHÄTZUNG aus HVP (⚠️ nur Näherung!) + 50/60/70%-Gewinn-Ziele in $\n'
          + '   e) Roll-Szenario Stufe 1: Strike ≈ Kurs − 2.5%\n'
          + '   f) PFLICHT-CHECKS: Strike-Staffelung · OI · Weekly Options · ER-Datum\n'
          + '3. NICHT GEEIGNET: Titel + Grund\n'
          + '4. ROLLSTRATEGIE-HINWEIS: 3 Roll-Stufen in Erinnerung rufen\n'
          + '\n⚠️ ATM/NA-Strategie vermeidet Andienung durch systematisches Rollen.\n'
          + KI_ANTI_HALLUZINATION
          + '⛔ ABSCHLUSS-ERINNERUNG: Nur Daten aus dem Prompt. Keine Kurse erfinden.\n'
          + 'Antworte auf Deutsch, strukturiert 1-4. Max. 550 Wörter.';
      }
    },

    weekly_income: {
      lbKey: null,
      label: 'CSP (Weekly)-Setups',
      hint:  '💰 CSP (Weekly): Diagonal Put-Spread · ATM-Short 7 DTE + Long-Versicherung 120 DTE · 4×/Monat',
      color: '#34d399',
      focus: [
        "Diagonal-Struktur: Passt das Verhaeltnis von Long-Put-Versicherung (~120 DTE) zu Short-Put-Income (7 DTE) beim aktuellen Kursniveau?",
        "Woechentliches Rollen: Eignung des Titels fuer den 4x-pro-Monat-Rhythmus (Liquiditaet, Spreads)",
        "Spread-Breite: wie gut begrenzt sie den maximalen Verlust im Verhaeltnis zur eingenommenen Praemie?",
        "Liquiditaets- oder Weekly-Options-Verfuegbarkeitsrisiko bei diesem Titel"
      ],
      prompt: function(ctx) {
        var mode = 'scan';  // s. Kommentar in _publicOptionsPrompt — gilt fuer Public UND EIC
        var cfg = ctx.optsCfg || { minPrice: 15, maxPrice: 80, minHvp: 40, erDays: 30 };
        if (!ctx.isEic) {
          return _publicNinePointPrompt(ctx, {
            rolle: 'Du analysierst Titel auf strukturelle Eignung für eine wöchentliche Diagonal-Put-Spread-Einkommensstrategie (kurzfristiger Short-Put + langfristige Long-Put-Versicherung).',
            stratName: 'CSP (Weekly)-Setups',
            marktumfeldFrage: 'Ist das aktuelle Umfeld (VIX, Trend) für wöchentliche Einkommensstrategien günstig?',
            focus: STRATEGIES.weekly_income.focus,
            maxWords: 500,
            mode: mode,
            istOptionsStrategie: true,
            principle: 'CSP (Weekly) implementiert die "Weekly Cash KaChing"-Methode nach T.R. Lawrence: eine langfristige Put-Position (~120 Tage, Strike unterhalb des aktuellen Kurses) dient als Verlustabsicherung ("Insurance"), während wöchentlich ein kurzfristiger Short-Put nahe am Geld (ATM, ~7-8 Tage) zur Prämieneinnahme verkauft und regelmäßig gerollt wird. Der maximale Verlust ist durch die Differenz der beiden Strikes (abzüglich vereinnahmter Prämie) strukturell begrenzt. Die Strategie hängt von verlässlicher wöchentlicher Liquidität ab und ist entsprechend empfindlich gegenüber Liquiditätsverschlechterungen im gewählten Titel.'
          });
        }
        return KI_ANTI_HALLUZINATION
          + '⛔ ABSOLUTES HALLUZINATIONS-VERBOT: Verwende AUSSCHLIESSLICH Daten aus dem Prompt.\n'
          + '   Kurse, Strikes, Prämien NUR aus Scandaten — NIEMALS schätzen oder erfinden.\n'
          + '   Fehlende Werte: explizit "N/A — in IBKR prüfen" schreiben.\n\n'
          + 'Du bist ein erfahrener Optionstrader spezialisiert auf wöchentliche Einkommensstrategien.\n\n'
          + '## STRATEGIE-GRUNDLAGEN (CSP Weekly — Diagonal Put-Spread):\n'
          + '- SCHRITT 1 — VERSICHERUNG (einmalig): Long-Put kaufen, ~120 DTE, Strike ~4-5$ unter aktuellem Kurs, PAST nächsten Earnings\n'
          + '- SCHRITT 2 — WÖCHENTLICHES INCOME: ATM Short-Put verkaufen, 7 DTE (nächster Freitag)\n'
          + '- SCHRITT 3 — ROLLEN: Jeden Freitag neuen ATM-Put verkaufen — 4× pro Monat\n'
          + '- Frühausstieg: 50% Prämiengewinn → Position schliessen, Kapital freimachen\n'
          + '- Max. Verlust: Spread-Breite MINUS kassierte Prämie — BEGRENZT\n'
          + '- Kapitaleffizienz: Nur Spread-Breite als Margin (nicht voller Aktienwert)\n\n'
          + '## AKTIEN-CHECKLISTE:\n'
          + '- Kurs $' + cfg.minPrice + '–$' + cfg.maxPrice + '\n'
          + '- Weekly Options verfügbar PFLICHT\n'
          + '- HVP ≥ ' + cfg.minHvp + '%\n'
          + '- Kein Earnings innerhalb 120 DTE der Long-Put-Laufzeit\n'
          + '- OI am ATM-Strike > 500, Bid-Ask < 10%\n\n'
          + ctx.marktkontext
          + '\n\nAUFGABE — RANGFOLGELISTE WEEKLY-INCOME-KANDIDATEN:\n'
          + '⛔ AUSSCHLUSS VOR ANALYSE:\n'
          + '   • Kurs < $' + cfg.minPrice + ' oder > $' + cfg.maxPrice + ' → AUSSCHLUSS\n'
          + '   • HVP < ' + cfg.minHvp + '% → AUSSCHLUSS\n'
          + '   • ER innerhalb ' + cfg.erDays + ' Tage → AUSSCHLUSS\n\n'
          + '1. MARKTUMFELD: Günstig für Weekly Income? VIX, Trend. (2 Sätze)\n'
          + '2. RANGFOLGELISTE TOP-KANDIDATEN (max. 5):\n'
          + '   a) HVP-Wert + Eignung (⭐/✅/⚠️)\n'
          + '   b) Long-Put Setup: Strike ~4-5$ unter Kurs · Ziel-DTE ~120\n'
          + '   c) Short-Put Setup: ATM-Strike · DTE 7 (nächster Freitag)\n'
          + '   d) Spread-Breite in $ = max. Verlust pro Kontrakt\n'
          + '   e) PFLICHT-CHECKS: Weekly Options · OI > 500 · Bid-Ask < 10%\n'
          + '3. NICHT GEEIGNET: Ausgeschlossene Titel + Grund\n'
          + '4. SETUP-HINWEIS: Optimales Vorgehen diese Woche\n'
          + '\n⛔ Alle Kurs/Prämienangaben sind SCHÄTZUNGEN — exakte Werte NUR in IBKR.\n'
          + '\nAntworte auf Deutsch, strukturiert 1-4. Max. 500 Wörter.';
      }
    },

    cc: {
      lbKey: 'options_cc',
      label: 'Covered-Call-Setups',
      hint:  '📝 Covered Call: Call-Writing auf Bestandspositionen · Buy-Write · Prämieneinnahme',
      color: '#f59e0b',
      focus: [
        "Langfristige Halteeignung: das Modell bewertet KEINE Aktienqualitaet — CC ersetzt keine eigene Aktienanalyse. Goldene Regel: nur auf Titel Calls schreiben, die man auch ohne die Optionsstrategie langfristig halten wuerde. UIQ liefert hierzu nur die Bewertungskriterien dieser Strategie, keine fundamentale Investment-Empfehlung.",
        "Dividendenrendite (divYield) und Cashflow-Stabilitaet KOENNEN bei der Auswahl relevant sein (z.B. bei bereits gehaltenen oder gezielt fuer Wheel-Fortfuehrung erworbenen Qualitaetstiteln), sind aber KEINE zwingende Voraussetzung fuer einen Covered Call — ein CC kann auch auf einem nicht-dividendenstarken Titel sinnvoll sein, wenn die Aktie bewusst gehalten wird und Upside gegen Praemieneinnahme getauscht werden soll.",
        "Stabilitaet/Etabliertheit: Grade-Einstufung und D200-Position als Naeherung fuer einen etablierten, vorhersehbaren Kursverlauf (echte Marktkapitalisierung, Spread-Enge und Liquiditaet liegen UIQ nicht vor — Broker-Check).",
        "Praemienqualitaet: HVP beschreibt die historische realisierte Volatilitaet und kann einen Hinweis auf ein bewegteres Kursumfeld geben — die tatsaechlich erzielbare Call-Praemie laesst sich daraus allein NICHT ableiten (Kontextsignal, kein Praemienmass; UIQ hat keine Live-Optionsketten-IV, echte IV/IV-Perzentil-Rang sind im Broker zu pruefen).",
        "Strike-Kompromiss (qualitativ, keine konkreten Delta-Werte — Public-Modus): ein naeher am Kurs liegender Strike ist typischerweise mit hoeherer Praemie UND hoeherer Ausuebungswahrscheinlichkeit verbunden (passt eher zu seitwaerts/leicht fallenden Erwartungen), ein weiter entfernter Strike mit geringerer Praemie aber mehr Kursspielraum (passt eher zu moderat steigenden Erwartungen).",
        "CC-spezifischer D200-Zielkonflikt (Unterschied zu CSP wichtig): ein hoher positiver D200-Abstand ist bei CC NICHT per se guenstig wie bei CSP — je staerker ein Titel strukturell steigt, desto groesser der potenzielle Opportunitaetsverlust durch den gedeckelten Short Call (Risiko, zu frueh aus einer guten Position herausgerufen zu werden). Bei CSP kann ein starker Aufwaertstrend dagegen unproblematischer sein, da eine Andienung dort grundsaetzlich in eine gewuenschte Aktienposition fuehrt.",
        "Rollstrategie: wie wahrscheinlich ist ein Aufwaerts-Roll noetig, wenn der Kurs sich dem Strike naehert?",
        "Risiko eines gekappten Gewinns bei ueberraschend starkem Kursanstieg"
      ],
      prompt: function(ctx) {
        var mode = 'scan';  // s. Kommentar in _publicOptionsPrompt — gilt fuer Public UND EIC
        var cfg = ctx.optsCfg || { minPrice: 15, maxPrice: 300, minHvp: 30, goodHvp: 45, idealHvp: 60, erDays: 30, dte: 30 };
        var rules = getEffectiveRules('cc', cfg) || { deltaRange: [0.20, 0.30], dteRange: [cfg.dte, 45] };
        if (!ctx.isEic) {
          return _publicNinePointPrompt(ctx, {
            rolle: 'Du analysierst Titel auf strukturelle Eignung für Covered-Call-Writing (Call-Verkauf auf bestehende oder neu erworbene Aktienpositionen, Buy-Write).',
            stratName: 'Covered-Call-Setups',
            marktumfeldFrage: 'Ist das aktuelle Umfeld (VIX-Niveau, Trendstärke) für Covered Calls günstig?',
            focus: STRATEGIES.cc.focus,
            maxWords: 500,
            mode: mode,
            istOptionsStrategie: true,
            principle: 'Covered Call (Buy-Write) ist eine Prämien-Einkommensstrategie auf bestehende oder neu erworbene Aktienpositionen (100 Aktien pro Kontrakt): auf die gehaltenen Aktien wird ein Call out-of-the-money verkauft und dafür Prämie vereinnahmt. Im Gegenzug wird das weitere Aufwärtspotenzial der Aktie bis zum Strike gedeckelt — steigt der Kurs über den Strike, kann der Call ausgeübt werden und die Aktien werden zum Strike-Preis abgegeben. Goldene Regel: Calls nur auf Titel schreiben, die man auch ohne die Optionsstrategie langfristig halten würde — CC ersetzt keine eigene Aktienanalyse, die Rendite kommt primär von der Aktie selbst. In der Praxis betrifft CC meist bereits gehaltene Positionen oder Positionen, die gezielt zur Fortführung der Wheel-Strategie erworben werden ("buy-to-open"). Dividendenrendite und Cashflow-Stabilität können bei der Titelauswahl relevant sein, sind aber keine zwingende Voraussetzung — ein CC kann auch auf einem nicht-dividendenstarken Titel sinnvoll sein, wenn die Aktie bewusst gehalten und Upside gezielt gegen Prämieneinnahme getauscht werden soll. Wichtiger Rahmen: Der CC-Strategy-Fit bewertet ausschließlich die Eignung einer Aktie zum Überschreiben mit einem Call — er setzt eine bereits gehaltene oder bewusst geplante Aktienposition voraus und ist keine Empfehlung zum erstmaligen Erwerb der zugrunde liegenden Aktie.',
            // BEGRIFFS-INTEGRITAET (29.08.2026, Reviewer-Punkt 6): "Andienung"
            // ist CSP-spezifisch (Kursbewegung UNTER den Put-Strike loest sie
            // aus). Bei Covered Call ist das relevante Risiko-Ereignis
            // Assignment/Ausuebung DES SHORT CALLS (Kursbewegung UEBER den
            // Strike) plus die Deckelung des weiteren Aufwaertspotenzials —
            // zwei unterschiedliche, klar zu benennende Konzepte, nicht
            // durch das CSP-Wort "Andienung" zu ersetzen.
            risikoBegriff: 'Ausübung/Assignment des Short Calls (Kursbewegung ÜBER den Strike)',
            risikenText: 'Zusätzlich IMMER den strategiespezifischen Zielkonflikt von Covered Calls '
              + 'benennen: Prämieneinnahme steht der Begrenzung des weiteren Aufwärtspotenzials '
              + 'gegenüber (Upside-Cap durch den Short Call) — das ist der zentrale strukturelle '
              + 'Zielkonflikt dieser Strategie und darf ausdrücklich erklärt werden, nicht nur als '
              + 'Randrisiko erwähnt. Bei Titeln mit hohem positivem D200-Abstand ausdrücklich '
              + 'benennen: ein starker struktureller Aufwärtstrend erhöht bei CC den potenziellen '
              + 'Opportunitätsverlust durch den gedeckelten Call — anders als bei CSP, wo ein '
              + 'starker Aufwärtstrend unproblematischer sein kann, weil eine Andienung dort in eine '
              + 'gewünschte Aktienposition führt. Diesen Unterschied nicht mit CSP-Logik vermischen.'
          });
        }
        return KI_ANTI_HALLUZINATION
          + 'Du bist ein erfahrener Options-Trader mit Fokus auf Covered Call Writing (Call-Verkauf auf bestehende oder neu erworbene Aktienpositionen).\n\n'
          + '⚠️ Diese Analyse dient ausschliesslich zu Informationszwecken gem. §1 WpHG.\n\n'
          + '## STRATEGIE-GRUNDLAGEN (Covered Call):\n'
          + '- Call wird OTM verkauft auf 100 Aktien die der Trader bereits hält oder kauft (Buy-Write)\n'
          + '- Ziel: Prämieneinnahme + Risikoreduktion auf die Long-Position\n'
          + '- Strike-Wahl: Kompromiss zwischen Prämie und Upside-Potenzial\n'
          + '  • Aggressiv (mehr Prämie): Strike nahe Kurs (5-8% OTM)\n'
          + '  • Konservativ (mehr Upside): Strike weit OTM (10-15%)\n'
          + '- Laufzeit: bevorzugt 30-45 DTE, Frühausstieg bei 50% Prämiengewinn\n'
          + '- Rollstrategie: Call rollen wenn Kurs an Strike heranläuft (Aufwärts-Roll)\n'
          + '- WICHTIG: CC deckt Upside — bei stark steigenden Titeln kann Gewinnpotenzial gekappt werden\n\n'
          + '🚫 AUSSCHLUSS-KRITERIEN:\n'
          + '   • HVP < ' + cfg.minHvp + '%: Prämien zu mager für sinnvollen CC\n'
          + '   • ER innerhalb ' + cfg.erDays + ' Tage: erhöhtes Assignment-Risiko durch Kurssprung\n'
          + '   • Stark trendende Titel (RSI>75, Momentum hoch): CC kappt Gewinne im besten Moment\n\n'
          + ctx.marktkontext
          + '\n\nAUFGABE:\n'
          + '1. MARKTUMFELD: Günstig für Covered Calls? VIX-Niveau, Trendstärke, Prämienqualität. (2-3 Sätze)\n'
          + '2. TOP 3 CC-KANDIDATEN: Titel mit stabiler Kursbasis, moderatem Momentum und ausreichend HVP.\n'
          + '   Für jeden Titel:\n'
          + '   a) HVP-Bewertung: ≥' + cfg.idealHvp + '% ⭐ · ' + cfg.goodHvp + '-' + (cfg.idealHvp-1) + '% ✅ · ' + cfg.minHvp + '-' + (cfg.goodHvp-1) + '% ⚠️\n'
          + '   b) Strike-Empfehlung: OTM-Abstand in % und $ vom Kurs (aus "Kurs:$"-Feld)\n'
          + '   c) Laufzeit: ~' + rules.dteRange[0] + '-' + rules.dteRange[1] + ' DTE, bevorzugt 3. Freitag des Monats\n'
          + '   d) Delta-Bereich: ' + rules.deltaRange[0] + '-' + rules.deltaRange[1] + '\n'
          + '   e) Prämien-SCHÄTZUNG aus HVP (⚠️ Schätzung — exakt in IBKR prüfen)\n'
          + '   f) Upside-Risiko: Wie viel Kursgewinn wird bis zum Strike gedeckelt?\n'
          + '   g) PFLICHT-CHECKS: OI > 300 · Bid-Ask < 10% · kein ER in Laufzeit\n'
          + '3. WATCHLIST: Titel die nach ER oder Kurskorrektur interessant werden für CC.\n'
          + '4. RISIKEN: Assignment-Risiko, Upside-Cap in starkem Trend, niedrige Prämien bei niedrigem VIX.\n'
          + '\n⚠️ ABSCHLUSS: Strikes und Prämien immer in IBKR/CapTrader Optionskette verifizieren.\n'
          + '\nAntworte auf Deutsch, strukturiert 1-4. Max. 450 Wörter.';
      }
    },

    // ── ABSICHERUNG (kein STRATEGIE_MATRIX-Eintrag — Positions-Kontext fehlt in UIQ)
    // Vollständige Behandlung → Options-Doktor-Modul (Suite Phase 3)

    collar: {
      lbKey: null,
      label: 'Collar/Protective-Put-Setups',
      hint:  '🛡️ Collar/Protective Put: Absicherung Bestandsposition · BULL_FRAGILE · Proxy-Strikes',
      color: '#0ea5e9',
      focus: [
        "Absicherungsbedarf: sprechen RSI/Momentum NUR in Kombination mit hoher HVP UND strukturell intaktem uebergeordnetem Trend fuer eine gezielte Ueberpruefung des Absicherungsbedarfs bei diesem Titel? (RSI allein — ob hoch oder niedrig — reicht NICHT: ein bereits stark gefallener Titel mit niedrigem RSI braucht nicht automatisch mehr Absicherung, das waere konzeptionell widerspruechlich.)",
        "Protective Put vs. voller Collar: lohnt sich hier eher die einfache Absicherung oder die volle Kostenreduktion mit gedeckeltem Upside?",
        "Strike-Naeherung: ATR-basierte Put-/Call-Distanz als grobe Orientierung (keine echten Optionsketten verfuegbar)",
        "Wichtigste Einschraenkung dieser Einschaetzung, die vor einer echten Position in IBKR/CapTrader zu pruefen ist"
      ],
      prompt: function(ctx) {
        var mode = 'holding_review';  // gilt fuer Public UND EIC — s. Kommentar in _publicOptionsPrompt
        if (!ctx.isEic) {
          return _publicNinePointPrompt(ctx, {
            rolle: 'Du analysierst Bestandspositionen auf strukturellen Absicherungsbedarf (Collar/Protective Put) in einem fragilen Bull-Regime. UIQ hat KEINEN Zugriff auf echte Optionsketten oder Bestandspositionen — alle Einordnungen sind ATR/HVP-basierte Näherungen.',
            stratName: 'Collar/Protective-Put-Setups',
            marktumfeldFrage: 'Spricht das aktuelle Regime (BULL_FRAGILE o.ä.) grundsätzlich für Absicherungsüberlegungen?',
            focus: STRATEGIES.collar.focus,
            maxWords: 400,
            mode: mode,
            istOptionsStrategie: true,
            principle: 'Collar/Protective Put ist eine Absicherungsstrategie für bestehende Aktienpositionen: durch den Kauf eines Put wird ein Mindestverkaufspreis ("Boden") für die gehaltene Position abgesichert — die einzigen Kosten sind die gezahlte Put-Prämie. Beim vollen Collar wird zusätzlich ein Call verkauft, um die Put-Prämie ganz oder teilweise zu finanzieren; im Gegenzug wird das Aufwärtspotenzial der Position bis zum Call-Strike gedeckelt. UIQ hat keinen Zugriff auf echte Optionsketten oder tatsächliche Bestandspositionen — alle Einordnungen sind ATR-/HVP-basierte Näherungen zur hypothetischen Prüfung, keine Aussage über eine tatsächlich gehaltene Position.',
            // BEGRIFFS-INTEGRITAET (31.08.2026, Prioritaet 3 aus Uebergabe-
            // protokoll 30.08. §8 — analog zum CC-Fund vom 29.08.). Collar
            // nutzte bislang den generischen Fallback "Andienung" — begrifflich
            // falsch fuer eine Struktur mit ZWEI unterschiedlichen Seiten:
            // (a) Protective Put (Kauf eines Puts) hat KEIN Andienungs-/
            // Ausuebungsrisiko, da keine eigene Optionsposition verkauft wird —
            // das einzige Risiko ist die gezahlte Praemie (Kosten der
            // Absicherung). (b) Voller Collar (zusaetzlicher Short Call) hat
            // dagegen ein CC-analoges Ausuebungsrisiko auf der Call-Seite
            // (Aktien koennen bei starkem Kursanstieg abgerufen werden,
            // Aufwaertspotenzial gedeckelt) — das ist NICHT dasselbe Konzept
            // wie "Andienung" (CSP-spezifisch, Put-Assignment bei Kursverfall).
            risikoBegriff: 'Ausübung/Assignment des Short Calls beim vollen Collar (Kursbewegung ÜBER den Call-Strike)',
            risikenText: 'Wichtig: Protective Put und voller Collar risikotechnisch trennen — '
              + 'beim reinen Protective Put entsteht KEIN Andienungs-/Ausübungsrisiko (keine '
              + 'eigene Position wird verkauft), einziges Risiko ist die gezahlte Put-Prämie '
              + '(Kosten der Absicherung, ggf. Verfall ohne Ausübung). Beim vollen Collar '
              + '(zusätzlicher Short Call zur Finanzierung der Put-Prämie) entsteht zusätzlich '
              + 'ein CC-analoges Ausübungsrisiko auf der Call-Seite: starker Kursanstieg über '
              + 'den Call-Strike kann die Aktienposition abrufen, Aufwärtspotenzial gedeckelt.'
          });
        }
        // EIC-Zweig: mode bewusst nur als Marker notiert, keine Logikaenderung —
        // "Bestandspositionen" ist hier schon explizit in Rolle/Aufgabe verankert.
        return KI_ANTI_HALLUZINATION
          + 'Du bist ein erfahrener Options-Stratege mit Fokus auf Absicherungsstrategien '
          + '(Collar / Protective Put) für bereits gehaltene Aktienpositionen in einem '
          + 'fragilen Bull-Regime (Trend intakt, aber erhöhtes Air-Pocket-Risiko).\n\n'
          + '⚠️ WICHTIG: UIQ hat KEINEN Zugriff auf echte Optionsketten (Strikes/Prämien) '
          + 'oder deine Bestandspositionen. Alle Strike-Vorschläge sind ATR/HVP-basierte '
          + 'Näherungen — echte Strikes und Prämien IMMER in IBKR/CapTrader verifizieren. '
          + 'Diese Analyse dient ausschliesslich zu Informationszwecken gem. §1 WpHG.\n\n'
          + ctx.marktkontext
          + '\n\nAUFGABE:\n'
          + '1. EINSCHRÄNKUNG: Kurz erklären — keine echten Optionsketten verfügbar, '
          + 'alle Strikes sind Näherungen, IMMER in IBKR/CapTrader verifizieren.\n'
          + '2. ABSICHERUNGS-KANDIDATEN: Für Titel mit RSI/Momentum-Auffälligkeit NUR in '
          + 'Kombination mit hoher HVP und strukturell intaktem übergeordnetem Trend '
          + '(gezielte Überprüfung des Absicherungsbedarfs bei ausgeprägter kurzfristiger '
          + 'Kursbewegung — NICHT RSI allein, das wäre konzeptionell widersprüchlich bei '
          + 'bereits gefallenen Titeln): Protective-Put-Strike-Näherung '
          + '(ATR-basiert, 1-1.5x ATR unter Kurs), optional Call-Strike-Näherung für vollen '
          + 'Collar (1-2x ATR über Kurs). KEINEN echten Prämien-Betrag erfinden — nur '
          + 'Strike-Abstand in % und $ aus "Kurs:$" und "ATR:$" ableiten.\n'
          + '3. PROTECTIVE PUT vs. VOLLER COLLAR: Wann reicht ein einfacher Protective Put '
          + '(Kosten in Kauf nehmen), wann lohnt sich der volle Collar (Kosten senken, '
          + 'Aufwärtspotenzial gedeckelt)?\n'
          + '4. NÄCHSTE SCHRITTE: Echte Strikes und Prämien in IBKR/CapTrader Optionskette '
          + 'nachschlagen, bevor eine Position eröffnet wird.\n'
          + '\nAntworte auf Deutsch, strukturiert 1-4. Max. 350 Wörter. '
          + 'Keine erfundenen Prämien oder Optionsketten-Werte.';
      }
    },


    // ── INCOME / FUNDAMENTAL-STRATEGIEN ──────────────────────────────────────

    dividend: {
      lbKey: 'long_dividend',
      label: 'Dividend-Growth-Setups',
      hint:  '💰 Dividend Growth: Qualitäts-Dividendentitel · Income + optionale CSP-Unterlegung',
      color: '#f59e42',
      focus: [
        "Dividendenqualitaet: Verhaeltnis von Rendite (divYield), Ausschuettungsquote (payoutRatio) und FCF-Yield",
        "Fundamentalstaerke: ROE und Verschuldungsgrad als Qualitaetsindikatoren",
        "CSP-Unterlegungs-Eignung: laesst sich ein Strike 5-10% unter Kurs sinnvoll platzieren?",
        "Groesstes Risiko fuer die Nachhaltigkeit dieser Dividende"
      ],
      prompt: function(ctx) {
        if (!ctx.isEic) {
          return _publicEquityPrompt(ctx, {
            rolle: 'Du analysierst Qualitäts-Dividendentitel (nachhaltige Ausschüttung, solider Free Cashflow).',
            stratName: 'Dividend-Growth-Setups',
            marktumfeldFrage: 'Unterstützt das aktuelle Regime Income-Strategien (Zinsniveau, HY-Spread)?',
            focus: STRATEGIES.dividend.focus,
            maxWords: 350
          });
        }
        return KI_ANTI_HALLUZINATION
          + 'Du bist ein erfahrener Income-Investor spezialisiert auf Qualitäts-Dividendentitel '
          + 'mit nachhaltiger Ausschüttung und solidem Free Cashflow.\n'
          + 'Ziel: stabile Erträge (Dividende + optionale CSP-Prämie als Unterlegung). '
          + 'Kein spekulativer Dividendenjäger: Qualität muss die Rendite rechtfertigen.\n\n'
          + (ctx.marktkontext || '')
          + '\n\nFELDER-LEGENDE (Dividend-spezifisch):\n'
          + '- divYield: Dividendenrendite in % (ideal: 1-6%; >6% = Nachhaltigkeitsprüfung)\n'
          + '- payoutRatio: Ausschüttungsquote in % (<80% = nachhaltig; >100% = Warnsignal)\n'
          + '- fcfYield: Free-Cashflow-Rendite in % (Puffer für Dividende; >3% = gesund)\n'
          + '- roe: Return on Equity in % (>10% = Qualitätsindikator)\n'
          + '- debtToEquity: Verschuldungsgrad (niedrig = stabiler)\n\n'
          + 'AUFGABE:\n'
          + '1. MARKTLAGE: Unterstützt das Regime Income-Strategien? '
          + 'Zinsniveau (TNX), HY-Spread und Regime-Signal einordnen. (2 Sätze)\n'
          + '2. TOP-3 DIVIDEND-KANDIDATEN: Für jeden Titel:\n'
          + '   a) Dividendenqualität: divYield + payoutRatio + fcfYield\n'
          + '   b) Fundamentalstärke: ROE + Verschuldung\n'
          + '   c) Technisches Bild: EMA200-Position, RSI nicht überhitzt (≤70)\n'
          + '   d) CSP-Eignung: Strike 5-10% unter Kurs sinnvoll platzierbar?\n'
          + '   e) Hauptrisiko: Was könnte die Dividende gefährden?\n'
          + '3. NICHT EMPFOHLEN: Ausgeschlossene Titel + Grund (payoutRatio >80%, divYield <1%, '
          + 'technisch schwach oder fallendes Messer).\n'
          + '\nAntworte auf Deutsch, strukturiert 1-3. Max. 400 Wörter. '
          + 'Keine erfundenen Dividendenzahlungen oder Strike-Werte.';
      }
    },

    value: {
      lbKey: 'long_value',
      label: 'Value-Setups',
      hint:  '📊 Value Investing: Günstig bewertete Qualitätstitel · peForward, P/B, FCF-Yield',
      color: '#94a3b8',
      focus: [
        "Bewertungs-Kennzahlen: peForward, P/B und FCF-Yield im Verhaeltnis zum Sektor eingeordnet",
        "Qualitaetscheck: rechtfertigt der ROE-Wert die guenstige Bewertung, oder handelt es sich um einen Value-Trap-Kandidaten?",
        "Sicherheitsmarge: wie gross ist der Puffer zwischen Kurs und dem aus den Daten ableitbaren fairen Wert?",
        "Staerkstes strukturelles Risiko (schrumpfendes Geschaeftsmodell, Schuldenlast, Sektor-Gegenwind)"
      ],
      prompt: function(ctx) {
        // BUGFIX (29.08.2026, Backlog №65-Fortsetzung): ctx.tickers wird von
        // runValueKiBriefing() (index.html) uebergeben, wurde hier aber nie
        // serialisiert — die KI bekam bislang praktisch keine Einzeltitel-
        // Kennzahlen fuer diese Strategie (nur den kurzen Datums/Regime/VIX-
        // Header aus ctx.marktkontext). Jetzt: falls ctx.tickers vorhanden,
        // daraus eine Kandidatenliste bauen und ctx.marktkontext voranstellen.
        var _tickerBlock = '';
        if (Array.isArray(ctx.tickers) && ctx.tickers.length) {
          _tickerBlock = '\n\nKANDIDATEN (Top-' + ctx.tickers.length + '):\n'
            + ctx.tickers.map(function(t, i) {
                var l = (i + 1) + '. ' + (t.sym || t.ticker || '?');
                if (t.finalScore != null) l += ' Score:' + t.finalScore;
                if (t.pe != null)  l += ' PE:' + t.pe;
                if (t.pb != null)  l += ' PB:' + t.pb;
                if (t.fcfYield != null) l += ' FCF:' + t.fcfYield + '%';
                if (t.roicProxy != null) l += ' ROIC-Proxy:' + t.roicProxy;
                if (t.revGrowth != null) l += ' RevGrowth:' + t.revGrowth + '%';
                if (t.grossMargin != null) l += ' GM:' + t.grossMargin + '%';
                // Zwei Aufrufstellen (openKiBriefing vs. runValueKiBriefing)
                // benennen dasselbe Feld unterschiedlich (rs/rsRating,
                // hvp/ivp) — beide Varianten abfangen statt eine zu verpassen.
                var _rsVal  = (t.rs != null) ? t.rs : t.rsRating;
                var _hvpVal = (t.hvp != null) ? t.hvp : t.ivp;
                if (_rsVal != null) l += ' RS:' + _rsVal;
                if (t.aboveEma200 != null) l += ' EMA200:' + (t.aboveEma200 ? 'über' : 'unter');
                if (t.rsi != null) l += ' RSI:' + Math.round(t.rsi);
                if (_hvpVal != null) l += ' HVP:' + _hvpVal + '%';
                if (t.wheelCandidate) l += ' [Wheel-Kandidat]';
                return l;
              }).join('\n');
        }
        var _marktkontextMitTickern = (ctx.marktkontext || '') + _tickerBlock;
        if (!ctx.isEic) {
          return _publicEquityPrompt({ marktkontext: _marktkontextMitTickern }, {
            rolle: 'Du analysierst günstig bewertete Qualitätstitel nach Value-Kriterien (Graham/Buffett-Prinzipien).',
            stratName: 'Value-Setups',
            marktumfeldFrage: 'Unterstützt das aktuelle Regime Value-Rotation (Growth-vs-Value-Dynamik, Zinsniveau)?',
            focus: STRATEGIES.value.focus,
            maxWords: 350
          });
        }
        return KI_ANTI_HALLUZINATION
          + 'Du bist ein erfahrener Value-Investor nach Graham/Buffett-Prinzipien — '
          + 'günstig bewertete Qualitätstitel mit Sicherheitsmarge.\n'
          + 'Kein Value-Trap-Jäger: ein niedriger Kurs allein reicht nicht, '
          + 'ROE und FCF müssen den niedrigen Preis rechtfertigen.\n\n'
          + _marktkontextMitTickern
          + '\n\nFELDER-LEGENDE (Value-spezifisch):\n'
          + '- peForward: Forward Price/Earnings-Ratio (<20x bevorzugt; <15x = attraktiv)\n'
          + '- pb: Price/Book-Ratio (<3x = günstig; <1x = tief unterbewertet)\n'
          + '- fcfYield: Free-Cashflow-Rendite in % (>4% = solide Bewertung)\n'
          + '- roe: Return on Equity in % (>10% = Qualitätsgate)\n'
          + '- analystUpside: Analyst-Kursziel-Upside in % (>10% = Konsens sieht Potenzial)\n\n'
          + 'AUFGABE:\n'
          + '1. MARKTLAGE: Unterstützt das Regime Value-Rotation? '
          + 'Growth vs. Value-Dynamik, Zinsniveau (TNX) und Sektor-Rotation einordnen. (2 Sätze)\n'
          + '2. TOP-3 VALUE-KANDIDATEN: Für jeden Titel:\n'
          + '   a) Bewertung: peForward + pb + fcfYield im Verhältnis zum Sektor\n'
          + '   b) Qualitätscheck: ROE + fundamentale Stabilität\n'
          + '   c) Analyst-Konsens: analystUpside-Potenzial bewerten\n'
          + '   d) Technisches Bild: EMA200-Abstand, RSI — ist der Boden erreicht '
          + 'oder noch kein Erholungszeichen?\n'
          + '   e) Sicherheitsmarge: Wie groß ist der Puffer zwischen Kurs und geschätztem fairen Wert?\n'
          + '3. VALUE-TRAPS: Welche Kandidaten sehen günstig aus, haben aber '
          + 'strukturelle Risiken (schrumpfendes Geschäftsmodell, Schuldenlast, Sektor-Headwinds)?\n'
          + '\nAntworte auf Deutsch, strukturiert 1-3. Max. 400 Wörter. '
          + 'Keine erfundenen Kursziele oder PE-Werte — nur aus den Messdaten.';
      }
    },

    // ── SHORT-STRATEGIEN ───────────────────────────────────────────────────

    fading_short: {
      lbKey: 'short_fading_ko',
      label: 'Fading-Short-Setups (experimentell)',
      hint:  '🔻 Fading Short (experimentell): KO-Short · Gegentrend · BULL_FRAGILE/STRESS',
      color: 'var(--red)',
      focus: [
        "Ueberhitzungsgrad: wie deutlich liegt der RSI-Wert ueber der 75-Schwelle?",
        "Regime-Voraussetzung: ist das aktuelle Regime (BULL_FRAGILE/STRESS_UNSTABLE) ueberhaupt fuer Fading Short geeignet?",
        "Stop-Level: sinnvoller Abstand knapp ueber dem 52-Wochen-Hoch",
        "Das explizite Gegentrend-Risiko dieses experimentellen Setups im laufenden Bullmarkt"
      ],
      // Kein eigener Analyse-Prompt: Fading-Short-Leaderboard hat keine
      // Bewertungsmetriken (kein score_fading_short() im Aggregator).
      // KI-Analyse-Button ist daher deaktiviert (runAlphaLbKI gibt Hinweis).
      // Eintrag hier für getConfig() + STRATEGIE_MATRIX.
      prompt: function(ctx) {
        if (!ctx.isEic) {
          return _publicEquityPrompt(ctx, {
            rolle: 'Du analysierst überhitzte Titel auf strukturelle Eignung für einen Gegentrend-Ansatz (Fading, experimentell, nur BULL_FRAGILE/STRESS_UNSTABLE).',
            stratName: 'Fading-Short-Setups (experimentell)',
            marktumfeldFrage: 'Ist das aktuelle Regime (BULL_FRAGILE/STRESS_UNSTABLE) überhaupt für Fading-Ansätze relevant?',
            focus: STRATEGIES.fading_short.focus,
            maxWords: 300
          });
        }
        return KI_ANTI_HALLUZINATION
          + 'Du bist ein erfahrener Trader mit Fokus auf Fading-Strategien (KO-Short auf überhitzte Titel).\n\n'
          + '⚠️ Fading Short ist experimentell — nur bei klarem BULL_FRAGILE oder STRESS_UNSTABLE Regime.\n\n'
          + ctx.marktkontext
          + '\n\nAUFGABE:\n'
          + '1. MARKTUMFELD: Gibt es aktuell überhitzte Titel die für Fading Short geeignet sind? '
          + 'Regime, Fear&Greed und SKEW/VVIX-Divergenz einordnen. (2-3 Sätze)\n'
          + '2. KANDIDATEN: Titel mit RSI>75, hohem Score und möglichem Momentum-Bruch. '
          + 'Für jeden: Überhitzungs-Signal, Stop-Level (knapp über 52W-Hoch), Timing-Überlegung.\n'
          + '3. RISIKEN: Gegentrend-Short im Bullmarkt ist das größte Risiko — explizit benennen.\n'
          + '\nAntworte auf Deutsch, strukturiert 1-3. Max. 300 Wörter.';
      }
    },

  };

  // ── INTERMARKET / MAKRO-ANALYSE PROMPT ────────────────────────────────────
  /**
   * Prompt für die tägliche Intermarket/Makro-Analyse (autoMakro).
   * Gibt einen JSON-Output-Prompt zurück (verdict / verdictText / factors[]).
   *
   * @param {object} ctx
   *   ctx.today         {string}  Datum-String (z.B. "30.07.2026")
   *   ctx.sp            {string}  S&P 500 Wert
   *   ctx.nq            {string}  Nasdaq 100 Wert
   *   ctx.vix           {string}  VIX Wert
   *   ctx.gold          {string}  Gold Wert
   *   ctx.silver        {string}  Silber Wert
   *   ctx.copper        {string}  Kupfer Wert
   *   ctx.oil2          {string}  WTI Öl Wert
   *   ctx.btc           {string}  Bitcoin Wert
   *   ctx.eth           {string}  Ethereum Wert
   *   ctx.sol           {string}  Solana Wert
   *   ctx.imVvix        {string}  VVIX aus Intermarket-Panel
   *   ctx.imAud         {string}  AUD/USD aus Intermarket-Panel
   *   ctx.imJpy         {string}  JPY/USD aus Intermarket-Panel
   *   ctx.imTip         {string}  TIPS ETF
   *   ctx.imItb         {string}  Hausbauer ETF ITB
   *   ctx.imVnq         {string}  REIT ETF VNQ
   *   ctx.imSpread      {string}  10J-3M Spread (im-irx)
   *   ctx.imScore       {string}  Intermarket Risk Score Label
   *   ctx.sektorContext {string}  Sektor-RS-Block (vorformatiert)
   *   ctx.newsContext   {string}  News-Block (vorformatiert, kann '')
   *   ctx.consistencyHint {string} Konsistenz-Pflichthinweis (kann '')
   */
  function _getIntermarketPrompt(ctx) {
    var c = ctx || {};
    var d = c.today || new Date().toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'});
    return 'Du bist ein professioneller Finanzmarktanalyst der täglich eine Marktlageeinschätzung für einen aktiven Retail-Investor erstellt, '
      + 'der in deutschen und US-amerikanischen Märkten in KO-Turbo-Zertifikate und Aktienoptionen (Wheel-Strategie) investiert.\n\n'
      + '== MARKTDATEN vom ' + d + ' ==\n'
      + '\nINDIZES:\n'
      + '- S&P 500: ' + (c.sp || '—') + '\n'
      + '- Nasdaq 100: ' + (c.nq || '—') + '\n'
      + '- VIX (Angstbarometer): ' + (c.vix || '—') + '\n'
      + '\nINTERMARKET-SIGNALE:\n'
      + '- VVIX (Vola der Vola, Frühwarnindikator): ' + (c.imVvix || '—') + '\n'
      + '- AUD/USD (Risk-On Währung): ' + (c.imAud || '—') + '\n'
      + '- JPY/USD (Safe-Haven Währung): ' + (c.imJpy || '—') + '\n'
      + '- Intermarket Risk Score: ' + (c.imScore || '—') + '\n'
      + '\nROHSTOFFE & SAFE HAVEN:\n'
      + '- Gold: ' + (c.gold || '—') + '  |  Silber: ' + (c.silver || '—') + '  |  Kupfer: ' + (c.copper || '—') + '\n'
      + '- WTI Öl: ' + (c.oil2 || '—') + '\n'
      + '\nMAKRO: INFLATION & ZINSEN:\n'
      + '- TIPS ETF (Inflationserwartungen): ' + (c.imTip || '—') + '\n'
      + '- 10J-3M Spread (Yield Curve): ' + (c.imSpread || '—') + '\n'
      + '\nMAKRO: HOUSING & IMMOBILIEN:\n'
      + '- Hausbauer ETF ITB: ' + (c.imItb || '—') + '\n'
      + '- REIT ETF VNQ: ' + (c.imVnq || '—') + '\n'
      + '\nKRYPTO (Risikosentiment):\n'
      + '- Bitcoin: ' + (c.btc || '—') + '  |  Ethereum: ' + (c.eth || '—') + '  |  Solana: ' + (c.sol || '—') + '\n'
      + (c.sektorContext || '') + (c.newsContext || '') + (c.consistencyHint || '') + '\n\n'
      + '== AUFGABE ==\n'
      + 'Erstelle eine ausführliche, rein faktenbasierte Marktlageeinschätzung. '
      + 'Verwende AUSSCHLIESSLICH die oben angegebenen Daten. Erfinde KEINE Kurse, Prozentzahlen oder Ereignisse.\n\n'
      + 'Analysiere dabei folgende Themenbereiche soweit die Daten es erlauben:\n'
      + '1. MARKTREGIME: Ist der Markt Risk-On oder Risk-Off? Begründe mit konkreten Intermarket-Signalen.\n'
      + '2. SEKTORROTATION: Welche Sektoren führen, welche hinken nach? Konkrete Implikationen für Positionierung.\n'
      + '3. TECHNOLOGIE & WACHSTUM: Lage der Hyperscaler (MSFT, AMZN, GOOGL, META), Halbleiter/Chip-Hersteller (NVDA, AMD, AVGO, AMAT), KI-Infrastruktur, Robotik. Nur wenn Sektor-Daten vorhanden.\n'
      + '4. ZINSEN & INFLATION: Interpretation der Yield Curve, Inflationserwartungen, Implikationen für zinssensitive Sektoren (Versorger, REITs, Immobilien).\n'
      + '5. ENERGIE & ROHSTOFFE: Öl, Kupfer, Gold — was signalisieren sie über globales Wachstum?\n'
      + '6. HOUSING USA: Lage des Immobilienmarkts, Bauaktivität, Implikationen für Zinserwartungen.\n'
      + '7. CONSUMER & DEFENSIVE: Stärke der Consumer-Aktien als Konjunkturindikator.\n'
      + '8. KONKRETE HANDLUNGSEMPFEHLUNG: Für KO-Trader und Options-Wheel-Strategie — welche Sektoren bevorzugen, welche meiden, Positionsgröße, KO-Abstand.\n\n'
      + 'Erstelle das Ergebnis als JSON mit dieser Struktur:\n'
      + '{\n'
      + '  "verdict": "bull" oder "neu" oder "bear",\n'
      + '  "verdictText": "3-4 Sätze Gesamteinschätzung mit konkreter Handlungsempfehlung auf Deutsch",\n'
      + '  "factors": [\n'
      + '    {"icon":"bull","title":"Thema","desc":"Faktenbasierte Analyse 2-3 Sätze mit Implikation für Investor"},\n'
      + '    ... (5-8 Faktoren, jeder Themenbereich der abgedeckt ist bekommt einen Eintrag)\n'
      + '  ]\n'
      + '}\n\n'
      + 'Regeln:\n'
      + '- icon: nur "bull", "neu" oder "bear"\n'
      + '- Jeder factor.desc: 2-3 Sätze, faktenbasiert, mit konkreter Implikation\n'
      + '- Wenn Daten für ein Thema fehlen: diesen Faktor weglassen\n'
      + '- Kein Faktor ohne Datenbasis aus dem Prompt\n'
      + '- Antworte NUR mit dem JSON, kein weiterer Text\n'
      + '- Sprache: Deutsch, professionell aber verständlich';
  }

  // ── OVERSOLD-REBOUND SCAN PROMPT ───────────────────────────────────────────
  /**
   * Prompt für den Oversold-Rebound-Scan (runOversoldScan).
   * Gibt einen JSON-Output-Prompt zurück (candidates[]).
   *
   * @param {object} ctx
   *   ctx.vix          {string}  VIX-Level zum Scanzeitpunkt
   *   ctx.candidateStr {string}  Vorformatierter Kandidaten-String (eine Zeile pro Ticker)
   */
  function _getOversoldPrompt(ctx) {
    var c = ctx || {};
    return 'Du bist ein erfahrener technischer Analyst spezialisiert auf Oversold-Rebounds.\n\n'
      + 'VIX zum Scanzeitpunkt: ' + (c.vix || 'unbekannt') + '\n\n'
      + 'Folgende Titel zeigen potenzielle Oversold-Signale (RSI niedrig, unter MA50 oder 52W-Hoch stark gefallen):\n\n'
      + (c.candidateStr || '') + '\n\n'
      + 'AUFGABE: Bewerte jeden Titel auf Oversold-Rebound-Potenzial. Antworte NUR mit JSON, kein anderer Text:\n'
      + '{"candidates":[{"sym":"AAPL","oversold_score":75,"rebound_days":"3-7","rationale":"RSI 28, Volume-Spike, MACD dreht","risk":"BEAR-Markt, kein Boden bestätigt"}]}\n'
      + 'oversold_score: 0-100 (100 = maximale Oversold-Wahrscheinlichkeit). '
      + 'HVP aus Scandaten berücksichtigen: >50% = erhöhte Vola = Rebound-Chance höher aber auch Risiko. '
      + 'Wenn kein HVP: NICHT erfinden.\n'
      + 'Sortiere absteigend nach oversold_score. Nur Titel mit oversold_score >= 40 zurückgeben.';
  }

  // ── BACKTESTING META-ANALYSE PROMPT ───────────────────────────────────────
  /**
   * Prompt für die Backtesting Meta-Analyse (runMetaAnalysis).
   * Gibt einen strukturierten DE-Text-Prompt zurück (5 Punkte).
   *
   * @param {object} ctx
   *   ctx.backtestCtx {string}  Vorformatierter Kontext-Block mit Backtest-Daten/KI-Tracking
   *   ctx.dp          {number}  Anzahl Datenpunkte (für Konfidenz-Aussage in Punkt 3)
   */
  function _getMetaAnalysisPrompt(ctx) {
    var c = ctx || {};
    var dp = c.dp || 0;
    return 'Du bist ein quantitativer Analyst der Trading-Scanner-Systeme optimiert.\n\n'
      + (c.backtestCtx || '') + '\n\n'
      + 'AUFGABE: Meta-Analyse dieser Backtesting-Daten.\n'
      + '1. STÄRKEN: Welche Gewichtungsvariante zeigt die robusteste Performance? Warum?\n'
      + '2. SCHWÄCHEN: Was funktioniert nicht? Welche Signale sind wenig prädiktiv?\n'
      + '3. KONFIDENZ: Wie belastbar sind die Aussagen bei ' + dp + ' Datenpunkten?\n'
      + '4. EMPFEHLUNG: Konkrete Gewichtungsanpassung (Tech/SEPA/BP/Sticky/Vol, Summe=100) und Begründung.\n'
      + '5. NÄCHSTE SCHRITTE: Was sollte gesammelt werden um die Datenbasis zu verbessern?\n\n'
      + 'Antworte auf Deutsch, strukturiert 1-5. Max. 350 Wörter. Vollständig abschließen.';
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────
  const KoPrompts = {
    VERSION: '2.22.4',

    STRATEGIES,
    KI_ANTI_HALLUZINATION,

    /**
     * System-Prompt für allgemeine KI-Aufrufe (Public/EIC-Split).
     * Ersetzt getKiSystemPrompt() in index.html.
     * @param {string|null} context - Optionaler Kontext-String (z.B. "Leaderboard: Momentum")
     * @param {boolean} eic - true = EIC/Expert-Modus
     */
    getSystemPrompt(context, eic) {
      return _getSystemPrompt(context, eic);
    },

    /**
     * Morning-Briefing-Prompt (Public/EIC-Split, inkl. STRATEGIE_MATRIX).
     * Ersetzt getMorningBriefingPrompt() in index.html.
     * @param {string[]} messwerteLines - Array der Messwert-Zeilen
     * @param {boolean} eic - true = EIC/Expert-Modus
     * @param {boolean} dixReal - true = echte DIX-Daten vorhanden
     */
    getMorningPrompt(messwerteLines, eic, dixReal) {
      return _getMorningPrompt(messwerteLines, eic, dixReal);
    },

    /** Strategie-IDs die verfügbar sind */
    ids() { return Object.keys(STRATEGIES); },

    /** Prompt-String für eine Strategie erzeugen */
    get(stratId, ctx) {
      var strat = STRATEGIES[stratId];
      if (!strat) {
        console.warn('[KoPrompts] Unbekannte Strategie:', stratId);
        return null;
      }
      return strat.prompt(ctx || {});
    },

    /** Konfiguration (hint + color) für eine Strategie */
    getConfig(stratId) {
      var strat = STRATEGIES[stratId];
      if (!strat) return null;
      return { hint: strat.hint, color: strat.color };
    },

    /** Alle Strategien als Label-Liste für UI-Selector */
    getLabelList() {
      return Object.entries(STRATEGIES).map(function(e) {
        return { strat: e[0], label: e[1].hint.split(':')[0] };
      });
    },

    /**
     * Intermarket/Makro-Analyse-Prompt (autoMakro).
     * Ersetzt den inline-Prompt-Block in autoMakro() / generateDpKI()-Bereich.
     * Gibt JSON-Output-Prompt zurück (verdict / verdictText / factors[]).
     * @param {object} ctx - siehe _getIntermarketPrompt JSDoc
     */
    getIntermarketPrompt(ctx) {
      return _getIntermarketPrompt(ctx);
    },

    /**
     * Oversold-Rebound-Scan-Prompt (runOversoldScan).
     * Ersetzt den inline-Prompt-Block in runOversoldScan().
     * Gibt JSON-Output-Prompt zurück (candidates[]).
     * @param {object} ctx - {vix, candidateStr}
     */
    getOversoldPrompt(ctx) {
      return _getOversoldPrompt(ctx);
    },

    /**
     * Backtesting Meta-Analyse-Prompt (runMetaAnalysis).
     * Ersetzt den inline-Prompt-Block in runMetaAnalysis().
     * Gibt strukturierten DE-Text-Prompt zurück (1-5 Punkte).
     * @param {object} ctx - {backtestCtx, dp}
     */
    getMetaAnalysisPrompt(ctx) {
      return _getMetaAnalysisPrompt(ctx);
    },

    /**
     * Leaderboard-Key für eine Strategie.
     * Ersetzt STRATEGY_TO_LB[stratId] in index.html.
     * @param {string} stratId - Strategie-ID (z.B. 'ko', 'momentum')
     * @returns {string|null} lbKey (z.B. 'ko_long') oder null wenn kein eigener LB-Tab
     */
    getLbKey(stratId) {
      var strat = STRATEGIES[stratId];
      return strat ? (strat.lbKey || null) : null;
    },

    /**
     * Strategie-ID für einen Leaderboard-Key.
     * Ersetzt _lbToStrat[lbKey] in index.html.
     * @param {string} lbKey - Leaderboard-Key (z.B. 'ko_long', 'long_minervini')
     * @returns {string|null} stratId (z.B. 'ko', 'momentum') oder null wenn unbekannt
     */
    stratFromLb(lbKey) {
      var entries = Object.entries(STRATEGIES);
      for (var i = 0; i < entries.length; i++) {
        if (entries[i][1].lbKey === lbKey) return entries[i][0];
      }
      return null;
    },

    /**
     * Vollständige Strategie→Leaderboard-Map (für renderGateWidget).
     * Ersetzt STRATEGY_TO_LB in index.html vollständig.
     * @returns {object} { stratId: lbKey, ... } — nur Einträge mit lbKey !== null
     */
    getStratToLbMap() {
      var map = {};
      Object.entries(STRATEGIES).forEach(function(e) {
        if (e[1].lbKey) map[e[0]] = e[1].lbKey;
      });
      return map;
    },
  };

  // ── EXPORT ─────────────────────────────────────────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = KoPrompts;
  } else {
    global.KoPrompts           = KoPrompts;
    global.KI_ANTI_HALLUZINATION = KI_ANTI_HALLUZINATION;
    global.KoPromptsLoaded     = true;
  }

})(typeof window !== 'undefined' ? window : this);
