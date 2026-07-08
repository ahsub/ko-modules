/**
 * ko-home.js — UIQ Home/Übersicht Panel
 * ══════════════════════════════════════════════════════════════════
 * Landing-Page Rendering, Morning-Briefing-Start, Track-Record-Uhr
 * KI-Briefing In-Memory-Cache
 *
 * Extrahiert aus index.html v265 (09.07.2026)
 * Modular, ES6-kompatibel, UIQ v2 / Vite+React ready
 *
 * Abhängigkeiten: runMorningBriefing (index.html)
 * Repository: ahsub/ko-modules
 * Version: 1.0.0
 */

'use strict';

// ── KI-Briefing In-Memory-Cache ───────────────────────────────────
// ── KI-Briefing In-Memory-Cache (AP-B Cache-Disziplin) ──────────────────────
// Speichert KI-Antworten pro Strategie für die aktuelle Session.
// Verhindert unnötige API-Calls bei Strategie-Wechsel / Tab-Wechsel.
var _kiCache = {}; // { strat: { text, ts } }
var _KI_CACHE_TTL = 15 * 60 * 1000; // 15 Minuten

// Zeigt gecachtes Ergebnis (falls vorhanden) oder Prompt zur Analyse

// ── Track-Record-Uhr (seit 02.07.2026) ───────────────────────────
function _updateTrackRecord() {
    var trEl = document.getElementById('home-track-record');
    if (!trEl) return;
    var trStart = new Date('2026-07-02T00:00:00+02:00');
    var trDiff  = Date.now() - trStart;
    var trDays  = Math.floor(trDiff / 86400000);
    var trHours = Math.floor((trDiff % 86400000) / 3600000);
    var trMins  = Math.floor((trDiff % 3600000) / 60000);
    trEl.textContent = trDays + 'd ' + trHours + 'h ' + trMins + 'min';
  }
  _updateTrackRecord();
  if (!window._trInterval) {
    window._trInterval = setInterval(_updateTrackRecord, 60000);
  }
}

// ── Morning-Briefing Start aus Home-Tab ──────────────────────────
// ── runHomeBriefing: Makro + MB aus Übersicht-Tab heraus starten ─────────────
async function runHomeBriefing(force) {
  var today = new Date().toISOString().slice(0,10);
  var cacheKey = 'morning_briefing_' + today;
  var startBtn = document.getElementById('home-start-btn');
  var actEl    = document.getElementById('home-activity');
  var actTxt   = document.getElementById('home-activity-text');
  var txtEl    = document.getElementById('home-briefing-text');

  // Cache prüfen (nur wenn kein force)
  if (!force) {
    try {
      var cached = JSON.parse(localStorage.getItem(cacheKey));
      if (cached && cached.kiBriefing) { renderHomeLanding(); return; }
    } catch(e) {}
  }

  // Aktivitätsanzeige einschalten
  if (actEl) actEl.style.display = 'flex';
  if (startBtn) { startBtn.disabled = true; startBtn.style.opacity = '.5'; }
  if (txtEl) txtEl.innerHTML = '<span style="color:var(--text3)">Bitte Geduld, Bericht wird erstellt…</span>';

  var _steps = ['Makrodaten laden…','Marktregime berechnen…','Sektoren analysieren…',
                'Intermarket prüfen…','KI-Briefing generieren…','Bericht wird erstellt…'];
  var _si = 0;
  var _stTimer = setInterval(function() {
    _si = (_si+1) % _steps.length;
    if (actTxt) actTxt.textContent = _steps[_si];
  }, 2500);

  try {
    await runMorningBriefing();
  } catch(e) {
    if (txtEl) txtEl.textContent = '⚠ Fehler: ' + e.message;
  } finally {
    clearInterval(_stTimer);
    if (actEl) actEl.style.display = 'none';
    if (startBtn) { startBtn.disabled = false; startBtn.style.opacity = '1'; }
    renderHomeLanding();
  }
}

