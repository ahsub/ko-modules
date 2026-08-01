/**
 * ko-trackrecord.js — UIQ Track-Record Modul (Phase C)
 * ══════════════════════════════════════════════════════════════════
 * Version: 1.0.0 (31.07.2026) | Spezifikation: docs/TRACK_RECORD_SPEC.md v1.2
 *
 * Liest tr:stats aus Cloudflare KV (via ko-sync Worker) und rendert
 * die Strategie×Regime-Matrix mit hit30/hitFresh/alpha/avg-Metriken.
 *
 * Sichtbarkeit: ausschließlich Expert/EIC-Modus (Spec §7/§9.3).
 * Mindest-n: 20 Recs pro Zelle (Spec §6.3); darunter "sammelt noch".
 *
 * Verwendung:
 *   import { TrackRecord } from './ko-trackrecord.js';
 *   // oder via CDN <script> → window.TrackRecord
 *
 *   await TrackRecord.load(koSyncBaseUrl);
 *   TrackRecord.renderMatrix(containerEl);
 */

const TR_VERSION = '1.0.0';
const TR_MIN_N   = 20;   // Spec §6.3: Mindest-Recs für Zellanzeige

// ── Strategie-Metadaten (Label + Kategorie) ────────────────────────────────
const TR_STRAT_META = {
  ko:            { label: '⚡ KO-Zertifikat',         cat: 'trend' },
  momentum:      { label: '📈 Momentum',              cat: 'trend' },
  vcp:           { label: '📐 VCP-Setup',             cat: 'trend' },
  breakout:      { label: '🚀 Breakout',              cat: 'trend' },
  swing:         { label: '🔄 Swing-Trading',         cat: 'trend' },
  meanrev:       { label: '↩️ Mean Reversion',        cat: 'mean'  },
  fading_short:  { label: '⚠️ Fading Short (KO)',     cat: 'short' },
  csp_wheel:     { label: '🎯 Options-Wheel (CSP)',   cat: 'opts'  },
  weekly_income: { label: '📅 Options Weekly',        cat: 'opts'  },
  atmna:         { label: '⚙️ Options ATM/NA',        cat: 'opts'  },
  cc:            { label: '📋 Covered Call',          cat: 'opts'  },
  dividend:      { label: '💰 Dividend Growth',       cat: 'value' },
  value:         { label: '📊 Value Investing',       cat: 'value' },
};

// ── Regime-Reihenfolge + Labels ────────────────────────────────────────────
const TR_REGIMES = [
  { key: 'BULL_QUIET',          label: 'Bull Quiet'        },
  { key: 'BULL_FRAGILE',        label: 'Bull Fragile'      },
  { key: 'POST_PANIC_REVERSION',label: 'Post-Panic'        },
  { key: 'STRESS_UNSTABLE',     label: 'Stress'            },
  { key: 'NEUTRAL',             label: 'Neutral'           },
];

// ── Kategorie-Reihenfolge für Gruppen-Header ──────────────────────────────
const TR_CAT_ORDER = ['trend', 'mean', 'short', 'opts', 'value'];
const TR_CAT_LABELS = {
  trend: 'Trend / Momentum',
  mean:  'Mean Reversion',
  short: 'Short / Fading',
  opts:  'Options',
  value: 'Value / Dividend',
};

// ── State ──────────────────────────────────────────────────────────────────
let _stats    = null;   // tr:stats JSON aus KV
let _loaded   = false;
let _loading  = false;
let _error    = null;

