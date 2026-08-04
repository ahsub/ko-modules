/**
 * ko-kv-state.js — UIQ KV State Adapter
 * Single Source of Truth für kvToScannerState()
 * Ersetzt doppelte Definition in index.html (war 2× 257/261 Zeilen)
 *
 * Lädt VOR allen anderen ko-modules, damit window.kvToScannerState
 * global verfügbar ist wenn renderAlphaCards() und runScan() aufgerufen werden.
 *
 * August 2026 — Konsolidierungs-Sprint
 */

function kvToScannerState(r) {
  // Adapter: KV masterShortlist-Item → processData()-kompatibles State-Objekt
  // Ermöglicht renderCard() mit KV-Daten ohne Änderung am Render-Layer.
  var price   = r.price || 0;
  var ema50   = r.ema50 || null;
  var ema200  = r.ema200 || null;
  var above50 = ema50  ? price > ema50  : null;
  var above200= ema200 ? price > ema200 : null;
  var macdBull= r.macdHist != null ? r.macdHist > 0   : null;
  var obvBull = r.obvTrend != null ? r.obvTrend > 0   : null;
  var bullCnt = [above50, macdBull, obvBull].filter(function(v){return v===true;}).length;

  // Composite Score + Grade (aus KV, Python-berechnet)
  var cscore  = r.score || 0;
  var grade   = r.grade || (cscore>=80?'A+':cscore>=70?'A':cscore>=60?'B+':cscore>=50?'B':cscore>=40?'C':'D');
  var scoreColor = cscore>=70?'var(--green)':cscore>=50?'var(--accent)':cscore>=40?'var(--amber)':'var(--red)';

  // Markov-Adapter: regime-String + pBull2Bear → Scanner _markov-Objekt
  var regStr  = (r.regime||'').toUpperCase();
  var p2b     = r.pBull2Bear || 0;
  var markov  = (regStr || p2b) ? {
    regime:    regStr==='BULL' ? 1 : regStr==='BEAR' ? -1 : 0,
    warnLevel: p2b > 0.25 ? 3 : p2b > 0.15 ? 2 : p2b > 0.08 ? 1 : 0,
    pBull2Bear: p2b,
    label:     regStr || 'NEUTRAL',
  } : null;

  // OBV: KV-Wert ist normalisiert (Ratio × avg-vol). Sign bleibt korrekt.
  // obvSlope wird im renderCard als M-Zahl dargestellt — bei KV als Ratio anzeigen.
  var obvSlope = r.obvTrend != null ? r.obvTrend : null;

  // Volumen: KV=Dezimal (1.45), Scanner=Prozent (145)
  var volRatio = r.volRatio != null ? Math.round(r.volRatio * 100) : null;

  // Strategie-Scores (Python-berechnet → direkt übergeben, kein JS-Scoring)
  var stratScores = {
    long_minervini: { score: r.sMinervini || 0, label: 'Minervini SEPA' },
    long_swing:     { score: r.sSwing     || 0, label: 'Swing-Pullback' },
    long_mr:        { score: r.sMrLong    || 0, label: 'Mean Rev. Long' },
    short_breakdown:{ score: r.sBreakdown || 0, label: 'Short Breakdown' },
    short_fading:   { score: r.sFading    || 0, label: 'Short Fading'   },
    long_dividend:  { score: r.sDividend  || 0, label: 'Dividend Growth' },  // Backlog #13b (29.07.2026)
    long_value:     { score: r.sValue     || 0, label: 'Value Investing'  },  // Backlog #13b (29.07.2026)
  };

  // SEPA-Proxy aus Minervini-Score (renderCard erwartet 0-8)
  var sepaProxy = Math.round((r.sMinervini || 0) / 100 * 8);

  return {
    // Kerndaten
    sym:          r.sym,
    price:        price,
    // EMA (Scanner nutzt ma50/ma200)
    ma50:         ema50,
    ma200:        ema200,
    // Signal-Felder
    above50:      above50,
    macdBull:     macdBull,
    obvBull:      obvBull,
    bullCount:    bullCnt,
    // MACD
    macd_hist:    r.macdHist,
    histVal:      r.macdHist,
    // OBV
    obv_slope_5d: obvSlope,
    obvSlope:     obvSlope,
    // Volumen
    volume_ratio: volRatio,
    volRatio:     volRatio,
    // Bollinger + HVP
    bbPos:        r.bbPos,
    hvp:          r.hvp,
    hv10:         r.hv10,
    // 52W Range
    high52w:      r.high52,
    low52w:       r.low52,
    dist52wHigh:  r.pctFromHigh52,
    dist52h:      r.pctFromHigh52,
    // Score
    compositeScore: cscore,
    scoreLabel:   grade,
    scoreColor:   scoreColor,
    // Weitere Metriken
    rsi:          r.rsi,
    atr:          r.atr,
    overheat:     r.overheat != null ? { score: r.overheat, signals: [], icon: r.overheat>70?'🔥':r.overheat>40?'⚠️':'✅' } : null,
    _markov:      markov,
    // Strategie-Scores (Python-berechnet, kein JS-Scoring nötig)
    strategyScores: stratScores,
    // SEPA-Proxy
    sepaScore:    sepaProxy,
    stickyness:   50,
    // IOS Foundation v1.2 (Einzeltitel)
    iosScore:     r.iosScore,
    iosRating:    r.iosRating,
    iosDecision:  r.iosDecision,
    iosQuality:   r.iosQuality,
    iosEntry:     r.iosEntry,
    iosIsLeader:  r.iosIsLeader,
    iosSummary:   r.iosSummary,
    // Fibonacci-Screening-Modul v1.0
    _fibo:        (r.f_setup ? {
      setup: r.f_setup, score: r.f_score, nextName: r.f_next_name,
      nextP: r.f_next_p, distAtr: r.f_dist_atr, strike: r.f_strike, lvls: r.f_lvls
    } : null),
    // KV-Metadaten
    _fromKv:      true,
    _kvUpdated:   r.updated || null,
    // Leer: Sparkline-Daten nicht in KV (Charts zeigen Placeholder)
    closes:       [],
    hist:         [],
    obvNorm:      [],
    dates:        [],
    // renderCard braucht diese Felder — sichere Defaults für KV-Modus
    backtest:     null,
    buyPointScore:   0,
    buyPointSignals: [],
    // sepaScore via sepaProxy gesetzt — kein Überschreiben
    sepa1: false, sepa2: false, sepa3: false, sepa4: false,
    sepa5: false, sepa6: false, sepa7: false, sepa8: false,
    sepaPts: 0, techPts: 0, bpPts: 0, stkPts: 0, volPts: 0,
    emaStackScore: 0, mtfScore: 0, pdhlScore: 0,
    consecutive:  0,
    stickyness:   50,
    trendDir:     'neutral',
    dist10wMA:    null,
    sessionNote:  null,
    rs:           null,
    // RS-Rating (Aggregator v5.0, SUITE.md #14) — Universum-Perzentil 0-99
    rsRating:     r.rsRating != null ? r.rsRating : null,
    perf3m:       r.perf3m  != null ? r.perf3m  : null,
    perf12m:      r.perf12m != null ? r.perf12m : null,
    // Pattern/Entry-Engine (ios_pattern_entry_engine.py, Backlog #13c/f, 25.07.2026)
    patternEntry: r.patternEntry || null,
    // IV-Archiv-Felder (Aggregator v5.1, SUITE.md #15)
    // ivRank/ivPercentile: erst nach >=30 Archiv-Tagen befüllt (ab ~12.08.2026)
    ivAtm:          r.ivAtm         != null ? r.ivAtm         : null,
    ivRank:         r.ivRank        != null ? r.ivRank        : null,
    ivPercentile:   r.ivPercentile  != null ? r.ivPercentile  : null,
    ivArchiveDays:  r.ivArchiveDays != null ? r.ivArchiveDays : null,
    // _ivp-Objekt: echte Aggregator-Werte wenn vorhanden, sonst HVP-Fallback (calcHV20 bleibt aktiv)
    _ivp: (r.ivAtm != null) ? {
      ivp:    r.ivRank,        // ivRank als ivp (0-100, wie HVP)
      atmIV:  Math.round(r.ivAtm),
      dte:    r.ivDte || null,
      expiry: r.ivExpiry || null,
      isHV:   false,           // echte Options-IV, kein HV-Proxy
      ivPct:  r.ivPercentile,
      archiveDays: r.ivArchiveDays,
    } : null,   // null → Frontend fällt auf calcHV20-Proxy zurück (bestehende Logik)
    scoreColor:   scoreColor,
    _currency:    'USD',
    _er:          null,
    _fromTdCache: false,
    currency:     'USD',
    // ── Erweitertes KV-Mapping (26.07.2026) ─────────────────────────────────
    // Felder waren bereits in master_market_data.tickers vorhanden,
    // wurden aber bisher nicht aus dem KV-Objekt in den State gemappt.
    // VCP-Metriken (Leaderboard-Anzeige + DeepDive)
    vcpDetected:      r.vcpDetected      || false,
    vcpContractions:  r.vcpContractions  || 0,
    vcpLastPct:       r.vcpLastPct       != null ? r.vcpLastPct       : null,
    vcpAvgPrevPct:    r.vcpAvgPrevPct    != null ? r.vcpAvgPrevPct    : null,
    vcpVolContraction:r.vcpVolContraction != null ? r.vcpVolContraction: null,
    vcpBreakoutVol:   r.vcpBreakoutVol   != null ? r.vcpBreakoutVol   : null,
    tightnessPct:     r.tightnessPct     != null ? r.tightnessPct     : null,
    // EMA / SMA
    sma150:           r.sma150           != null ? r.sma150           : null,
    ema200SlopeUp:    r.ema200SlopeUp    != null ? r.ema200SlopeUp    : null,
    // MACD komplett (Linie + Signal — macdHist bereits oben gemappt)
    macdLine:         r.macdLine         != null ? r.macdLine         : null,
    macdSignal:       r.macdSignal       != null ? r.macdSignal       : null,
    // KSI (Kinetic Slippage Index)
    ksi:              r.ksi              != null ? r.ksi              : null,
    ksiSignal:        r.ksiSignal        != null ? r.ksiSignal        : null,
    ksiSpike:         r.ksiSpike         != null ? r.ksiSpike         : null,
    ksiRatio:         r.ksiRatio         != null ? r.ksiRatio         : null,
    // ICS (Inter-Scale Consensus)
    icsDirection:     r.icsDirection     != null ? r.icsDirection     : null,
    icsAngle:         r.icsAngle         != null ? r.icsAngle         : null,
    icsConsensus:     r.icsConsensus     != null ? r.icsConsensus     : null,
    icsConsBull:      r.icsConsBull      != null ? r.icsConsBull      : null,
    icsConsBear:      r.icsConsBear      != null ? r.icsConsBear      : null,
    icsChUpper:       r.icsChUpper       != null ? r.icsChUpper       : null,
    icsChLower:       r.icsChLower       != null ? r.icsChLower       : null,
    icsBoState:       r.icsBoState       != null ? r.icsBoState       : null,
    icsChannelPos:    r.icsChannelPos    != null ? r.icsChannelPos    : null,
    // Distanz-Metriken
    dist50:           r.dist50           != null ? r.dist50           : null,
    dist200:          r.dist200          != null ? r.dist200          : null,
    nearestSellStopPct: r.nearestSellStopPct != null ? r.nearestSellStopPct : null,
    nearestBuyStopPct:  r.nearestBuyStopPct  != null ? r.nearestBuyStopPct  : null,
    // Performance
    perf6m:           r.perf6m          != null ? r.perf6m           : null,
    perfRsRaw:        r.perfRsRaw       != null ? r.perfRsRaw        : null,
    // Volumen / Markt-Breite
    avgVol20:         r.avgVol20        != null ? r.avgVol20         : null,
    bullPct:          r.bullPct         != null ? r.bullPct          : null,
    warnLevel:        r.warnLevel       != null ? r.warnLevel        : null,
    squeezeRisk:      r.squeezeRisk     != null ? r.squeezeRisk      : null,
    // RS-Rank Score (IOS Konzept-Integration, August 2026)
    rsScore:          r.rsScore      != null ? r.rsScore      : null,   // 0-100 kombiniert SPY+IWM
    rsScoreSpy:       r.rsScoreSpy   != null ? r.rsScoreSpy   : null,
    rsScoreIwm:       r.rsScoreIwm   != null ? r.rsScoreIwm   : null,
    rsNewHigh:        r.rsNewHigh    != null ? r.rsNewHigh    : null,   // bool: RS-Line 63T-Hoch
    rsGrade:          r.rsGrade      != null ? r.rsGrade      : null,   // A+/A/B.../F
    // RS-Rank Score (IOS Konzept-Integration, August 2026)
    rsScore:          r.rsScore      != null ? r.rsScore      : null,
    rsScoreSpy:       r.rsScoreSpy   != null ? r.rsScoreSpy   : null,
    rsScoreIwm:       r.rsScoreIwm   != null ? r.rsScoreIwm   : null,
    rsNewHigh:        r.rsNewHigh    != null ? r.rsNewHigh    : null,
    rsGrade:          r.rsGrade      != null ? r.rsGrade      : null,
    // Anchored VWAP (Zeiierman-Konzept, August 2026)
    avwap:            r.avwap           != null ? r.avwap           : null,
    avwapAnchorDate:  r.avwapAnchorDate != null ? r.avwapAnchorDate : null,
    avwapAnchorPrice: r.avwapAnchorPrice!= null ? r.avwapAnchorPrice: null,
    distToAvwapPct:   r.distToAvwapPct  != null ? r.distToAvwapPct  : null,
    avwapAbove:       r.avwapAbove      != null ? r.avwapAbove      : null,
    avwapSlope:       r.avwapSlope      != null ? r.avwapSlope      : null,
    // Order Blocks (Hybrid Detector, August 2026)
    obBullHigh:       r.obBullHigh    != null ? r.obBullHigh    : null,
    obBullLow:        r.obBullLow     != null ? r.obBullLow     : null,
    obBullDate:       r.obBullDate    != null ? r.obBullDate    : null,
    obBullScore:      r.obBullScore   != null ? r.obBullScore   : null,
    obBullDistPct:    r.obBullDistPct != null ? r.obBullDistPct : null,
    obBullMitPct:     r.obBullMitPct  != null ? r.obBullMitPct  : null,
    obBullVolPct:     r.obBullVolPct  != null ? r.obBullVolPct  : null,
    obBearHigh:       r.obBearHigh    != null ? r.obBearHigh    : null,
    obBearLow:        r.obBearLow     != null ? r.obBearLow     : null,
    obBearDistPct:    r.obBearDistPct != null ? r.obBearDistPct : null,
    obBearMitPct:     r.obBearMitPct  != null ? r.obBearMitPct  : null,
    obBearVolPct:     r.obBearVolPct  != null ? r.obBearVolPct  : null,
    obBullCount:      r.obBullCount   != null ? r.obBullCount   : null,
    obBearCount:      r.obBearCount   != null ? r.obBearCount   : null,
    // TVA Indicators (August 2026)
    adx:              r.adx           != null ? r.adx           : null,
    diPlus:           r.diPlus        != null ? r.diPlus        : null,
    diMinus:          r.diMinus       != null ? r.diMinus       : null,
    efficiencyRatio:  r.efficiencyRatio!=null ? r.efficiencyRatio:null,
    tvaRegime:        r.tvaRegime     != null ? r.tvaRegime     : null,
    tvaRegimeConf:    r.tvaRegimeConf != null ? r.tvaRegimeConf : null,
    chopIndex:        r.chopIndex     != null ? r.chopIndex     : null,
    chopLabel:        r.chopLabel     != null ? r.chopLabel     : null,
    // TVA Sprint A (August 2026)
    trendScore:       r.trendScore    != null ? r.trendScore    : null,
    confluenceScore:  r.confluenceScore != null ? r.confluenceScore : null,
    // Earnings Calendar (August 2026)
    earningsDate:     r.earningsDate  != null ? r.earningsDate  : null,
    earningsDTE:      r.earningsDTE   != null ? r.earningsDTE   : null,
    earningsEPS:      r.earningsEPS   != null ? r.earningsEPS   : null,
    earningsRevEst:   r.earningsRevEst!= null ? r.earningsRevEst: null,
    // Sektor-Tags
    sectors:          Array.isArray(r.sectors) ? r.sectors : [],
    // ────────────────────────────────────────────────────────────────────────
    closes_full:  [],
  };
}

// Global verfügbar machen für alle Script-Blöcke
window.kvToScannerState = kvToScannerState;
window._kvToScannerStateFn = kvToScannerState;

console.log('[ko-kv-state] v1.0 geladen — kvToScannerState global verfügbar');
