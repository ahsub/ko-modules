# ko-ibkr-live — Einrichtungsanleitung (VPS + IBeam + Gateway)

**Stand:** 10.08.2026. Diese Anleitung ist für Axel — die Schritte hier
(VPS anmieten, IBKR-Zugangsdaten hinterlegen, TOTP einrichten) sind
bewusst nicht von Claude ausführbar (Zahlungsdaten, Kontoauthentifizierung)
und müssen von dir selbst durchgeführt werden.

## Warum überhaupt ein eigener Server?

IBKRs Client Portal Web API ist kein einfacher HTTP-Endpunkt wie CBOE/
SqueezeMetrics (die wir heute Vormittag geprüft haben) — sie braucht einen
**dauerhaft laufenden, angemeldeten Gateway-Prozess**. Dein eigener Rechner
scheidet aus, weil der UIQ-Aggregator nach Zeitplan läuft (05:37/13:30 UTC
via GitHub Actions) — wenn dein Rechner dann aus ist, fehlen die Live-Daten
genau dann, wenn sie gebraucht werden.

## Schritt 1 — VPS anmieten

Ein kleiner, günstiger VPS reicht (die Gateway-Software ist leichtgewichtig).
Empfehlung aus der IBeam-Community: Hetzner oder DigitalOcean, kleinste
Stufe (~5€/Monat), Ubuntu 22.04 oder neuer, Docker vorinstalliert oder
selbst installiert (`curl -fsSL https://get.docker.com | sh`).

## Schritt 2 — IBKR Secure Login System (SLS) mit TOTP einrichten

1. In deinem IBKR-Konto: Einstellungen → Sicherheit → Secure Login System
   → "Mobile Authentication" aktivieren (falls noch nicht geschehen).
2. Bei der Einrichtung wird ein QR-Code UND ein Base32-Secret-Text
   angezeigt (meist unter "manuelle Eingabe" oder ähnlich versteckt neben
   dem QR-Code) — **dieses Secret brauchst du für IBeam, nicht den QR-Code
   selbst.** Sicher aufbewahren (Passwort-Manager), niemals im Klartext in
   ein Git-Repo committen.

## Schritt 3 — IBeam + Gateway per Docker Compose starten

Auf dem VPS, in einem neuen Verzeichnis, folgende `compose.yaml` anlegen:

```yaml
services:
  ibeam:
    image: voyz/ibeam
    ports:
      - 5000:5000
    environment:
      IBEAM_ACCOUNT: "DEIN_IBKR_BENUTZERNAME"
      IBEAM_PASSWORD: "DEIN_IBKR_PASSWORT"
      IBEAM_OTP_SECRET: "DAS_BASE32_SECRET_AUS_SCHRITT_2"
    network_mode: bridge  # Pflicht laut IBeam-Doku (IP-Whitelist des Gateways)
    restart: unless-stopped
```

**Wichtig zu Sicherheit (ehrliche Einordnung, nicht beschönigt):** Die
Zugangsdaten liegen im laufenden Container im Klartext vor. Das ist ein
bekanntes, von IBeam selbst offen benanntes Risiko (s. deren README) — bei
einem kompromittierten Server oder einer Sicherheitslücke im Port-5000-API
könnten die Daten offengelegt werden. Für den Anfang vertretbar, aber:
- `compose.yaml` NIEMALS in ein Git-Repo committen (auch nicht privat) —
  stattdessen `.env`-Datei mit `echo ".env" >> .gitignore` sichern, oder
  die Werte direkt auf dem Server in einer nicht versionierten Datei halten.
- Firewall auf dem VPS: Port 5000 NUR für die IP-Adressen freigeben, die
  tatsächlich zugreifen müssen (GitHub Actions hat leider keine festen
  IP-Ranges — hier ggf. stattdessen ein VPN oder einen Reverse-Proxy mit
  eigenem Auth-Token davorschalten, sonst ist Port 5000 offen im Internet).

Start: `docker compose up -d`

## Schritt 4 — Verifizieren

```bash
curl -k https://DEIN-VPS-IP:5000/v1/api/iserver/auth/status
```

Sollte `{"authenticated": true, ...}` zeigen (kann beim ersten Start 1-2
Minuten dauern, bis IBeam den Login-Flow durchlaufen hat).

Danach aus `ko-ibkr-live.js`:

```js
import { verifySetup } from './ko-ibkr-live.js';
const result = await verifySetup('https://DEIN-VPS-IP:5000');
console.log(result);
// erwartet: { gatewayReachable: true, authenticated: true, testQueryOk: true, errors: [] }
```

## Bekannte Grenzen dieser Anleitung

- Nicht getestet, da der VPS noch nicht existiert (Stand 10.08.2026) —
  bei der ersten echten Einrichtung können Details abweichen, insbesondere
  bei TLS-Zertifikaten (IBeam nutzt standardmäßig ein selbstsigniertes
  Zertifikat, `-k`/`rejectUnauthorized: false` nötig, bis ein echtes
  Zertifikat hinterlegt ist).
- Reverse-Proxy/VPN-Absicherung (Schritt 3, letzter Punkt) ist als
  Empfehlung genannt, aber nicht im Detail ausgearbeitet — eigener
  Prüfpunkt vor Produktiveinsatz.
