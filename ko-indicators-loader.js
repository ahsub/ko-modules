/**
 * ko-indicators-loader.js — UIQ Indikator-Registry Loader
 * ══════════════════════════════════════════════════════════════════
 * Lädt ko-indicators.json und stellt generische Funktionen bereit:
 *   - waitForAllIndicators()  → Polling-Gate (ersetzt hardcodierte IDs)
 *   - buildPromptSection()    → generischer Prompt-Aufbau
 *   - getIndicatorValue()     → einheitlicher DOM/Window/Aggregator-Read
 *
 * Version: 1.3.0 (20.07.2026) — Calendar-Fetch von raw.githubusercontent statt same-origin — MCM: buildMarketContext, signalRules, Makro-Kalender
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
    var val = getIndicatorValue(id, alphaData);
    if (val === '—' && ind.promptWeight === 'niedrig') return; // niedrig-Prio überspringen wenn leer
    var unit = ind.unit ? ' ' + ind.unit : '';
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

    var num = parseFloat(String(raw).replace(/[^0-9.\-]/g, ''));
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
  if (reg.move_index && reg.move_index.enabled !== false && _mkt && _mkt.zscores && _mkt.zscores.move && _mkt.zscores.move.ok) {
    var _move = _mkt.zscores.move;
    var _moveSignal = _evalSignalRules(reg.move_index.signalRules, _move.current, _move.zscore, null);
    ctx.factors.move_index = {
      value: _move.current, zscore: _move.zscore, percentile: _move.percentile,
      signal: _moveSignal,
      label: 'MOVE Index: ' + _move.current + ' (Z=' + (_move.zscore>=0?'+':'') + _move.zscore + ', P' + _move.percentile + ')',
    };
    if (_moveSignal === 'caution') ctx.summary.caution_flags.push('move_index');
    if (_moveSignal === 'risk')    ctx.summary.risk_flags.push('move_index');
  }

  // SKEW/VVIX-Divergenz (Signal-String basiert)
  if (reg.skew_vvix_div && reg.skew_vvix_div.enabled !== false && _mkt && _mkt.zscores && _mkt.zscores.skew_vvix_divergence && _mkt.zscores.skew_vvix_divergence.ok) {
    var _div = _mkt.zscores.skew_vvix_divergence;
    var _divSignal = _evalSignalRules(reg.skew_vvix_div.signalRules, null, null, _div.signal);
    ctx.factors.skew_vvix_div = {
      value: _div.value, signalStr: _div.signal,
      signal: _divSignal,
      label: 'SKEW/VVIX-Divergenz: ' + _div.value + ' → ' + _div.signal,
    };
    if (_divSignal === 'caution') ctx.summary.caution_flags.push('skew_vvix_div');
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

  console.log('[MCM] market_context gebaut — ' + Object.keys(ctx.factors).length +
    ' Faktoren | risk_level: ' + ctx.summary.risk_level +
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

console.log('[ko-indicators-loader] v1.3.0 geladen — Indikator-Registry + Market Context Module (MCM) + erweiterte signalRules (zgte/signal_eq) + 5 neue FRED/Derived-Indikatoren');
