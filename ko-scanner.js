/**
 * ko-scanner.js — UIQ Scanner-Helfer
 * ══════════════════════════════════════════════════════════════════
 * Handelsplatz-Dropdown (US/DE), Listen-Auswahl, Chip-Rendering
 *
 * Version: 1.1.0 (15.07.2026)
 * Extrahiert aus index.html v265
 * Repository: ahsub/ko-modules
 *
 * Abhängigkeiten: showKoToast (index.html), onPresetChange (index.html)
 *
 * WICHTIG: _marketDropdowns darf nur hier definiert sein.
 * In index.html ist die inline-Version durch dieses Modul ersetzt.
 */

// ── Handelsplatz-Listen ───────────────────────────────────────────
var _marketDropdowns = {
  us: [
    ["default",               "🇺🇸 50 US-Aktien (Standard)"],
    ["top50-us",              "📈 IBD Momentum Top-50"],
    ["fixed:SP500",           "🇺🇸 S&P 500 Kern-100"],
    ["fixed:NDX100",          "🇺🇸 NASDAQ 100"],
    ["fixed:DEFENSE",         "🛡️ Defense & Aerospace"],
    ["fixed:ROBOTICS",        "🤖 Robotics & AI"],
    ["fixed:CYBERSECURITY",   "🔐 Cybersecurity"],
    ["fixed:NUCLEAR_ENERGY",  "☢️ Nuclear Energy"],
    ["fixed:HEALTH",          "🏥 Healthcare"],
    ["fixed:FINANCE",         "🏦 Financials"],
    ["fixed:ENERGY",          "⚡ Energy & Oil"],
    ["fixed:AI_TECH",         "💡 AI & Tech"],
    ["fixed:PICKS_SHOVELS",   "⛏ AI-Infrastruktur"],
    ["fixed:PRECIOUS_METALS", "🥇 Precious Metals"],
    ["fixed:SPACE",           "🚀 Space"]
  ],
  de: [
    ["fixed:DAX40",  "📊 DAX 40"],
    ["fixed:MDAX",   "📈 MDAX Top 20"],
    ["fixed:TECDAX", "💻 TecDAX"],
    ["default",      "🇺🇸 US-Aktien (DE-handelbar)"]
  ]
};

// ── Sinnvolle Default-Empfehlung je Handelsplatz (Phase 0.5 Arbeitspaket G
//    Punkt 5, 15.07.2026): "Auto-Sinnvoll-Watchlists (DE → DAX/TecDAX/MDAX,
//    US → S&P500/NASDAQ100), bei fehlender Watchlist als Popup-Empfehlung +
//    Caching." Die Listen selbst existierten bereits — es fehlte die
//    Erst-Nutzer-Empfehlung + das Merken der letzten Wahl ueber Sessions
//    hinweg (vorher: bei jedem Dropdown-Oeffnen komplett neue manuelle Wahl).
var _RECOMMENDED_DEFAULT = { us: 'fixed:SP500', de: 'fixed:DAX40' };

function _lastWatchlistKey(market) { return 'ko_last_watchlist_' + market; }

