/**
 * ko-config.js — Zentrale Konfiguration
 * Alle Feature-Flags, API-Keys, Gewichte
 * Version: 1.1 | ko-scanner v=126+
 * Repository: ahsub/ko-modules
 */

var KoConfig = {

  version: 'v126',

  // ── API ENDPOINTS ──────────────────────────────────────────────
  api: {
    corsProxy:   'https://my-cors-proxy.ahildebrand.workers.dev',
    koSync:      'https://ko-sync.ahildebrand.workers.dev',
    koAlert:     'https://ko-alert.ahildebrand.workers.dev',
    ahMedia:     'https://ah-media.ahildebrand.workers.dev',
  },

  // ── FEATURE FLAGS ───────────────────────────────────────────────
  // enabled: Modul aktiv
  // weight:  Gewicht im Composite Score (0=deaktiviert, 1=normal, 2=verstärkt)
  features: {
    markov:      { enabled: true,  weight: 1.0, label: 'Markov 2.0' },
    overheat:    { enabled: true,  weight: 1.0, label: 'Überhitzung' },
    ivEnrich:    { enabled: true,  weight: 1.0, label: 'IV-Enrichment' },
    skew:        { enabled: true,  weight: 1.0, label: 'Skew-Proxy' },
    cpr:         { enabled: true,  weight: 1.0, label: 'Call/Put-Ratio' },
    intermarket: { enabled: true,  weight: 1.0, label: 'Intermarket' },
    breadth:     { enabled: true,  weight: 1.0, label: 'NDX Breadth' },
    sectorScan:  { enabled: true,  weight: 1.0, label: 'Sektor-Überhitzung' },
    backtest:    { enabled: true,  weight: 0.0, label: 'Backtest' },
    kiAlerts:    { enabled: true,  weight: 1.0, label: 'KI-Alerts' },
    kiMakro:     { enabled: true,  weight: 1.0, label: 'Auto-Makro' },
    earnings:    { enabled: true,  weight: 1.0, label: 'Earnings' },
  },

  // ── STRATEGIE-PRESETS ───────────────────────────────────────────
  // Für verschiedene Investmentstrategien — schaltet Features en bloc
  presets: {
    momentum: {
      label: 'Momentum / SEPA',
      features: { markov:true, overheat:true, ivEnrich:true,
                  intermarket:true, breadth:true },
    },
    options: {
      label: 'Options / Wheel',
      features: { markov:true, ivEnrich:true, skew:true, cpr:true,
                  overheat:true, intermarket:false },
    },
    deepValue: {
      label: 'Deep Value (kommt)',
      features: { markov:false, ivEnrich:false, skew:false, cpr:false,
                  intermarket:false, breadth:false, overheat:true },
    },
    conservative: {
      label: 'Konservativ / Minimal',
      features: { markov:true, overheat:true, ivEnrich:false,
                  intermarket:false, breadth:false, kiAlerts:false },
    },
  },

  // ── AUTO-TOP ────────────────────────────────────────────────────
  autoTop: {
    n:        40,
    minScore: 50,
    minBull:  2,
  },

  // ── SCAN DEFAULTS ───────────────────────────────────────────────
  scan: {
    defaultTF:     '1d',
    defaultMarket: 'us',
    maxConcurrent: 3,
    retryAttempts: 2,
    cacheMinutes:  60,
    daysMap: { '15m':5, '30m':8, '1h':14, '4h':30, '1d':260 },
  },

  // ── MARKOV ──────────────────────────────────────────────────────
  markov: {
    lookback:         60,
    strideMin:        5,
    strideMax:        15,
    kTrendbruch:      2.5,   // Gewicht P(Bull→Bear) in σ_bereinigt
    bullBearThresholds: { warn: 0.15, danger: 0.25, elevated: 0.08 },
  },

  // ── ÜBERHITZUNG ─────────────────────────────────────────────────
  overheat: {
    ema200ATR:   { leicht: 2.0, mittel: 3.0, hoch: 4.0, extrem: 5.0 },
    rsi:         { elevated: 65, overbought: 75 },
    distDays:    { warn: 3, danger: 5 },
    bbPosition:  { warn: 0.85, danger: 0.95 },
  },

  // ── ALERT ROUTING ───────────────────────────────────────────────
  alert: {
    breadthScharf:    50,
    breadthStumm:     70,
    pBull2BearWarn:   0.15,
    pBull2BearDanger: 0.25,
    vixZoneSofort:    4,
    minLevel:         'MITTEL',
    digestHourUTC:    21,
  },

  // ── METHODEN ────────────────────────────────────────────────────
  isEnabled(feature) {
    return this.features[feature]?.enabled === true;
  },

  getWeight(feature) {
    return this.features[feature]?.enabled
      ? (this.features[feature]?.weight ?? 1.0)
      : 0.0;
  },

  applyPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) return false;
    Object.keys(preset.features).forEach(f => {
      if (this.features[f]) this.features[f].enabled = preset.features[f];
    });
    console.log(`[KoConfig] Preset: ${preset.label}`);
    return true;
  },

  // Aus localStorage laden (persistente Overrides)
  loadOverrides() {
    try {
      const overrides = JSON.parse(localStorage.getItem('ko_feature_flags') || '{}');
      Object.keys(overrides).forEach(f => {
        if (this.features[f]) Object.assign(this.features[f], overrides[f]);
      });
    } catch(e) {}
  },

  saveOverrides() {
    localStorage.setItem('ko_feature_flags', JSON.stringify(this.features));
  },
};

// Overrides beim Start laden
KoConfig.loadOverrides();

console.log('[ko-config.js] geladen — Version', KoConfig.version);
