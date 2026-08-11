/**
 * ko-ibkr-live.js
 * ============================================================================
 * Live-Client für IBKR Client Portal Web API — Optionsketten, Greeks,
 * Marktdaten-Snapshots. Für UIQ Options-Scorer (primär) und Refundex-
 * Journal-Anreicherung (sekundär, Konsument über CDN-Import).
 *
 * Erstellt: 10.08.2026, ROADMAP-Punkt "IBKR-Live-API-Anbindung"
 * (s. UIQ-Suite/docs/OPTIONSMODUL-ARCHITEKTUR.md §7 Punkt 2).
 *
 * ── Voraussetzung (noch NICHT eingerichtet, Stand 10.08.2026) ─────────────
 * Dieses Modul spricht NICHT direkt mit IBKR — es braucht einen dauerhaft
 * laufenden, authentifizierten Gateway davor:
 *   1. IBKR Client Portal Web API Gateway (offizielle Java-Komponente)
 *   2. Voyz/ibeam (Apache-2.0) davor — übernimmt Login inkl. automatisierter
 *      2FA (PyOTP/TOTP), hält die Session am Laufen
 *   3. Beides läuft auf einem dauerhaft laufenden VPS (Axels eigener Rechner
 *      ist nicht 24/7 an) — Deployment-Anleitung: s. ko-ibkr-live-SETUP.md
 *      im selben Verzeichnis.
 *
 * baseUrl-Parameter in allen Funktionen = die VPS-Adresse des IBeam-Gateways,
 * z.B. 'https://dein-vps.example.com:5000' — noch kein Default gesetzt,
 * da der VPS noch nicht existiert.
 *
 * ── Quellen-Verifikation (10.08.2026) ──────────────────────────────────────
 * Alle Endpunkt-Pfade UND Feld-IDs sind NICHT aus dem Trainingswissen
 * geraten, sondern direkt aus dem Referenz-Client `Voyz/ibind` (Apache-2.0,
 * 443 Stars, aktiv gepflegt) entnommen — konkret:
 *   - Pfade: ibind/client/ibkr_client_mixins/contract_mixin.py,
 *            ibind/client/ibkr_client_mixins/marketdata_mixin.py
 *   - Feld-IDs: ibind/client/ibkr_definitions.py
 * TROTZDEM: vor Produktiveinsatz gegen die eigene, echte IBKR-Verbindung
 * verifizieren (s. `verifySetup()` unten) — dieses Modul selbst wurde
 * NICHT gegen eine echte IBKR-Session getestet (kein Gateway vorhanden,
 * s. o.), nur gegen die Referenzimplementierung abgeglichen.
 *
 * ── Bekannter API-Stolperstein (per ibind-Docstring verifiziert) ──────────
 * "A pre-flight request must be made prior to ever receiving data" —
 * `/iserver/accounts` muss VOR `/iserver/marketdata/snapshot` aufgerufen
 * werden, bei Derivaten zusätzlich `/iserver/secdef/search`. Der ERSTE
 * Snapshot-Aufruf für einen neuen Kontrakt liefert oft unvollständige
 * Daten (Subscription-Aufbau) — zweiter Aufruf nach kurzer Pause nötig.
 * Dieses Modul kapselt das in `getMarketDataSnapshot()` (Auto-Retry).
 * ============================================================================
 */

// IBKR-Feld-IDs für Marktdaten-Snapshots (numerisch, von IBKR fest vorgegeben,
// NICHT selbst erfunden — Quelle: ibind/client/ibkr_definitions.py)
export const FIELDS = {
  last:      '31',
  bidPrice:  '84',
  askPrice:  '86',
  volume:    '87',
  open:      '7295',
  high:      '70',
  delta:     '7308',
  gamma:     '7309',
  theta:     '7310',
  vega:      '7311',
  ivPercent: '7633',   // Implied Vol. % je Strike (nicht zu verwechseln mit 7283, Underlying-IV)
};

const GREEK_FIELD_IDS = [FIELDS.delta, FIELDS.gamma, FIELDS.theta, FIELDS.vega, FIELDS.ivPercent];