// ── Dropdown-Toggle ───────────────────────────────────────────────
function toggleMarketDropdown(market, btn) {
  var existing = document.getElementById('mkt-dropdown');
  if (existing) {
    existing.remove();
    if (existing.dataset.market === market) return;
  }

  if (typeof setMarket === 'function') setMarket(market);

  // BUGFIX (15.07.2026, Arbeitspaket G Punkt 5): Erst-Nutzer-Empfehlung —
  // wenn fuer diesen Handelsplatz NOCH NIE eine Watchlist gewaehlt wurde,
  // automatisch die sinnvolle Standard-Liste anwenden + kurzer Hinweis-Toast,
  // statt den Nutzer vor eine leere/unklare Auswahl zu stellen.
  var cachedChoice = null;
  try { cachedChoice = localStorage.getItem(_lastWatchlistKey(market)); } catch(e) {}
  if (!cachedChoice && _RECOMMENDED_DEFAULT[market]) {
    var recLabel = (_marketDropdowns[market] || []).find(function(i){ return i[0] === _RECOMMENDED_DEFAULT[market]; });
    if (typeof showKoToast === 'function') {
      showKoToast('💡 Empfehlung für ' + (market === 'us' ? 'US' : 'DE') + ': ' + (recLabel ? recLabel[1] : _RECOMMENDED_DEFAULT[market]) + ' — im Dropdown änderbar');
    }
    selectMarketList(_RECOMMENDED_DEFAULT[market], market);
  }

  var dropdown = document.createElement('div');
  dropdown.id = 'mkt-dropdown';
  dropdown.dataset.market = market;
  dropdown.style.cssText =
    'position:fixed;z-index:4000;background:var(--bg2);border:0.5px solid var(--border2);' +
    'border-radius:10px;padding:6px;box-shadow:0 8px 32px rgba(0,0,0,.4);min-width:220px;' +
    'max-height:340px;overflow-y:auto';

  var r = btn.getBoundingClientRect();
  dropdown.style.top  = (r.bottom + 4) + 'px';
  dropdown.style.left = Math.max(8, r.left) + 'px';

  var header = document.createElement('div');
  header.style.cssText = 'font-size:10px;color:var(--text3);padding:4px 8px 6px;letter-spacing:.5px;font-weight:600';
  header.textContent = market === 'us' ? '🇺🇸 US-LISTEN' : '🇩🇪 DE-LISTEN';
  dropdown.appendChild(header);

  // Aktuell gewaehlte/gecachte Liste hervorheben (Spec: "Caching")
  var currentChoice = null;
  try { currentChoice = localStorage.getItem(_lastWatchlistKey(market)); } catch(e) {}

  (_marketDropdowns[market] || []).forEach(function(item) {
    var el = document.createElement('div');
    var isRecommended = item[0] === _RECOMMENDED_DEFAULT[market];
    var isCurrent = item[0] === currentChoice;
    el.style.cssText = 'padding:7px 10px;font-size:12px;cursor:pointer;color:var(--text2);border-radius:6px'
      + (isCurrent ? ';background:rgba(79,142,247,0.1);font-weight:600' : '');
    el.textContent = item[1] + (isRecommended ? ' ⭐' : '');
    if (isRecommended) el.title = 'Empfohlene Standard-Liste für diesen Handelsplatz';
    el.onmouseover = function() { el.style.background = 'var(--bg3)'; };
    el.onmouseout  = function() { el.style.background = isCurrent ? 'rgba(79,142,247,0.1)' : ''; };
    el.onclick     = function() { selectMarketList(item[0], market); dropdown.remove(); };
    dropdown.appendChild(el);
  });

  document.body.appendChild(dropdown);
  setTimeout(function() {
    document.addEventListener('click', function _close(e) {
      if (!dropdown.contains(e.target) && e.target !== btn) {
        dropdown.remove();
        document.removeEventListener('click', _close);
      }
    });
  }, 10);
}

// ── Listen-Auswahl ────────────────────────────────────────────────
function selectMarketList(val, market) {
  var sel = document.getElementById('ticker-preset');
  if (sel) {
    sel.value = val;
    if (typeof onPresetChange === 'function') onPresetChange();
    if (typeof updateWlButtons === 'function') updateWlButtons();
  }
  // Caching (Spec G Punkt 5): letzte Wahl je Handelsplatz merken
  try { localStorage.setItem(_lastWatchlistKey(market), val); } catch(e) {}
  _updateActiveChip(val, market);
}

// ── Chip-Rendering ────────────────────────────────────────────────
function _updateActiveChip(val, market) {
  var chipsEl = document.getElementById('active-list-chips');
  if (!chipsEl) return;
  var lists = _marketDropdowns[market] || [];
  var found = lists.find(function(i) { return i[0] === val; });
  var label = found ? found[1] : val;
  chipsEl.innerHTML =
    '<div style="display:flex;align-items:center;gap:4px;padding:3px 8px;font-size:11px;' +
    'background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;color:var(--text2)">' +
    label +
    ' <span onclick="_clearActiveChip()" style="cursor:pointer;color:var(--text3);margin-left:2px">×</span>' +
    '</div>';
}

function _clearActiveChip() {
  var chipsEl = document.getElementById('active-list-chips');
  if (chipsEl) chipsEl.innerHTML = '';
  var sel = document.getElementById('ticker-preset');
  if (sel) { sel.value = 'default'; if (typeof onPresetChange==='function') onPresetChange(); }
}

console.log('[ko-scanner.js] v1.1.0 geladen — Handelsplatz-Dropdown, Listen-Auswahl, Auto-Empfehlung + Caching (AP G)');