// ── KV-Fetch ───────────────────────────────────────────────────────────────
async function load(koSyncBase) {
  if (_loading) return;
  _loading = true;
  _error   = null;
  try {
    const base = (koSyncBase || 'https://ko-sync.ahildebrand.workers.dev').replace(/\/$/, '');
    const res  = await fetch(base + '/public/tr%3Astats', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _stats  = await res.json();
    _loaded = true;
  } catch (e) {
    _error  = e.message;
    _stats  = null;
    _loaded = false;
    console.warn('[TrackRecord] load fehlgeschlagen:', e.message);
  } finally {
    _loading = false;
  }
  return _loaded;
}

// ── Hilfsfunktionen ────────────────────────────────────────────────────────

/** Gibt Zellen-Objekt aus tr:stats.cells oder null zurück. */
function _cell(stratKey, regimeKey, horizon) {
  if (!_stats || !_stats.cells) return null;
  // Mögliche Key-Formate: "long_minervini|BULL_QUIET|h30" oder "momentum|BULL_QUIET|h30"
  // Der Aggregator schreibt den strat-Key so wie er in der Shortlist steht.
  const k = `${stratKey}|${regimeKey}|h${horizon}`;
  return _stats.cells[k] || null;
}

function _pct(v) {
  if (v == null) return '—';
  return (v * 100).toFixed(0) + '%';
}
function _num(v, dec) {
  if (v == null) return '—';
  return v.toFixed(dec ?? 1);
}
function _signCls(v) {
  if (v == null) return '';
  return v > 0 ? 'tr-pos' : v < 0 ? 'tr-neg' : '';
}

/** hit-Farbe: ≥60% grün, 45-59% amber, <45% rot, null grau */
function _hitCls(hit) {
  if (hit == null) return 'tr-na';
  if (hit >= 0.60) return 'tr-hit-good';
  if (hit >= 0.45) return 'tr-hit-mid';
  return 'tr-hit-bad';
}

// ── Render: Zusammenfassung-Banner ────────────────────────────────────────
function _renderBanner(container) {
  if (!_stats) return;
  const since   = _stats.since   || '—';
  const updated = _stats.updated ? _stats.updated.slice(0, 10) : '—';
  const total   = _stats.totalRecs || 0;
  const cells   = Object.keys(_stats.cells || {}).length;

  // Tag-Zählung
  const startMs = since !== '—' ? new Date(since).getTime() : null;
  const daysDiff = startMs ? Math.floor((Date.now() - startMs) / 86400000) : null;

  const banner = document.createElement('div');
  banner.className = 'tr-banner';
  banner.innerHTML = `
    <span class="tr-banner-tag">Track-Record</span>
    seit <strong>${since}</strong>
    ${daysDiff != null ? `(Tag <strong>${daysDiff}</strong>)` : ''}
    &nbsp;·&nbsp; ${total.toLocaleString()} Empfehlungen
    &nbsp;·&nbsp; ${cells} Zellen
    &nbsp;·&nbsp; Stand: ${updated}
    <span class="tr-disclaimer">Deskriptive Statistik historischer Signale · Keine Anlageberatung</span>
  `;
  container.appendChild(banner);
}

// ── Render: Strategie×Regime-Matrix ───────────────────────────────────────
function _renderMatrix(container) {
  const H = 30;   // primärer Horizont laut Spec §5

  const wrap = document.createElement('div');
  wrap.className = 'tr-matrix-wrap';

  // Tabelle
  const tbl = document.createElement('table');
  tbl.className = 'tr-matrix';

  // Header-Zeile
  const thead = tbl.createTHead();
  const hrow  = thead.insertRow();
  const th0   = document.createElement('th');
  th0.textContent = 'Strategie';
  hrow.appendChild(th0);

  TR_REGIMES.forEach(reg => {
    const th = document.createElement('th');
    th.className = 'tr-regime-hd';
    th.textContent = reg.label;
    hrow.appendChild(th);
  });

  // Legende-Zeile (Spalten-Erklärung)
  const legrow = thead.insertRow();
  const leg0   = document.createElement('th');
  leg0.className = 'tr-leg-cell';
  leg0.textContent = '';
  legrow.appendChild(leg0);
  TR_REGIMES.forEach(() => {
    const leg = document.createElement('th');
    leg.className = 'tr-leg-cell';
    leg.innerHTML = '<span>hit</span><span>Ø</span><span>α</span><span>n</span>';
    legrow.appendChild(leg);
  });

  // Body: nach Kategorie gruppiert
  const tbody = tbl.createTBody();
  const stratsBycat = {};
  TR_CAT_ORDER.forEach(cat => { stratsBycat[cat] = []; });
  Object.entries(TR_STRAT_META).forEach(([key, meta]) => {
    if (stratsBycat[meta.cat]) stratsBycat[meta.cat].push(key);
  });

  TR_CAT_ORDER.forEach(cat => {
    const strats = stratsBycat[cat];
    if (!strats.length) return;

    // Kategorie-Trennzeile
    const seprow = tbody.insertRow();
    const sepcell = document.createElement('td');
    sepcell.colSpan = 1 + TR_REGIMES.length;
    sepcell.className = 'tr-cat-sep';
    sepcell.textContent = TR_CAT_LABELS[cat];
    seprow.appendChild(sepcell);

    strats.forEach(stratKey => {
      const meta = TR_STRAT_META[stratKey];
      const row  = tbody.insertRow();
      row.className = 'tr-strat-row';

      // Strategie-Label
      const labelCell = row.insertCell();
      labelCell.className = 'tr-strat-label';
      labelCell.textContent = meta.label;

      // Regime-Zellen
      TR_REGIMES.forEach(reg => {
        const cell = row.insertCell();
        cell.className = 'tr-data-cell';

        const c = _cell(stratKey, reg.key, H);
        if (!c || c.n < TR_MIN_N) {
          cell.innerHTML = `<span class="tr-na">${c ? `${c.n}&thinsp;…` : '—'}</span>`;
          return;
        }

        const hit  = c.hitFresh != null ? c.hitFresh : c.hit;
        const avg  = c.avg;
        const alph = c.alpha;
        const n    = c.nFresh != null ? c.nFresh : c.n;

        cell.innerHTML = `
          <span class="${_hitCls(hit)}">${_pct(hit)}</span>
          <span class="${_signCls(avg)}">${_num(avg)}%</span>
          <span class="${_signCls(alph)}">${_num(alph)}%</span>
          <span class="tr-n">${n}</span>
        `;
        cell.title = `${stratKey} × ${reg.key} | h${H} | n=${c.n} nFresh=${c.nFresh ?? '—'} hit=${_pct(c.hit)} hitFresh=${_pct(c.hitFresh)} avg=${_num(c.avg)}% alpha=${_num(c.alpha)}%`;
      });
    });
  });

  wrap.appendChild(tbl);
  container.appendChild(wrap);
}

// ── Render: h7 / h90 Sekundär-Tabelle ────────────────────────────────────
function _renderHorizons(container) {
  const byStrat = (_stats || {}).byStrategy || {};
  if (!Object.keys(byStrat).length) return;

  const section = document.createElement('div');
  section.className = 'tr-horizons';

  const title = document.createElement('div');
  title.className = 'tr-section-title';
  title.textContent = 'Horizonte gesamt (alle Regime)';
  section.appendChild(title);

  const tbl   = document.createElement('table');
  tbl.className = 'tr-hz-table';
  const hrow  = tbl.createTHead().insertRow();
  ['Strategie', 'h7 hit', 'h30 hit', 'h90 hit', 'h30 Ø%', 'h30 α%', 'n'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    hrow.appendChild(th);
  });

  const tbody = tbl.createTBody();
  Object.entries(byStrat).sort((a, b) => {
    const ah = (a[1].h30 || {}).hit || 0;
    const bh = (b[1].h30 || {}).hit || 0;
    return bh - ah;
  }).forEach(([key, data]) => {
    const meta = TR_STRAT_META[key];
    if (!meta) return;
    const h7  = data.h7  || {};
    const h30 = data.h30 || {};
    const h90 = data.h90 || {};
    if ((h30.n || 0) < TR_MIN_N) return;

    const row = tbody.insertRow();
    [
      meta.label,
      _pct(h7.hitFresh  ?? h7.hit),
      _pct(h30.hitFresh ?? h30.hit),
      _pct(h90.hitFresh ?? h90.hit),
      _num(h30.avg) + '%',
      _num(h30.alpha) + '%',
      String(h30.n || '—'),
    ].forEach((val, i) => {
      const td = row.insertCell();
      td.textContent = val;
      if (i === 2) td.className = _hitCls(h30.hitFresh ?? h30.hit);
      if (i === 4) td.className = _signCls(h30.avg);
      if (i === 5) td.className = _signCls(h30.alpha);
    });
  });

  tbl.appendChild(tbody);
  section.appendChild(tbl);
  container.appendChild(section);
}