/**
 * Interner GET-Helfer gegen das IBeam-Gateway.
 * @param {string} baseUrl - z.B. 'https://dein-vps.example.com:5000'
 * @param {string} path - z.B. 'iserver/secdef/search' (ohne führenden Slash, ohne /v1/api/)
 * @param {Object} params - Query-Parameter
 */
async function ibkrGet(baseUrl, path, params = {}) {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/v1/api/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const resp = await fetch(url.toString());
  if (!resp.ok) {
    throw new Error(`[ko-ibkr-live] ${path} -> HTTP ${resp.status}: ${await resp.text().catch(() => '')}`);
  }
  return resp.json();
}

/**
 * Prüft, ob die IBeam-Session aktuell authentifiziert ist. IMMER zuerst
 * aufrufen, bevor andere Funktionen genutzt werden — analog zu IBeams
 * eigener Empfehlung ("Ensure the Gateway has an active session").
 * @returns {Promise<{authenticated: boolean, connected: boolean, competing: boolean}>}
 */
export async function checkAuthStatus(baseUrl) {
  return ibkrGet(baseUrl, 'iserver/auth/status');
}

/**
 * Pflicht-Aufruf VOR jedem Marktdaten-Zugriff (s. Modul-Kopfkommentar,
 * "pre-flight request"). Ohne diesen Aufruf liefert marketdata/snapshot
 * laut ibind-Dokumentation keine Daten.
 */
export async function primeAccounts(baseUrl) {
  return ibkrGet(baseUrl, 'iserver/accounts');
}

/**
 * Sucht einen Kontrakt (Aktie/Index) über sein Symbol, liefert u.a. die
 * conid (IBKR-interne Kontrakt-ID) und verfügbare Sections (STK/OPT/...).
 * Pflicht-Vorstufe für Optionsketten (s. Modul-Kopfkommentar).
 * @param {string} symbol - z.B. 'AAPL', 'SPX'
 */
export async function searchContract(baseUrl, symbol) {
  const results = await ibkrGet(baseUrl, 'iserver/secdef/search', { symbol });
  return results;
}

/**
 * Extrahiert die OPT-Section (verfügbare Options-Monate/Exchanges) aus
 * einem searchContract()-Ergebnis. Wirft, falls der Kontrakt keine
 * Optionen hat — bewusst kein stilles null (No-Hallucination-Prinzip).
 */
export function extractOptionSection(contractSearchResult) {
  const first = Array.isArray(contractSearchResult) ? contractSearchResult[0] : contractSearchResult;
  const section = first?.sections?.find(s => s.secType === 'OPT');
  if (!section) {
    throw new Error(`[ko-ibkr-live] Kein OPT-Abschnitt für conid ${first?.conid} gefunden — hat dieser Titel handelbare Optionen?`);
  }
  return {
    conid: first.conid,
    months: section.months.split(';'),
    exchanges: section.exchange.split(';'),
  };
}

/**
 * Liefert verfügbare Call-/Put-Strikes für einen Monat.
 * @param {string} conid
 * @param {string} month - Format wie von extractOptionSection() geliefert, z.B. 'AUG26'
 */
export async function getStrikes(baseUrl, conid, month) {
  return ibkrGet(baseUrl, 'iserver/secdef/strikes', { conid, secType: 'OPT', month });
}

/**
 * Liefert die konkrete Options-Kontrakt-Info (inkl. Options-conid) für
 * Monat+Strike+Recht (Call/Put). Diese conid wird für Marktdaten/Greeks
 * gebraucht (s. getMarketDataSnapshot).
 * @param {string} right - 'C' oder 'P'
 */
export async function getOptionContractInfo(baseUrl, conid, month, strike, right) {
  return ibkrGet(baseUrl, 'iserver/secdef/info', { conid, secType: 'OPT', month, strike, right });
}

