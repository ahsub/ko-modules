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

## Schritt 3 — IBeam + Gateway per Docker Compose starten (mit `.env`)

Auf dem VPS, in einem neuen Verzeichnis, zwei Dateien anlegen — die
Geheimnisse stehen NUR in der `.env`, die `compose.yaml` verweist nur
darauf und kann bedenkenlos auch mal geteilt/eingesehen werden.

**Datei 1: `.env`** (die eigentlichen Geheimnisse, bleibt lokal auf dem VPS)

```env
IBEAM_ACCOUNT=DEIN_IBKR_BENUTZERNAME
IBEAM_PASSWORD=DEIN_IBKR_PASSWORT
IBEAM_OTP_SECRET=DAS_BASE32_SECRET_AUS_SCHRITT_2
```

**Datei 2: `compose.yaml`** (verweist per `${VARIABLE}` auf die `.env`,
keine Geheimnisse direkt drin)

```yaml
services:
  ibeam:
    image: voyz/ibeam
    ports:
      - 5000:5000
    environment:
      IBEAM_ACCOUNT: ${IBEAM_ACCOUNT}
      IBEAM_PASSWORD: ${IBEAM_PASSWORD}
      IBEAM_OTP_SECRET: ${IBEAM_OTP_SECRET}
    network_mode: bridge  # Pflicht laut IBeam-Doku (IP-Whitelist des Gateways)
    restart: unless-stopped
```

Docker Compose liest die `.env`-Datei automatisch, solange sie im selben
Verzeichnis wie `compose.yaml` liegt — kein zusätzlicher Parameter nötig,
einfach `docker compose up -d` wie gewohnt.

**Falls das Verzeichnis überhaupt unter Versionskontrolle steht** (z. B.
weil du es testweise in einem privaten Repo ablegen willst): unbedingt
zuerst

```bash
echo ".env" >> .gitignore
```

— **bevor** die `.env`-Datei angelegt wird, damit sie nie versehentlich
committed wird. Rechte einschränken schadet auch nicht:

```bash
chmod 600 .env
```

(nur der Datei-Besitzer darf lesen/schreiben).

**Wichtig zu Sicherheit (ehrliche Einordnung, nicht beschönigt):** Die
`.env`-Datei bzw. der laufende Container hält die Zugangsdaten weiterhin im
Klartext — das `.env`-Muster schützt vor **versehentlichem Commit ins
Git-Repo**, nicht vor Zugriff auf dem Server selbst. Das ist ein bekanntes,
von IBeam selbst offen benanntes Restrisiko (s. deren README): bei einem
kompromittierten Server oder einer Sicherheitslücke im Port-5000-API
könnten die Daten offengelegt werden. Für den Anfang vertretbar, aber:
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
