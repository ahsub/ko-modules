/**
 * ko-indicators-loader.js — UIQ Indikator-Registry Loader
 * ══════════════════════════════════════════════════════════════════
 * Lädt ko-indicators.json und stellt generische Funktionen bereit:
 *   - waitForAllIndicators()  → Polling-Gate (ersetzt hardcodierte IDs)
 *   - buildPromptSection()    → generischer Prompt-Aufbau
 *   - getIndicatorValue()     → einheitlicher DOM/Window/Aggregator-Read
 *
 * Version: 1.4.2 (17.08.2026) — Sieben neue Konjunktur-Indikatoren (Axel-Anfrage, "auf diesem Auge bislang blind"): nfci, core_cpi_yoy, sahm_rule, oecd_cli_score, heavy_truck_trend (je ein Spezial-Block, strukturierte FRED-Objekte analog hy_spread/net_liquidity), staples_discretionary/growth_value (rein informativ, kein Signal, analog qqq_markov). Client-Parity-Nachzug zu market_aggregator.py v5.36.14/fetch_fred_macro(). Erfordert ko-indicators.json v2.5.0. Noch NICHT live verifiziert.
 *   v1.4.1 (17.08.2026) — vix/vix_term/mse_regime BUGFIX (Axel-Deep-Debug-Anfrage nach Teildaten-Badge): drei Kern-Faktoren (promptWeight hoch/sehr_hoch) waren strukturell nie befüllbar (vix: aggregatorKey fehlte + DOM-Pfad nur bei source=dom aktiv, jetzt source=dom in Registry; vix_term/mse_regime: computeFrom/computeFn nie implementiert, jetzt per Spezial-Block wie hy_spread/move_index gelesen). dataQuality zeigte dadurch permanent 'partial' unabhängig vom echten Datenstand. Erfordert ko-indicators.json v2.4.1.
 *   v1.4.0 (25.07.2026) — dataQuality-Flag in buildMarketContext (Backlog #20): 'full'|'partial'|'minimal' nach Kern-Faktor-Befüllungsgrad (promptWeight hoch/sehr_hoch), _dataQualityDetail mit filled/total/pct/missing. Console-Log erweitert.
 *   v1.3.2 (21.07.2026) — Calendar-Fetch von raw.githubusercontent statt same-origin — MCM: buildMarketContext, signalRules, Makro-Kalender
 *   v1.2.0: Calendar-Faktoren auf explizite decision_utc/meeting_start_utc
 *   umgestellt (kein Timezone-String-Parsing mehr), bufferMinutes fuer
 *   Karenzzeit, FOMC-Zweitage-Fenster.
 * Repository: ahsub/ko-modules
 *
 * Abhängigkeiten: ko-indicators.json (gleicher CDN-Pfad)
 */

'use strict';

// ── Registry (wird via loadIndicatorRegistry() befüllt) ───────────
var _indicatorRegistry = null;
var _registryLoaded = false;

/**
 * Registry laden (einmalig, gecacht)
 * Gibt Promise<registry> zurück
 */