// ── Haupt-Render ──────────────────────────────────────────────────────────
function renderMatrix(containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  containerEl.className = 'tr-root';

  if (_error) {
    containerEl.innerHTML = `<div class="tr-error">Track-Record: Ladefehler — ${_error}</div>`;
    return;
  }
  if (!_loaded || !_stats) {
    containerEl.innerHTML = '<div class="tr-loading">Track-Record lädt…</div>';
    return;
  }

  _renderBanner(containerEl);
  _renderMatrix(containerEl);
  _renderHorizons(containerEl);

  // Hinweis: Primary metric = hitFresh (Spec §6.1); h30 (Spec §5)
  const hint = document.createElement('div');
  hint.className = 'tr-hint';
  hint.innerHTML = 'hit = richtungsgerechte Rendite nach 30 Handelstagen &gt; 0 | nur fresh-Signale (nicht aus Vortags-Duplikat) | α = Alpha vs. SPY | Mindest-n: 20';
  containerEl.appendChild(hint);
}

// ── CSS (injiziert einmalig) ──────────────────────────────────────────────
function _injectStyles() {
  if (document.getElementById('ko-trackrecord-css')) return;
  const s = document.createElement('style');
  s.id = 'ko-trackrecord-css';
  s.textContent = `
.tr-root { font-size: 13px; color: var(--text-primary); }
.tr-banner { padding: 8px 12px; background: var(--surface-1); border: 1px solid var(--border);
  border-radius: 8px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tr-banner-tag { background: var(--bg-accent); color: var(--text-accent); font-size: 11px;
  font-weight: 500; padding: 2px 7px; border-radius: 4px; }
.tr-disclaimer { margin-left: auto; font-size: 11px; color: var(--text-muted); font-style: italic; }
.tr-matrix-wrap { overflow-x: auto; margin-bottom: 20px; }
.tr-matrix { border-collapse: collapse; width: 100%; min-width: 680px; }
.tr-matrix th, .tr-matrix td { padding: 4px 8px; border: 1px solid var(--border); }
.tr-matrix th { background: var(--surface-1); font-weight: 500; font-size: 12px; text-align: center; }
.tr-regime-hd { white-space: nowrap; min-width: 90px; }
.tr-leg-cell { font-size: 10px; color: var(--text-muted); }
.tr-leg-cell span { display: inline-block; width: 22%; text-align: center; }
.tr-cat-sep { background: var(--surface-0); font-size: 11px; font-weight: 500;
  color: var(--text-secondary); padding: 5px 8px; border-top: 2px solid var(--border-strong); }
.tr-strat-label { font-size: 12px; white-space: nowrap; }
.tr-data-cell { text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; }
.tr-data-cell span { display: inline-block; width: 24%; text-align: center; }
.tr-na { color: var(--text-muted); }
.tr-n  { color: var(--text-muted); font-size: 11px; }
.tr-hit-good { color: var(--text-success); font-weight: 500; }
.tr-hit-mid  { color: var(--text-warning); }
.tr-hit-bad  { color: var(--text-danger); }
.tr-pos { color: var(--text-success); }
.tr-neg { color: var(--text-danger); }
.tr-horizons { margin-top: 8px; }
.tr-section-title { font-size: 12px; font-weight: 500; color: var(--text-secondary);
  margin-bottom: 6px; padding-top: 4px; border-top: 1px solid var(--border); }
.tr-hz-table { border-collapse: collapse; width: 100%; font-size: 12px; }
.tr-hz-table th, .tr-hz-table td { padding: 4px 8px; border: 1px solid var(--border); text-align: center; }
.tr-hz-table th { background: var(--surface-1); font-weight: 500; }
.tr-hz-table td:first-child { text-align: left; }
.tr-hint { font-size: 11px; color: var(--text-muted); margin-top: 10px; }
.tr-loading, .tr-error { padding: 16px; text-align: center; color: var(--text-muted); }
.tr-error { color: var(--text-danger); }
  `;
  document.head.appendChild(s);
}

// ── Public API ────────────────────────────────────────────────────────────
const TrackRecord = {
  VERSION:      TR_VERSION,
  load,
  renderMatrix,
  injectStyles: _injectStyles,
  get stats()   { return _stats;  },
  get loaded()  { return _loaded; },
  get error()   { return _error;  },
};

// Browser-Fallback: window.TrackRecord für klassische <script>-Einbindung.
// Kein ES-Module-Export (kein type="module" im CDN-Script-Tag).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TrackRecord };
} else if (typeof window !== 'undefined') {
  window.TrackRecord = TrackRecord;
}
