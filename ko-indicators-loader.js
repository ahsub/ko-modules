/**
 * ko-indicators-loader.js — UIQ Indikator-Registry Loader
 * ══════════════════════════════════════════════════════════════════
 * Lädt ko-indicators.json und stellt generische Funktionen bereit:
 *   - waitForAllIndicators()  → Polling-Gate (ersetzt hardcodierte IDs)
 *   - buildPromptSection()    → generischer Prompt-Aufbau
 *   - getIndicatorValue()     → einheitlicher DOM/Window/Aggregator-Read
 *
 * Version: 1.0.0 (09.07.2026)
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

// ── Hash-Konstante (wird von index.html gesetzt) ───────────────────
var KO_MODULES_HASH = (function() {
  var scripts = document.querySelectorAll('script[src*="ko-modules@"]');
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
    var val = el ? el.textContent.trim() : '';
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
        var val = el ? el.textContent.trim() : '';
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

console.log('[ko-indicators-loader] v1.0.0 geladen — Indikator-Registry bereit');
