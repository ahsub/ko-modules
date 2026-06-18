# ko-modules

**Modulbibliothek für KO-Scanner Investment Suite**  
**Autor:** Dr. Axel Hildebrand  
**Repository:** ahsub/ko-modules

---

## Übersicht

Portable, framework-freie JavaScript-Module für Aktienanalyse,  
Investment-Scoring und Portfolio-Management.

Jedes Modul ist:
- **Standalone** — funktioniert ohne andere Module
- **Pausierbar** — `KoConfig.features.xyz.enabled = false`
- **Portabel** — drop-in für neue Projekte

---

## Module

| Datei | Status | Beschreibung |
|-------|--------|-------------|
| `ko-config.js` | ✅ v1.0 | Zentrale Konfiguration, Feature-Flags, API-URLs |
| `ko-indicators.js` | ✅ v1.0 | Technische Indikatoren (RSI, EMA, MACD, ATR, BB, ADX) |
| `ko-wl.js` | ✅ v1.0 | Watchlist-Manager (CRUD, Sync, Import/Export) |
| `ko-scoring.js` | 🔲 v1.0 | Composite Score, SEPA, Bull-Indikator, Überhitzung |
| `ko-markov.js` | 🔲 v1.0 | Markov 2.0, Regime, σ-Signal, P(Bull→Bear) |
| `ko-data.js` | 🔲 v1.0 | Datenbeschaffung (Yahoo, Finnhub, TwelveData) |
| `ko-intermarket.js` | 🔲 v1.0 | VIX, Breadth, Sektoren, Makro, CNN F&G |
| `ko-options.js` | 🔲 v1.0 | IV-Enrichment, Skew-Proxy, C/P-Ratio |
| `ko-alert.js` | 🔲 v1.0 | Telegram Alert-Routing, Gates, Digest |
| `ko-ki.js` | 🔲 v1.0 | KI-Briefings, Auto-Makro, Prompt-Builder |

---

## Verwendung

### Einbetten (Standalone HTML)
```html
<script src="ko-config.js"></script>
<script src="ko-indicators.js"></script>
<script src="ko-wl.js"></script>
```

### Feature deaktivieren
```javascript
KoConfig.features.markov.enabled = false;   // Markov pausieren
KoConfig.features.ivEnrich.enabled = false; // IV-Enrichment pausieren
```

### Strategie-Preset laden
```javascript
KoConfig.applyPreset('deepValue');   // Deep Value Modus
KoConfig.applyPreset('options');     // Options/Wheel Modus
KoConfig.applyPreset('momentum');    // SEPA/Minervini Modus
```

---

## Projekte die diese Module verwenden

| Projekt | Repository | Module |
|---------|-----------|--------|
| KO-Scanner | ahsub/axel-scanner | alle |
| ah-media | ahsub/ah-media | ko-config |
| ah-clinic | ahsub/ah-clinic | ko-config |
| PremiumOptions | ahsub/premium-options | ko-config, ko-indicators, ko-options, ko-wl |
| DeepValue | ahsub/deep-value | ko-config, ko-indicators, ko-scoring, ko-wl |

---

## Abhängigkeiten

```
ko-config.js      → keine
ko-indicators.js  → keine
ko-wl.js          → keine (optional: ko-config für Toast)
ko-scoring.js     → ko-indicators, ko-config
ko-markov.js      → ko-indicators
ko-data.js        → ko-config
ko-options.js     → ko-data, ko-indicators
ko-intermarket.js → ko-data, ko-indicators
```

---

## Roadmap

```
Phase 1 (aktuell):  ko-config, ko-indicators, ko-wl
Phase 2:            ko-scoring, ko-markov
Phase 3:            ko-data, ko-options, ko-intermarket
Phase 4:            ko-alert, ko-ki
Phase 5:            ko-macro-updater.py (Python)
```