// ── Home Landing Rendering ────────────────────────────────────────
// ── HOME LANDING (AP-A) ──────────────────────────────────────────────────────
function renderHomeLanding() {
  // Makro-Strip aus localStorage
  try {
    var mkRaw = localStorage.getItem('ko_makro');
    var mk = mkRaw ? JSON.parse(mkRaw) : null;
    if (mk) {
      var _hm = function(id,val){var e=document.getElementById(id);if(e&&val)e.textContent=val;};
      _hm('hm-sp',mk.sp);_hm('hm-nq',mk.nq);_hm('hm-dax',mk.dax);
      _hm('hm-vix',mk.vix);_hm('hm-oil',mk.oil);_hm('hm-gold',mk.gold);
    }
  } catch(e) {}

  // Datum + Uhrzeit
  var dateEl = document.getElementById('home-date');
  if (dateEl) {
    var _now = new Date();
    var _day = _now.toLocaleDateString('de-DE', { weekday:'long' });
    var _date = _now.toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' });
    var _time = _now.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
    dateEl.innerHTML =
      '<span style="font-size:13px;font-weight:600;color:var(--text)">' + _day + '</span>'
      + '<span style="margin-left:6px;font-size:11px;color:var(--text3)">' + _date + ' · ' + _time + '</span>';
  }

  // Changelog-Snippet: Build-Version aus Meta-Tag
  var clEl = document.getElementById('home-changelog');
  if (clEl) {
    var verMeta = document.querySelector('meta[name="version"]');
    var ver = verMeta ? verMeta.getAttribute('content') : '';
    // Format: '20260708-v251' → 'v251 · 08.07.2026'
    if (ver) {
      var parts = ver.split('-');
      var vNum  = parts[1] || ver;
      var vDate = parts[0] ? parts[0].replace(/(\d{4})(\d{2})(\d{2})/, '$3.$2.$1') : '';
      clEl.textContent = vNum + (vDate ? ' · ' + vDate : '');
    }
  }

  // Letztes Morning Briefing aus localStorage laden
  var today = new Date().toLocaleDateString('de-DE',
    {day:'2-digit',month:'2-digit',year:'numeric'}).split('.').reverse().join('-');
  var cacheKey = 'morning_briefing_' + today;
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(cacheKey)); } catch(e) {}

  var txtEl  = document.getElementById('home-briefing-text');
  var timeEl = document.getElementById('home-briefing-time');

  if (cached && cached.kiBriefing) {
    if (txtEl) {
      // Vollständigen Text mit Basis-Markdown anzeigen
      var formatted = (cached.kiBriefing||'')
        .replace(/^## (.+)$/gm,'<div style="font-weight:700;margin-top:.6rem;color:var(--text)">$1</div>')
        .replace(/^### (.+)$/gm,'<div style="font-weight:600;margin-top:.4rem;color:var(--text2)">$1</div>')
        .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
        .replace(/\n/g,'<br>');
      txtEl.innerHTML = formatted;
      txtEl.style.color = 'var(--text2)';
      var rb=document.getElementById('home-refresh-btn');
      if(rb) rb.style.display='block';
    }
    if (timeEl) timeEl.textContent = 'Heute · ' + (cached.time || '—') + ' Uhr';
  } else {
    if (txtEl) {
      txtEl.textContent = 'Noch kein Briefing heute. Autostart läuft beim nächsten Programm-Start.';
      txtEl.style.color = 'var(--text3)';
    }
    if (timeEl) timeEl.textContent = '—';
  }

  // Strategie-Ampel befüllen
  var gatesHomeEl = document.getElementById('home-strategy-gates');
  if (gatesHomeEl) {
    var mseResult = window._lastMseResult || null;
    if (mseResult && mseResult.strategies) {
      var _ampelLabels = {
        momentum:     '📈 Momentum',
        swing:        '🔄 Swing',
        csp_wheel:    '⚙️ CSP/Wheel',
        meanrev:      '↩️ Mean Rev.',
        breakout:     '🚀 Breakout',
        atmna:        '⚡ atmna',
        fading_short: '🔝 KO-Short',
        dividend:     '💰 Dividend',
        weekly_income:'📅 Weekly Inc.',
      };
      var _ampelHtml = Object.entries(mseResult.strategies).map(function(e) {
        var key = e[0], strat = e[1];
        var label = _ampelLabels[key] || key;
        if (strat.active === true) {
          return '<div title="' + (strat.note||'') + '" style="font-size:11px;padding:3px 9px;border-radius:10px;'
            + 'background:rgba(34,197,94,0.12);border:0.5px solid var(--green);color:var(--green)">'
            + '✓ ' + label + '</div>';
        } else if (strat.conditional) {
          return '<div title="' + (strat.note||'') + '" style="font-size:11px;padding:3px 9px;border-radius:10px;'
            + 'background:rgba(245,158,11,0.1);border:0.5px solid var(--amber);color:var(--amber)">'
            + '~ ' + label + '</div>';
        } else {
          return '<div title="' + (strat.note||'') + '" style="font-size:11px;padding:3px 9px;border-radius:10px;'
            + 'background:rgba(239,68,68,0.08);border:0.5px solid var(--red);color:var(--red)">'
            + '✗ ' + label + '</div>';
        }
      }).join('');
      gatesHomeEl.innerHTML = _ampelHtml || '<span style="font-size:11px;color:var(--text3)">Keine Daten</span>';
    } else {
      gatesHomeEl.innerHTML = '<span style="font-size:11px;color:var(--text3)">Morning Briefing starten für Strategie-Ampel</span>';
    }
  }

  // Regime + VIX aus DOM lesen (bereits geladen)
  var regEl = document.getElementById('home-regime-val');
  var vixEl2 = document.getElementById('home-vix-val');
  var regime = window._lastRegime || null;
  var vixDom = document.getElementById('m-vix');
  if (regEl) {
    regEl.textContent = regime
      ? (regime === 'bull' ? '🟢 Bull' : regime === 'bear' ? '🔴 Bear' : '🟡 Neutral')
      : '—';
  }
  if (vixEl2 && vixDom) {
    vixEl2.textContent = vixDom.textContent || '—';
    var vixNum = parseFloat(vixDom.textContent);
    vixEl2.style.color = vixNum < 16 ? 'var(--green)' : vixNum < 25 ? 'var(--amber)' : 'var(--red)';
  }

  // Track-Record-Uhr (live, 60s Interval)
  function _updateTrackRecord() {
    var trEl = document.getElementById('home-track-record');
    if (!trEl) return;
    var trStart = new Date('2026-07-02T00:00:00+02:00');
    var trDiff  = Date.now() - trStart;
    var trDays  = Math.floor(trDiff / 86400000);
    var trHours = Math.floor((trDiff % 86400000) / 3600000);
    var trMins  = Math.floor((trDiff % 3600000) / 60000);
    trEl.textContent = trDays + 'd ' + trHours + 'h ' + trMins + 'min';
  }
  _updateTrackRecord();
  if (!window._trInterval) {
    window._trInterval = setInterval(_updateTrackRecord, 60000);
  }
}

// ── Exports (für UIQ v2 / ES6-Module) ────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderHomeLanding, runHomeBriefing, _updateTrackRecord };
}
