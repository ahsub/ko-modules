/**
 * ko-scanner.js — UIQ Scanner-Helfer
 * ══════════════════════════════════════════════════════════════════
 * Handelsplatz-Dropdown, Listen-Auswahl, Chip-Rendering
 *
 * Extrahiert aus index.html v265 (09.07.2026)
 * Modular, ES6-kompatibel, UIQ v2 / Vite+React ready
 *
 * Abhängigkeiten: showKoToast (ko-ui), onPresetChange (Scanner)
 * Repository: ahsub/ko-modules
 */

'use strict';

// ── Handelsplatz-Listen ───────────────────────────────────────────
// ── Handelsplatz-Dropdown (AP Scanner-Header v253) ────────────────────────────
const _marketDropdowns = {
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

// ── Dropdown-Toggle ───────────────────────────────────────────────
function toggleMarketDropdown(market, btn) {
  // Bestehende Dropdowns schließen
  var existing = document.getElementById('mkt-dropdown');
  if (existing) {
    existing.remove();
    // Wenn gleicher Button: nur schließen
    if (existing.dataset.market === market) return;
  }

  setMarket(market);

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

  (_marketDropdowns[market] || []).forEach(function(item) {
    var el = document.createElement('div');
    el.style.cssText = 'padding:7px 10px;font-size:12px;cursor:pointer;color:var(--text2);border-radius:6px';
    el.textContent = item[1];
    el.onmouseover = function() { el.style.background = 'var(--bg3)'; };
    el.onmouseout  = function() { el.style.background = ''; };
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
function selectMarketList(val, market, el) {
  // Preset-Select synchronisieren
  var sel = document.getElementById('ticker-preset');
  if (sel) {
    sel.value = val;
    if (typeof onPresetChange === 'function') onPresetChange();
    if (typeof updateWlButtons === 'function') updateWlButtons();
  }
  // Chip anzeigen
  _updateActiveChip(val, market);
}

// ── Chip-Rendering ────────────────────────────────────────────────
function _updateActiveChip(val, market) {
  var chipsEl = document.getElementById('active-list-chips');
  if (!chipsEl) return;
  // Label aus _marketDropdowns holen
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

// ── Exports (für UIQ v2 / ES6-Module) ────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { toggleMarketDropdown, selectMarketList, _updateActiveChip, _clearActiveChip };
}
