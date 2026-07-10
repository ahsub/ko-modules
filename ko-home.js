/**
 * ko-home.js — UIQ Home/Übersicht Panel
 * ══════════════════════════════════════════════════════════════════
 * Landing-Page Rendering, Morning-Briefing-Start, Track-Record-Uhr
 * KI-Briefing In-Memory-Cache
 *
 * Version: 1.0.0 (09.07.2026)
 * Extrahiert aus index.html v265
 * Repository: ahsub/ko-modules
 *
 * Abhängigkeiten: runMorningBriefing (index.html)
 */

// ── KI-Briefing In-Memory-Cache ───────────────────────────────────
// Verhindert unnötige API-Calls bei Strategie-Wechsel / Tab-Wechsel
var _kiCache = {};
var _KI_CACHE_TTL = 15 * 60 * 1000; // 15 Minuten

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

// ── Morning-Briefing Start aus Home-Tab ──────────────────────────
async function runHomeBriefing(force) {
  var today    = new Date().toISOString().slice(0,10);
  var cacheKey = 'morning_briefing_' + today;
  var startBtn = document.getElementById('home-start-btn');
  var actEl    = document.getElementById('home-activity');
  var actTxt   = document.getElementById('home-activity-text');
  var txtEl    = document.getElementById('home-briefing-text');

  if (!force) {
    try {
      var cached = JSON.parse(localStorage.getItem(cacheKey));
      if (cached && cached.kiBriefing) {
        renderHomeLanding();
        // v293: Tearsheet-Modal öffnen statt nur die kleine Inline-Vorschau
        // zu aktualisieren — vorher zeigte "Letztes Briefing" scheinbar
        // "kein Resultat", weil nie das eigentliche Modal öffnete.
        if (typeof showMorningTearsheet === 'function') showMorningTearsheet(cached);
        return;
      }
    } catch(e) {}
  }

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
    if (typeof runMorningBriefing === 'function') await runMorningBriefing();
  } catch(e) {
    if (txtEl) txtEl.textContent = '⚠ Fehler: ' + e.message;
  } finally {
    clearInterval(_stTimer);
    if (actEl) actEl.style.display = 'none';
    if (startBtn) { startBtn.disabled = false; startBtn.style.opacity = '1'; }
    renderHomeLanding();
  }
}

console.log('[ko-home.js] v1.0.0 geladen — Home/Übersicht Panel');
