# Ferro Stålentreprenør — nettside

Statisk nettside for **Ferro Stålentreprenør AS**, en totalentreprenør for stålbygg.
Ren HTML/CSS/JS — uten byggesteg og uten rammeverk.

## Innhold

| Fil | Beskrivelse |
|-----|-------------|
| `index.html` | All markup for de fem skjermene (Hjem, Prosjekter, Prosjekt-detalj, Om oss, Kontakt) + nav, footer og lightbox |
| `css/styles.css` | Globale stiler, keyframes og responsive regler |
| `js/app.js` | Liten, avhengighetsfri runtime: hash-ruting, hover/fokus, prosjektgrid + detaljvisning, kontaktskjema, lightbox, parallax og hero-video |
| `assets/ferro-hero.mp4` | Hero-video |
| `server.js` | Enkel statisk server for lokal forhåndsvisning (ikke nødvendig i produksjon) |

## Kjøre lokalt

```bash
node server.js
# åpne http://127.0.0.1:8011
```

Eller hvilken som helst statisk filserver — siden trenger ingen backend.

## Teknisk

- **Skjermer** byttes via hash-ruting (`#hjem`, `#prosjekter`, `#omoss`, `#kontakt`).
- **Prosjektliste og detaljvisning** genereres fra dataene i `js/app.js`.
- Inline-stiler normaliseres ved oppstart slik at de responsive `[style*=…]`-reglene treffer.
- Fonter: Archivo, Space Grotesk, Space Mono (Google Fonts).

## Deploy

Publisert via GitHub Pages fra `main`-grenen.