async function loadIndicatorRegistry() {
  if (_registryLoaded && _indicatorRegistry) return _indicatorRegistry;

  try {
    // Gleicher CDN-Pfad wie dieses Modul
    var baseUrl = 'https://cdn.jsdelivr.net/gh/ahsub/ko-modules@' + KO_MODULES_HASH + '/';
    var resp = await fetch(baseUrl + 'ko-indicators.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json();
    _indicatorRegistry = data.indicators;
    _registryLoaded = true;
    console.log('[ko-indicators-loader] Registry geladen — ' +
      Object.keys(_indicatorRegistry).length + ' Indikatoren');
    return _indicatorRegistry;
  } catch(e) {
    console.warn('[ko-indicators-loader] Fallback auf Inline-Registry:', e.message);
    // Fallback: leere Registry, System läuft weiter
    _indicatorRegistry = {};
    _registryLoaded = true;
    return _indicatorRegistry;
  }
}

// ── Hash-Konstante: aus dem EIGENEN Script-Tag ableiten ────────────
// v1.1.0: vorher wurde der Hash des ERSTEN ko-modules@-Scripts genommen
// (i.d.R. ko-config) — ko-indicators.json kam dann aus einem fremden,
// potenziell älteren Commit. Jetzt: Loader + JSON sind versions-gelockt.
var KO_MODULES_HASH = (function() {
  var own = document.querySelectorAll('script[src*="ko-indicators-loader"]');
  var scripts = own.length ? own : document.querySelectorAll('script[src*="ko-modules@"]');
  if (scripts.length > 0) {
    var m = scripts[0].src.match(/ko-modules@([a-f0-9]+)\//);
    return m ? m[1] : 'latest';
  }
  return 'latest';
})();

// ── Indikator-Wert lesen ──────────────────────────────────────────
/**
 * Liest den aktuellen Wert eines Indikators aus der konfigurierten Quelle.
 * @param {string} id - Indikator-ID aus ko-indicators.json
 * @param {object} alphaData - window._alphaData (Aggregator-Daten)
 * @returns {string} Wert oder '—' wenn nicht verfügbar
 */
function getIndicatorValue(id, alphaData) {
  var reg = _indicatorRegistry;
  if (!reg || !reg[id]) return '—';
  var ind = reg[id];

  if (ind.source === 'unavailable') return 'n/v';

  // DOM-Read
  if ((ind.source === 'dom' || ind.source === 'computed') && ind.domId) {
    var el = document.getElementById(ind.domId);
    if (!el && ind.domIdFallback) el = document.getElementById(ind.domIdFallback);
    var val = '';
    if (el) {
      var dv = el.getAttribute('data-value');
      val = (dv !== null && dv !== '') ? dv : el.textContent.trim();
    }
    if (val && val !== '—' && val !== '') return val;
  }

  // Window-Variable (computed)
  if (ind.windowVar && typeof window[ind.windowVar] !== 'undefined') {
    return window[ind.windowVar] ? 'über SMA200' : 'unter SMA200';
  }

  // Aggregator-Key
  if (ind.source === 'aggregator' && ind.aggregatorKey && alphaData) {
    var keys = ind.aggregatorKey.split('.');
    var obj = alphaData.market || alphaData;
    for (var k of keys) { obj = obj ? obj[k] : null; }
    if (obj !== null && obj !== undefined) return String(obj);
  }

  return '—';
}

// ── Polling-Gate ──────────────────────────────────────────────────
/**
 * Wartet bis alle DOM-basierten Indikatoren im DOM befüllt sind.
 * Ersetzt hardcodierte setTimeout-Ketten.
 * @param {string[]} ids - Indikator-IDs die warten sollen (default: alle 'dom' mit loadFn)
 * @param {number} timeoutMs - Max. Wartezeit (default: 20000ms)
 * @returns Promise<void>
 */
async function waitForAllIndicators(ids, timeoutMs) {
  var reg = _indicatorRegistry;
  if (!reg) return; // kein Registry = kein Warten

  // Default: alle DOM-Indikatoren mit loadFn und hohem promptWeight
  var targets = ids || Object.keys(reg).filter(function(id) {
    var ind = reg[id];
    return ind.source === 'dom' && ind.loadFn &&
           (ind.promptWeight === 'hoch' || ind.promptWeight === 'sehr_hoch');
  });

  var timeout = timeoutMs || 20000;
  var interval = 500;
  var elapsed = 0;

  return new Promise(function(resolve) {
    var poll = setInterval(function() {
      var allReady = targets.every(function(id) {
        var ind = reg[id];
        if (!ind || !ind.domId) return true; // kein DOM = kein Warten
        var el = document.getElementById(ind.domId);
        if (!el && ind.domIdFallback) el = document.getElementById(ind.domIdFallback);
        if (!el) return false;
        var dv = el.getAttribute('data-value');
        var val = (dv !== null && dv !== '') ? dv : el.textContent.trim();
        return val && val !== '—' && val !== '';
      });

      elapsed += interval;
      if (allReady || elapsed >= timeout) {
        clearInterval(poll);
        if (!allReady) {
          console.warn('[ko-indicators-loader] Timeout — nicht alle Indikatoren bereit nach ' +
            elapsed + 'ms. Fehlend:',
            targets.filter(function(id) {
              var ind = reg[id];
              var el = ind && ind.domId ? document.getElementById(ind.domId) : null;
              return !el || !el.textContent.trim() || el.textContent.trim() === '—';
            })
          );
        }
        resolve();
      }
    }, interval);
  });
}

// ── Prompt-Aufbau ─────────────────────────────────────────────────
/**
 * Baut einen strukturierten Prompt-Abschnitt aus der Registry.
 * @param {string} category - 'volatility'|'sentiment'|'macro'|'commodity'|'fx'|'regime'
 * @param {object} alphaData - window._alphaData
 * @returns {string[]} Array von Prompt-Zeilen
 */
function buildPromptSection(category, alphaData) {
  var reg = _indicatorRegistry;
  if (!reg) return [];

  var categoryLabels = {
    regime:     '--- MARKT-REGIME ---',
    volatility: '--- VOLATILITÄT & FLOW ---',
    sentiment:  '--- SENTIMENT ---',
    macro:      '--- MAKRO-INDIKATOREN ---',
    commodity:  '--- ROHSTOFFE & WÄHRUNGEN ---',
    fx:         '--- WÄHRUNGEN ---',
    fred:       '--- KREDIT & LIQUIDITÄT (FRED) ---',
    derived:    '--- ABGELEITETE INDIKATOREN ---',
    calendar:   '--- KALENDER-EVENTS ---',
  };

  var lines = [];
  if (categoryLabels[category]) lines.push(categoryLabels[category]);

  // Nach promptWeight sortieren: sehr_hoch → hoch → mittel → niedrig
  var weightOrder = { sehr_hoch: 0, hoch: 1, mittel: 2, niedrig: 3 };
  var inds = Object.entries(reg)
    .filter(function(e) { return e[1].category === category; })
    .sort(function(a, b) {
      return (weightOrder[a[1].promptWeight] || 2) - (weightOrder[b[1].promptWeight] || 2);
    });

  inds.forEach(function(entry) {
    var id = entry[0];
    var ind = entry[1];

    // FRED/derived/calendar: Werte kommen aus market_context (buildMarketContext),
    // nicht aus getIndicatorValue (liefert nur einfache DOM/Aggregator-Werte).
    // market_context ist via window._lastMseResult._marketCtx erreichbar.
    if (ind.category === 'fred' || ind.source === 'calendar') {
      var _ctx = (window._lastMseResult && window._lastMseResult._marketCtx)
        ? window._lastMseResult._marketCtx : null;
      if (_ctx && _ctx.factors && _ctx.factors[id]) {
        var _f = _ctx.factors[id];
        var _sig = _f.signal ? ' [' + _f.signal.toUpperCase() + ']' : '';
        lines.push(_f.label + _sig);
      }
      return;
    }

    var val = getIndicatorValue(id, alphaData);
    if (val === '—' && ind.promptWeight === 'niedrig') return;
    var unit = ind.unit ? ' ' + ind.unit : '';
    var _hint = ind.promptHint ? ' (' + ind.promptHint + ')' : '';
    lines.push(ind.promptKey + ': ' + val + unit);
  });

  return lines;
}

// ── MCM: Market Context Module (v1.1.0) ───────────────────────────
/**
 * Signal aus deklarativen Regeln ableiten.
 * Regeln werden in Reihenfolge geprüft — erste passende gewinnt.
 * @param {Array} rules - [{signal, gte?, gt?, lte?, lt?}, ...]
 * @param {number} val  - numerischer Wert
 * @returns {string|null} 'ok'|'caution'|'risk' oder null wenn keine Regel passt
 */
function _evalSignalRules(rules, val, zscore, signalStr) {
  // val     = Rohwert (numerisch)
  // zscore  = optionaler Z-Score für zgte/zlte-Regeln
  // signalStr = optionaler Signal-String für signal_eq-Regeln (z.B. "WARNUNG")
  if (!rules) return null;
  for (var i = 0; i < rules.length; i++) {
    var r = rules[i];
    var match = true;
    // Numerische Regeln (Rohwert)
    if (r.gte != null && (val == null || isNaN(val) || !(val >= r.gte))) match = false;
    if (r.gt  != null && (val == null || isNaN(val) || !(val >  r.gt)))  match = false;
    if (r.lte != null && (val == null || isNaN(val) || !(val <= r.lte))) match = false;
    if (r.lt  != null && (val == null || isNaN(val) || !(val <  r.lt)))  match = false;
    // Z-Score-Regeln (für FRED-Indikatoren wie HY-Spread, MOVE)
    if (r.zgte != null && (zscore == null || isNaN(zscore) || !(zscore >= r.zgte))) match = false;
    if (r.zlte != null && (zscore == null || isNaN(zscore) || !(zscore <= r.zlte))) match = false;
    // Signal-String-Vergleich (für SKEW/VVIX-Divergenz)
    if (r.signal_eq != null && signalStr !== r.signal_eq) match = false;
    // Trend-Regeln (für Net Liquidity)
    if (r.trend4w_lte != null) {
      // wird in buildMarketContext gesondert ausgewertet
      match = false; // Platzhalter — echte Auswertung in buildMarketContext
    }
    if (match) return r.signal;
  }
  return null;
}

// Makro-Kalender Cache (fail-closed: null = keine Events = keine Flags)
var _macroCalendar = null;
var _macroCalendarLoaded = false;

/**
 * macro-calendar.json laden — direkt von raw.githubusercontent.com (nicht vom
 * eigenen CF-Pages-Server). Grund (14.07.2026): Der manuelle Deploy-Prozess
 * (Axel zippt index.html + help.html, laedt via CF Pages hoch) nimmt neue
 * statische Dateien wie macro-calendar.json NIE automatisch mit — die Datei
 * war im Git-Repo, aber nie live erreichbar (CF gab die 404-HTML-Seite
 * zurueck, die dann als "<!DOCTYPE..." beim JSON-Parse crashte). Direkter
 * GitHub-Read entkoppelt das Frontend vollstaendig vom Deploy-Zip — identisch
 * zur bereits bestehenden Python-Server-Loesung (_mcm_load_macro_calendar()
 * in market_aggregator.py), eine einzige Quelle fuer beide Seiten.
 * FAIL-CLOSED: Bei Fehler bleibt _macroCalendar null — Calendar-Faktoren
 * setzen dann kein Signal statt eines falschen.
 */
async function loadMacroCalendar() {
  if (_macroCalendarLoaded) return _macroCalendar;
  try {
    var resp = await fetch(
      'https://raw.githubusercontent.com/ahsub/axel-scanner/main/macro-calendar.json',
      { cache: 'no-store' }
    );
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json();
    _macroCalendar = (data && Array.isArray(data.events)) ? data.events : null;
    console.log('[MCM] Makro-Kalender geladen (GitHub) — ' + (_macroCalendar ? _macroCalendar.length : 0) + ' Events');
  } catch (e) {
    console.warn('[MCM] macro-calendar.json nicht ladbar (fail-closed, keine Event-Flags):', e.message);
    _macroCalendar = null;
  }
  _macroCalendarLoaded = true;
  return _macroCalendar;
}

/**
 * Calendar-Faktor auswerten: liegt JETZT im Event-Fenster?
 * v1.1.0: nutzt explizite decision_utc/meeting_start_utc ISO-Zeitstempel
 * statt Timezone-String-Parsing (v1.0.0 hatte '-04:00' hardcodiert —
 * bei EST-Terminen nach DST-Ende wäre das 1h daneben gelegen).
 * Fenster: [meeting_start_utc ?? decision_utc - windowHoursBefore] bis
 *          [decision_utc + windowHoursAfter], zusätzlich bufferMinutes
 *          symmetrisch für Karenzzeit um den exakten Decision-Zeitpunkt.
 * @returns {object|null} { value, signal, label } oder null (fail-closed)
 */
function _evalCalendarFactor(ind, now) {
  if (!_macroCalendar) return null; // fail-closed
  var hBefore = (ind.windowHoursBefore != null ? ind.windowHoursBefore : 24) * 3600000;
  var hAfter  = (ind.windowHoursAfter  != null ? ind.windowHoursAfter  : 4)  * 3600000;
  var bufMin  = (ind.bufferMinutes != null ? ind.bufferMinutes : 0) * 60000;

  for (var i = 0; i < _macroCalendar.length; i++) {
    var ev = _macroCalendar[i];
    if (ev.type !== ind.eventType || !ev.decision_utc) continue;
    var decisionTime = new Date(ev.decision_utc).getTime();
    if (isNaN(decisionTime)) continue;

    // Fenster-Start: Zweitage-Sitzungsbeginn falls vorhanden, sonst hBefore vor Decision
    var windowStart = ev.meeting_start_utc
      ? new Date(ev.meeting_start_utc).getTime()
      : decisionTime - hBefore;
    windowStart -= bufMin; // zusätzliche Karenzzeit vor Sitzungsbeginn
    var windowEnd = decisionTime + hAfter + bufMin;

    if (now >= windowStart && now <= windowEnd) {
      var diffToDecision = decisionTime - now;
      var hrs = Math.round(diffToDecision / 3600000);
      return {
        value:  true,
        signal: ind.signalOnEvent || 'caution',
        label:  ev.label + (diffToDecision >= 0 ? ' in ' + hrs + 'h' : ' vor ' + (-hrs) + 'h') +
                (ev.note ? ' (' + ev.note + ')' : ''),
        event:  ev.label,
        hours:  hrs,
      };
    }
  }
  return null; // kein Event im Fenster
}

/**
 * MARKET CONTEXT bauen — Single Source of Truth für Strategie-Ampel UND KI-Prompt.
 * Liest ALLE enabled-Indikatoren aus der Registry, leitet Signale ab,
 * wertet Calendar-Faktoren aus und aggregiert ein Summary.
 *
 * MUSS erst nach vollständigem Datenladen aufgerufen werden
 * (nach waitForAllIndicators in runMorningBriefing Schritt 8→9).
 *
 * @param {object} alphaData - window._alphaData (Aggregator-Daten)
 * @param {string} regime    - aktuelles MSE-Regime (KoMarketState._lastRegime)
 * @returns {object} market_context
 */
async function buildMarketContext(alphaData, regime) {
  var reg = _indicatorRegistry;
  if (!reg) { console.warn('[MCM] Registry nicht geladen'); return null; }
  await loadMacroCalendar();

  var now = Date.now();
  var ctx = {
    _generated: new Date(now).toISOString(),
    _regime:    regime || null,
    factors:    {},
    summary:    { risk_level: 'low', caution_flags: [], risk_flags: [] },
  };

  Object.keys(reg).forEach(function(id) {
    var ind = reg[id];
    if (ind.enabled === false) return;           // abschaltbar ohne Code
    if (ind.source === 'unavailable') return;

    // Calendar-Faktoren gesondert
    if (ind.source === 'calendar') {
      var evResult = _evalCalendarFactor(ind, now);
      if (evResult) {
        ctx.factors[id] = evResult;
        if (evResult.signal === 'caution') ctx.summary.caution_flags.push(id);
        if (evResult.signal === 'risk')    ctx.summary.risk_flags.push(id);
      }
      return; // kein Event im Fenster → Faktor gar nicht im Context (fail-closed)
    }

    // Normale Indikatoren: Wert lesen, Signal ableiten
    var raw = getIndicatorValue(id, alphaData);
    if (raw === '—' || raw === 'n/v' || raw === '') return;

    // BUGFIX (v1.3.2, 21.07.2026): DOM-Elemente wie #intermarket-score und #bull-score
    // schreiben "55/100" als textContent. Das Regex /[^0-9.\-]/g entfernt "/" und
    // produziert "55100" statt 55 — falsche RISK-Klassifizierung.
    // Fix: vor dem Regex-Strip am "/" splitten, nur ersten Teil nehmen.
    var num = parseFloat(String(raw).split('/')[0].replace(/[^0-9.\-]/g, ''));
    var signal = _evalSignalRules(ind.signalRules, num);

    ctx.factors[id] = {
      value:  isNaN(num) ? raw : num,
      raw:    raw,
      signal: signal,   // null wenn keine signalRules definiert
      label:  ind.promptKey + ': ' + raw + (ind.unit ? ' ' + ind.unit : ''),
    };
    if (signal === 'caution') ctx.summary.caution_flags.push(id);
    if (signal === 'risk')    ctx.summary.risk_flags.push(id);
  });

  // NACHGERUESTET (25.08.2026, Axel-Bugreport VIX-Diskrepanz Morning
  // Briefing) — Zeitstempel fuer den vix-Faktor anhaengen, falls das DOM-
  // Element (m-vix, s. fetchVix()/index.html) ein data-asof-Attribut
  // gesetzt hat. Macht sichtbar, WENN der VIX-Wert nicht vom heutigen Tag
  // ist, statt eine moeglicherweise 1-2 Handelstage alte Zahl unmarkiert
  // als aktuell erscheinen zu lassen. Bewusst NICHT in getIndicatorValue()
  // eingebaut (generische Funktion fuer viele Indikatoren, keine VIX-
  // Spezialbehandlung dort) -- stattdessen hier als gezielte Nachbearbeitung,
  // gleiches Muster wie die Spezial-Bloecke unten fuer vix_term etc.
  if (ctx.factors.vix) {
    var _vixEl = document.getElementById('m-vix');
    var _vixAsOf = _vixEl ? _vixEl.getAttribute('data-asof') : null;
    if (_vixAsOf) {
      ctx.factors.vix.asOf = _vixAsOf;
      ctx.factors.vix.label += ' (Stand: ' + _vixAsOf + ')';
    }
  }

  // ── Spezial-Auswertung FRED/Derived-Indikatoren (v1.3.0) ─────────
  // Diese können nicht über getIndicatorValue() gelesen werden da sie
  // strukturierte Objekte zurückgeben (nicht einzelne Zahlen).
  var _mkt = (alphaData && alphaData.market) ? alphaData.market : null;

  // HY Credit Spread (Z-Score basiert)
  if (reg.hy_spread && reg.hy_spread.enabled !== false && _mkt && _mkt.fredMacro && _mkt.fredMacro.hy_spread && _mkt.fredMacro.hy_spread.ok) {
    var _hy = _mkt.fredMacro.hy_spread;
    var _hySignal = _evalSignalRules(reg.hy_spread.signalRules, _hy.current, _hy.zscore, null);
    ctx.factors.hy_spread = {
      value: _hy.current, zscore: _hy.zscore, percentile: _hy.percentile,
      signal: _hySignal,
      label: 'HY Credit Spread: ' + _hy.current + '% (Z=' + (_hy.zscore>=0?'+':'') + _hy.zscore + ', P' + _hy.percentile + ') → ' + (_hy.signal||''),
    };
    if (_hySignal === 'caution') ctx.summary.caution_flags.push('hy_spread');
    if (_hySignal === 'risk')    ctx.summary.risk_flags.push('hy_spread');
  }

  // US Net Liquidity (Trend-basiert)
  if (reg.net_liquidity && reg.net_liquidity.enabled !== false && _mkt && _mkt.fredMacro && _mkt.fredMacro.net_liquidity && _mkt.fredMacro.net_liquidity.ok) {
    var _nl = _mkt.fredMacro.net_liquidity;
    var _nlSignal = (_nl.trend_4w != null && _nl.trend_4w <= 0) ? 'caution' : 'ok';
    ctx.factors.net_liquidity = {
      value: _nl.current, trend_4w: _nl.trend_4w,
      signal: _nlSignal,
      label: 'US Net Liquidity: ' + _nl.current + ' Mrd USD (4W-Trend: ' + (_nl.trend_4w>=0?'+':'') + _nl.trend_4w + ') → ' + (_nl.signal||''),
    };
    if (_nlSignal === 'caution') ctx.summary.caution_flags.push('net_liquidity');
  }

  // MOVE Index (Z-Score basiert)
  // BUGFIX (16.08.2026, Axel-Deep-Debug-Anfrage): pruefte bisher _mkt.zscores.move —
  // dieser Pfad existiert strukturell NIE (macro_zscores/_entry() liefert nur
  // vvix/skew/vix/vixRatio/skew_vvix_divergence, nie 'move'). Die echten MOVE-
  // Index-Daten (inkl. Z-Score) liegen unter dem TOP-LEVEL-Key market.moveIndex
  // (siehe fetch_move_index() im Aggregator). Dieser Block hat dadurch seit
  // Einfuehrung (v2.2.0, 20.07.2026) NIE ausgeloest — MOVE Index war strukturell
  // unerreichbar fuer die KI, exakt dieselbe Fehlerklasse wie der breadth_osc-
  // Bug (falscher Feldpfad, kein einziger Live-Treffer moeglich).
  if (reg.move_index && reg.move_index.enabled !== false && _mkt && _mkt.moveIndex && _mkt.moveIndex.ok) {
    var _move = _mkt.moveIndex;
    var _moveSignal = _evalSignalRules(reg.move_index.signalRules, _move.current, _move.zscore, null);
    ctx.factors.move_index = {
      value: _move.current, zscore: _move.zscore, percentile: _move.percentile,
      signal: _moveSignal,
      label: 'MOVE Index: ' + _move.current + ' (Z=' + (_move.zscore>=0?'+':'') + _move.zscore + ', P' + _move.percentile + ')',
    };
    if (_moveSignal === 'caution') ctx.summary.caution_flags.push('move_index');
    if (_moveSignal === 'risk')    ctx.summary.risk_flags.push('move_index');
  }

  // SKEW/VVIX-Divergenz (16.08.2026: von fragilem exaktem String-Vergleich
  // signal_eq==="WARNUNG" auf numerischen Divergenzwert umgestellt — das
  // Server-Feld signal ist ein ganzer Satz ("WARNUNG: Institutionelle..."),
  // nie exakt gleich dem kurzen Token "WARNUNG". Caution-Flag hat dadurch
  // seit Einfuehrung nie ausgeloest, obwohl der Rohwert im Prompt-Text stand.
  if (reg.skew_vvix_div && reg.skew_vvix_div.enabled !== false && _mkt && _mkt.zscores && _mkt.zscores.skew_vvix_divergence && _mkt.zscores.skew_vvix_divergence.ok) {
    var _div = _mkt.zscores.skew_vvix_divergence;
    var _divSignal = _evalSignalRules(reg.skew_vvix_div.signalRules, _div.value, null, _div.signal);
    ctx.factors.skew_vvix_div = {
      value: _div.value, signalStr: _div.signal,
      signal: _divSignal,
      label: 'SKEW/VVIX-Divergenz: ' + _div.value + ' → ' + _div.signal,
    };
    if (_divSignal === 'caution') ctx.summary.caution_flags.push('skew_vvix_div');
  }

  // VIX Termstruktur (17.08.2026, Axel-Deep-Debug-Anfrage) — computeFrom-Feld
  // in der Registry war nie implementiert (kein Code-Pfad wertet computeFrom
  // aus), Faktor daher strukturell immer '—'. Echter Wert liegt laengst
  // korrekt unter market.vixTerm (KoDarkPool.fetchVIXTerm(), server-seitig
  // im Aggregator gespiegelt) — jetzt analog zu hy_spread/move_index direkt
  // gelesen statt ueber getIndicatorValue().
  if (reg.vix_term && reg.vix_term.enabled !== false && _mkt && _mkt.vixTerm) {
    var _vt = _mkt.vixTerm;
    // NACHGERUESTET (25.08.2026, Axel-Bugreport VIX-Diskrepanz) — Spot-VIX
    // fuer die Terminstruktur-Anzeige wiederverwendet aus ctx.factors.vix
    // (DOM/live, s.o.), FALLS vorhanden, statt eigenstaendig _mkt.vixTerm.vix
    // (Aggregator-Snapshot) zu zeigen. Beide Werte koennen je nach Update-
    // Zeitpunkt der zwei komplett unabhaengigen Datenpipelines (Yahoo-Live
    // vs. GHA-Aggregator-Lauf) unterschiedlich alt sein -- frueher wurden sie
    // unmarkiert nebeneinander im selben Briefing angezeigt (16.01 vs. 15.13
    // am 25.08.2026 beobachtet). Vereinheitlicht auf EINE Quelle pro Anzeige,
    // Spread wird bei Override konsistent neu berechnet (sonst Spread-Zahl
    // gegen einen anderen VIX-Wert als den angezeigten gerechnet).
    var _vtVix = (ctx.factors.vix && ctx.factors.vix.value != null) ? ctx.factors.vix.value : _vt.vix;
    var _vtSpread = (_vtVix !== _vt.vix && _vt.vix3m != null)
      ? Math.round((_vt.vix3m - _vtVix) * 100) / 100
      : _vt.spread;
    var _vtAsOf = (ctx.factors.vix && ctx.factors.vix.asOf) ? ' (Stand: ' + ctx.factors.vix.asOf + ')' : '';
    var _vtSignal = _evalSignalRules(reg.vix_term.signalRules, null, null, _vt.structure);
    ctx.factors.vix_term = {
      value: _vt.structure, vix: _vtVix, vix3m: _vt.vix3m, spread: _vtSpread,
      signal: _vtSignal,
      label: 'VIX Termstruktur: ' + _vt.structure + ' (VIX ' + _vtVix + ' / VIX3M ' + _vt.vix3m + ', Spread ' + _vtSpread + ')' + _vtAsOf,
    };
    if (_vtSignal === 'caution') ctx.summary.caution_flags.push('vix_term');
    if (_vtSignal === 'risk')    ctx.summary.risk_flags.push('vix_term');
  }

  // MSE Regime (17.08.2026, Axel-Deep-Debug-Anfrage) — computeFn verwies auf
  // KoMarketState.getRegime, eine Methode die im gesamten Code nie existiert
  // hat (Registry-Versprechen ohne Umsetzung). Echtes Regime liegt unter
  // KoMarketState._lastRegime bzw. wird bereits als Parameter an
  // buildMarketContext(alphaData, regime) durchgereicht (steht schon in
  // ctx._regime) — hier nur noch in ctx.factors gespiegelt fuer Prompt/
  // dataQuality-Zaehlung.
  if (reg.mse_regime && reg.mse_regime.enabled !== false) {
    var _regimeVal = ctx._regime || (typeof KoMarketState !== 'undefined' ? KoMarketState._lastRegime : null);
    if (_regimeVal) {
      ctx.factors.mse_regime = {
        value: _regimeVal, signal: null,
        label: 'MSE Regime: ' + _regimeVal,
      };
    }
  }

  // ── Konjunktur-Indikatoren (17.08.2026, Axel-Anfrage — "auf diesem Auge
  // bislang blind"). Client-Parity-Nachzug zu market_aggregator.py v5.36.14
  // (fetch_fred_macro()). Alle sieben lesen strukturierte Objekte, daher wie
  // hy_spread/net_liquidity per Spezial-Block statt generischem aggregatorKey.

  // NFCI (Chicago Fed National Financial Conditions Index, woechentlich)
  if (reg.nfci && reg.nfci.enabled !== false && _mkt && _mkt.fredMacro && _mkt.fredMacro.nfci && _mkt.fredMacro.nfci.ok) {
    var _nfci = _mkt.fredMacro.nfci;
    var _nfciSignal = _evalSignalRules(reg.nfci.signalRules, _nfci.current, _nfci.zscore, null);
    ctx.factors.nfci = {
      value: _nfci.current, zscore: _nfci.zscore, percentile: _nfci.percentile,
      signal: _nfciSignal,
      label: 'NFCI (Chicago Fed): ' + (_nfci.current >= 0 ? '+' : '') + _nfci.current.toFixed(3) +
             (_nfci.zscore != null ? ' (Z=' + (_nfci.zscore >= 0 ? '+' : '') + _nfci.zscore + ')' : '') +
             ' → ' + (_nfci.signal || ''),
    };
    if (_nfciSignal === 'caution') ctx.summary.caution_flags.push('nfci');
    if (_nfciSignal === 'risk')    ctx.summary.risk_flags.push('nfci');
  }

  // US Core CPI YoY (ex Food & Energy)
  if (reg.core_cpi_yoy && reg.core_cpi_yoy.enabled !== false && _mkt && _mkt.fredMacro && _mkt.fredMacro.core_cpi_yoy && _mkt.fredMacro.core_cpi_yoy.ok) {
    var _cpi = _mkt.fredMacro.core_cpi_yoy;
    var _cpiSignal = _evalSignalRules(reg.core_cpi_yoy.signalRules, _cpi.current, _cpi.zscore, null);
    ctx.factors.core_cpi_yoy = {
      value: _cpi.current, zscore: _cpi.zscore,
      signal: _cpiSignal,
      label: 'US Core CPI YoY: ' + _cpi.current + '%',
    };
    if (_cpiSignal === 'caution') ctx.summary.caution_flags.push('core_cpi_yoy');
  }

  // Sahm-Rule (offizielle FRED-Serie SAHMREALTIME, ueber unemployment.sahmRule)
  if (reg.sahm_rule && reg.sahm_rule.enabled !== false && _mkt && _mkt.fredMacro && _mkt.fredMacro.unemployment && _mkt.fredMacro.unemployment.ok && _mkt.fredMacro.unemployment.sahmRule != null) {
    var _un = _mkt.fredMacro.unemployment;
    var _sahmSignal = _evalSignalRules(reg.sahm_rule.signalRules, _un.sahmRule, null, null);
    ctx.factors.sahm_rule = {
      value: _un.sahmRule, signal: _sahmSignal,
      label: 'Sahm-Rule: ' + (_un.sahmRule >= 0 ? '+' : '') + _un.sahmRule.toFixed(2) +
             ' Pkt (Arbeitslosenrate ' + _un.current + '%, Trigger ≥0.50)',
    };
    if (_sahmSignal === 'risk') ctx.summary.risk_flags.push('sahm_rule');
  }

  // OECD Composite Leading Indicator (USA, Quadranten-Score aus Level + Richtung)
  if (reg.oecd_cli_score && reg.oecd_cli_score.enabled !== false && _mkt && _mkt.fredMacro && _mkt.fredMacro.oecd_cli && _mkt.fredMacro.oecd_cli.ok) {
    var _cli = _mkt.fredMacro.oecd_cli;
    var _cliSignal = _evalSignalRules(reg.oecd_cli_score.signalRules, _cli.quadrantScore, null, null);
    ctx.factors.oecd_cli_score = {
      value: _cli.quadrantScore, signal: _cliSignal,
      label: 'OECD Composite Leading Indicator (USA): ' + _cli.current + ' → ' + (_cli.signal || ''),
    };
    if (_cliSignal === 'caution') ctx.summary.caution_flags.push('oecd_cli_score');
    if (_cliSignal === 'risk')    ctx.summary.risk_flags.push('oecd_cli_score');
  }

  // Heavy Truck Sales (10-Monats-Schnitt, 3M-Trend — Axel-Vorschlag)
  if (reg.heavy_truck_trend && reg.heavy_truck_trend.enabled !== false && _mkt && _mkt.fredMacro && _mkt.fredMacro.heavy_truck && _mkt.fredMacro.heavy_truck.ok && _mkt.fredMacro.heavy_truck.trend_3m_pct != null) {
    var _truck = _mkt.fredMacro.heavy_truck;
    var _truckSignal = _evalSignalRules(reg.heavy_truck_trend.signalRules, _truck.trend_3m_pct, null, null);
    ctx.factors.heavy_truck_trend = {
      value: _truck.trend_3m_pct, signal: _truckSignal,
      label: 'Heavy Truck Sales (10M-Schnitt, 3M-Trend): ' + (_truck.trend_3m_pct >= 0 ? '+' : '') +
             _truck.trend_3m_pct + '% → ' + (_truck.signal || ''),
    };
    if (_truckSignal === 'caution') ctx.summary.caution_flags.push('heavy_truck_trend');
  }

  // Consumer Staples vs. Discretionary (XLP/XLY) — rein informativ, kein Signal
  if (reg.staples_discretionary && reg.staples_discretionary.enabled !== false && _mkt && _mkt.stapleDiscretionary && _mkt.stapleDiscretionary.ok) {
    var _sd = _mkt.stapleDiscretionary;
    ctx.factors.staples_discretionary = {
      value: _sd.trend, signal: null,
      label: 'Consumer Staples vs. Discretionary (XLP/XLY): ' + _sd.ratio +
             ' — 5T ' + _sd.chg5d + '% / 20T ' + _sd.chg20d + '% (' + _sd.trend + ')',
    };
  }

  // Growth vs. Value (IWF/IWD) — rein informativ, kein Signal
  if (reg.growth_value && reg.growth_value.enabled !== false && _mkt && _mkt.growthValue && _mkt.growthValue.ok) {
    var _gv = _mkt.growthValue;
    ctx.factors.growth_value = {
      value: _gv.trend, signal: null,
      label: 'Growth vs. Value (IWF/IWD): ' + _gv.ratio +
             ' — 5T ' + _gv.chg5d + '% / 20T ' + _gv.chg20d + '% (' + _gv.trend + ')',
    };
  }

  // QQQ Markov-Regime (Window-Variable)
  if (reg.qqq_markov && reg.qqq_markov.enabled !== false) {
    var _qqq = (typeof window !== 'undefined' && window._lastQqqRegime) ? window._lastQqqRegime : null;
    if (_qqq) {
      ctx.factors.qqq_markov = {
        value: _qqq, signal: null,
        label: 'QQQ Markov: ' + _qqq,
      };
    }
  }

  // Aggregiertes Risk-Level: risk-Flag → 'high' | ≥2 caution → 'elevated' | sonst 'low'
  if (ctx.summary.risk_flags.length > 0)          ctx.summary.risk_level = 'high';
  else if (ctx.summary.caution_flags.length >= 2) ctx.summary.risk_level = 'elevated';

  // ── dataQuality-Flag (v1.4.0, 25.07.2026, Backlog #20) ───────────
  // Zählt promptWeight='hoch'/'sehr_hoch' als Kern-Faktoren (Pflichtkorb).
  // Stufen: full ≥80% befüllt | partial 40–79% | minimal <40%
  (function() {
    var coreIds = Object.keys(reg).filter(function(id) {
      var w = reg[id].promptWeight;
      return (w === 'hoch' || w === 'sehr_hoch') &&
             reg[id].enabled !== false &&
             reg[id].source !== 'unavailable' &&
             reg[id].source !== 'calendar';
    });
    var filled = coreIds.filter(function(id) { return !!ctx.factors[id]; }).length;
    var total  = coreIds.length;
    var pct    = total > 0 ? filled / total : 0;
    ctx.dataQuality        = pct >= 0.8 ? 'full' : pct >= 0.4 ? 'partial' : 'minimal';
    ctx._dataQualityDetail = { filled: filled, total: total, pct: Math.round(pct * 100), missing: coreIds.filter(function(id) { return !ctx.factors[id]; }) };
  })();

  // v1.3.0: market_context in _lastMseResult._marketCtx speichern für buildPromptSection
  if (typeof window !== 'undefined' && window._lastMseResult) {
    window._lastMseResult._marketCtx = ctx;
  }

  console.log('[MCM] market_context gebaut — ' + Object.keys(ctx.factors).length +
    ' Faktoren | dataQuality: ' + ctx.dataQuality +
    ' (' + ctx._dataQualityDetail.filled + '/' + ctx._dataQualityDetail.total + ' Kern)' +
    (ctx._dataQualityDetail.missing.length ? ' | fehlend: ' + ctx._dataQualityDetail.missing.join(',') : '') +
    ' | risk_level: ' + ctx.summary.risk_level +
    (ctx.summary.caution_flags.length ? ' | caution: ' + ctx.summary.caution_flags.join(',') : '') +
    (ctx.summary.risk_flags.length ? ' | RISK: ' + ctx.summary.risk_flags.join(',') : ''));
  return ctx;
}

/**
 * market_context → Prompt-Zeilen für KI (ersetzt verstreute DOM-Reads).
 * @param {object} ctx - Ergebnis von buildMarketContext()
 * @returns {string[]} Prompt-Zeilen
 */
function contextToPromptLines(ctx) {
  if (!ctx) return [];
  var lines = [];
  lines.push('--- MARKET CONTEXT (Single Source of Truth, ' + ctx._generated + ') ---');
  if (ctx._regime) lines.push('MSE Regime: ' + ctx._regime);
  lines.push('Aggregiertes Risk-Level: ' + ctx.summary.risk_level.toUpperCase() +
    (ctx.summary.caution_flags.length ? ' | Caution: ' + ctx.summary.caution_flags.join(', ') : '') +
    (ctx.summary.risk_flags.length ? ' | Risk: ' + ctx.summary.risk_flags.join(', ') : ''));
  lines.push('');
  Object.keys(ctx.factors).forEach(function(id) {
    var f = ctx.factors[id];
    var sig = f.signal ? ' [' + f.signal.toUpperCase() + ']' : '';
    lines.push(f.label + sig);
  });
  return lines;
}

// ── Indikatoren-Liste für Debugging ──────────────────────────────
function listIndicators() {
  var reg = _indicatorRegistry;
  if (!reg) { console.warn('Registry nicht geladen'); return; }
  console.table(Object.entries(reg).map(function(e) {
    return {
      id: e[0],
      label: e[1].label,
      category: e[1].category,
      source: e[1].source,
      weight: e[1].promptWeight,
      value: getIndicatorValue(e[0], window._alphaData)
    };
  }));
}

console.log('[ko-indicators-loader] v1.3.2 geladen — Indikator-Registry + Market Context Module (MCM) + erweiterte signalRules (zgte/signal_eq) + 5 neue FRED/Derived-Indikatoren');
