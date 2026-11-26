# Ferro Stålentreprenør — nettside

Statisk nettside for **Ferro Stålentreprenør AS**, en totalentreprenør for stålbygg.
Ren HTML/CSS/JS — uten byggesteg og uten rammeverk.

## Innhold

| Fil | Beskrivelse |
|-----|-------------|
| `index.html` | All markup for de fem skjermene (Hjem, Prosjekter, Prosjekt-detalj, Om oss, Kontakt) + nav, footer og lightbox |
| `css/styles.css` | Globale stiler, keyframes og responsive regler |
| `js/app.js` | Liten, avhengighetsfri runtime: hash-ruting, hover/fokus, prosjektgrid + detaljvisning, prosjektsøk, lightbox, parallax og hero-video |
| `css/home-2026.css` | Stiler for alle skjermene og den felles toppmenyen (2026-designet), avgrenset til `.home26` med `h26-`-klasser |
| `js/home-2026.js` | Forsidens dronefilm (bildetekster, pause/spill av) og rullelenker |
| `assets/video/hero-drone-v4-*.mp4` | Hero-video i 1080p, 720p og 480p |
| `js/inquiry.js` | Validerer kontaktfeltene og lager et e-postutkast. Brukeren sender fra eget e-postprogram. |
| `server.js` | Enkel statisk server for lokal forhåndsvisning (ikke nødvendig i produksjon) |

## Kjøre lokalt

```bash
node server.js
# åpne http://127.0.0.1:8011
```

Eller hvilken som helst statisk filserver — siden trenger ingen backend.

## Teknisk

- **Skjermer** byttes via hash-ruting (`#hjem`, `#prosjekter`, `#prosjekt/<slug>`, `#omoss`, `#kontakt`).
- **Prosjektliste og detaljvisning** genereres fra dataene i `js/app.js`.
- Inline-stiler normaliseres ved oppstart slik at de responsive `[style*=…]`-reglene treffer.
- Prosjektbilder og portretter ligger lokalt som WebP i `assets/photos/`.

## Deploy

Publisert via GitHub Pages fra `main`-grenen.