/**
 * Marktdaten-Snapshot inkl. automatischem Retry für den bekannten
 * "erster Aufruf liefert unvollständige Daten"-Stolperstein (s.
 * Modul-Kopfkommentar). Ruft NICHT selbst primeAccounts()/searchContract()
 * auf — das bleibt bewusst explizit beim Aufrufer (Kontrolle über
 * Reihenfolge, kein verstecktes Verhalten).
 *
 * @param {string[]} conids - Kontrakt-IDs (Aktien- oder Options-conids)
 * @param {string[]} fields - Feld-IDs, s. FIELDS-Export oben
 * @param {number} maxRetries - Standard 2 (ein erneuter Versuch nach 1s Pause)
 */
export async function getMarketDataSnapshot(baseUrl, conids, fields, maxRetries = 2) {
  let lastResult = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    lastResult = await ibkrGet(baseUrl, 'iserver/marketdata/snapshot', {
      conids: conids.join(','),
      fields: fields.join(','),
    });
    // Heuristik "vollständig genug": jeder Eintrag hat mindestens das
    // last-Feld (31) gefüllt. IBKR liefert bei kalten Subscriptions oft
    // nur {conid, ...} ohne die angefragten Felder zurück.
    const complete = Array.isArray(lastResult) && lastResult.every(r => r[FIELDS.last] !== undefined);
    if (complete) return lastResult;
    if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 1000));
  }
  console.warn('[ko-ibkr-live] getMarketDataSnapshot: auch nach Retry unvollständige Daten — Rückgabe trotzdem, Aufrufer muss Lücken selbst prüfen (No-Hallucination-Prinzip: keine erfundenen Werte).');
  return lastResult;
}

/**
 * Komfort-Funktion: Greeks + IV für eine Liste von Options-conids.
 * Dünner Wrapper um getMarketDataSnapshot() mit den Greek-Feldern.
 * @param {string[]} optionConids
 * @returns {Promise<Array<{conid: string, delta?: number, gamma?: number, theta?: number, vega?: number, ivPercent?: number}>>}
 */
export async function getOptionGreeks(baseUrl, optionConids) {
  const raw = await getMarketDataSnapshot(baseUrl, optionConids, GREEK_FIELD_IDS);
  return raw.map(r => ({
    conid: r.conid,
    delta: r[FIELDS.delta] !== undefined ? parseFloat(r[FIELDS.delta]) : undefined,
    gamma: r[FIELDS.gamma] !== undefined ? parseFloat(r[FIELDS.gamma]) : undefined,
    theta: r[FIELDS.theta] !== undefined ? parseFloat(r[FIELDS.theta]) : undefined,
    vega:  r[FIELDS.vega]  !== undefined ? parseFloat(r[FIELDS.vega])  : undefined,
    ivPercent: r[FIELDS.ivPercent] !== undefined ? parseFloat(r[FIELDS.ivPercent]) : undefined,
  }));
}

/**
 * Diagnose-Funktion für die Ersteinrichtung — prüft der Reihe nach:
 * Gateway erreichbar? Session authentifiziert? Testabfrage (AAPL) möglich?
 * Gibt strukturiertes Ergebnis zurück statt nur zu werfen — gedacht zum
 * Debuggen der VPS/IBeam-Einrichtung, s. ko-ibkr-live-SETUP.md.
 */
export async function verifySetup(baseUrl) {
  const result = { gatewayReachable: false, authenticated: false, testQueryOk: false, errors: [] };
  try {
    const status = await checkAuthStatus(baseUrl);
    result.gatewayReachable = true;
    result.authenticated = !!status.authenticated;
  } catch (e) {
    result.errors.push(`Gateway/Auth-Check fehlgeschlagen: ${e.message}`);
    return result;
  }
  if (!result.authenticated) {
    result.errors.push('Gateway erreichbar, aber Session nicht authentifiziert — IBeam-Login prüfen.');
    return result;
  }
  try {
    await primeAccounts(baseUrl);
    const test = await searchContract(baseUrl, 'AAPL');
    result.testQueryOk = Array.isArray(test) && test.length > 0 && !!test[0].conid;
  } catch (e) {
    result.errors.push(`Testabfrage (AAPL) fehlgeschlagen: ${e.message}`);
  }
  return result;
}
