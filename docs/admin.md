# Admin for ferro-webside

Admin er en side på nettstedet der du endrer tekster, bilder og prosjekter uten å røre koden. Den ligger på
https://ferro-ui.github.io/ferro-webside/admin/

Vil du bare prøve den, åpner du https://ferro-ui.github.io/ferro-webside/admin/?mock=1. Det er demomodus. Der lagres ingenting.

## Slik fungerer det

- Alt innhold ligger som tekstfiler i repoet på GitHub:
  - `content/site.json`: innstillinger, meny, forside, Om oss og Kontakt.
  - `content/projects/<adresse>.json`: ett prosjekt per fil.
  - `content/uploads/`: bilder du laster opp.
  - `content/drafts/`: utkast som ikke er publisert ennå.
- Admin leser og skriver disse filene direkte på GitHub med en nøkkel (et token) som du lager selv.
- Når du publiserer, bygger GitHub Actions nettstedet på nytt. Det tar omtrent ett minutt. Øverst i admin står «Publiseres …» og så «Publisert ✓».
- Forhåndsvisningen til høyre bruker den samme koden som byggingen. Det du ser der, er det som kommer ut på nettstedet.
- `index.html` i repoet er malen. Byggingen fyller inn innholdet og legger resultatet i `_site/`.

## Lag et token (én gang)

1. Logg inn på GitHub med en konto som har skrivetilgang til `Ferro-ui/ferro-webside`.
2. Åpne https://github.com/settings/personal-access-tokens/new (Settings → Developer settings → Fine-grained tokens → Generate new token).
3. Gi tokenet et navn, for eksempel «Ferro admin». Velg hvor lenge det skal gjelde, for eksempel 90 dager.
4. Under **Resource owner** velger du **Ferro-ui**. Krever organisasjonen godkjenning, må en eier godkjenne tokenet før det virker.
5. Under **Repository access** velger du **Only select repositories** og så **ferro-webside**.
   Ikke velg «Public repositories». Da kan tokenet bare lese, og publiseringen feiler.
6. Under **Permissions → Repository permissions** setter du:
   - **Contents: Read and write**, for å lagre og publisere.
   - **Actions: Read-only**, for å vise når nettstedet er publisert.
7. Trykk **Generate token** og kopier tokenet. Du får bare se det én gang.
8. Åpne admin og lim inn tokenet.

Tokenet lagres bare i den åpne fanen og forsvinner når du lukker den. Neste gang limer du det inn igjen. Ta vare på det i en passordbehandler.
Mister du tokenet, eller tror du noen andre har det, sletter du det på samme side på GitHub og lager et nytt.

## Lagre utkast og publisere

- **Lagre utkast** lagrer alle endringene dine i `content/drafts/`. Nettstedet endres ikke. Delen får merket «Utkast».
- **Publiser …** viser hva som blir publisert. Alt du krysser av, går ut samlet i én endring. Utkastene slettes samtidig.
- Felt med feil er merket med rødt. Det du publiserer, må være uten feil. Utkast kan lagres med feil.
- Hvert bilde trenger en kort tekst som beskriver det, for dem som ikke ser bildet.
- Ctrl + S (Cmd + S på Mac) lagrer utkast.
- Lukker du fanen før du har lagret, husker nettleseren endringene. Neste gang får du spørsmål om å hente dem inn igjen.

Repoet er offentlig. Utkast vises ikke på nettstedet, men alle som ser i repoet på GitHub, kan lese dem.

## Når noen andre har endret samtidig

Admin sjekker før hver lagring at ingen andre har endret de samme filene i mellomtiden. Har noen gjort det, får du meldingen «Innholdet er endret et annet sted».
Endringene dine er da tatt vare på i nettleseren. Trykk «Last inn på nytt», og hent dem inn igjen.
Har den andre endret andre filer enn deg, lagres endringen din uten spørsmål.

## Historikk

Trykk **Historikk** i en del eller i et prosjekt. Du ser alle tidligere versjoner av filen, både publiserte og utkast.
Velg en versjon for å se den i forhåndsvisningen. **Gjenopprett** legger den inn som en vanlig endring. Den gjelder først når du publiserer.

## Prosjekter

- **+ Nytt prosjekt** lager et skjult prosjekt. Fyll ut, slå på «Vis på nettstedet» og publiser.
- Slå av «Vis på nettstedet» for å skjule et prosjekt uten å slette det.
- **Slett prosjektet** fjerner filen med en gang, etter at du har bekreftet. Gamle versjoner finnes i historikken på GitHub.
- Pilene i listen endrer rekkefølgen på prosjektsiden.
- Et prosjekt som vises på forsiden eller i dronefilmen, må være publisert.

## Bilder

Admin gjør bildet mindre i nettleseren før det lastes opp. Det lagres som WebP på maks 2400 px, og i tillegg 1280 og 640 px for mobil.
Bildet lastes opp sammen med neste utkast eller publisering. Til da ligger det bare i nettleseren.

## Demomodus

`admin/?mock=1` henter innholdet fra nettstedet og lar deg prøve alt: skrive, lagre utkast, publisere, se historikk og laste opp bilder. Ingenting sendes til GitHub. Øverst står «Demomodus – endringer lagres ikke».

## Begrensninger

- Repoet er offentlig, også utkast og bilder.
- Det tar omtrent ett minutt fra du publiserer til nettstedet er oppdatert.
- `robots.txt` virker bare på roten av et domene. Med eget domene begynner den å virke.
- Byggingen stopper hvis innholdet har feil. Da blir den forrige versjonen av nettstedet stående. Feilen står i loggen under Actions på GitHub.
- Kategoriene for prosjekter, «Hva vi bygger», «Slik jobber vi», kundesitatene og bunnteksten endres fortsatt i `index.html`.
- Bare én person bør redigere den samme delen om gangen.
- Skjemaet på kontaktsiden lager et e-postutkast hos den besøkende. Henvendelser lagres ikke noe sted.

## For utviklere

- `node --test tests/*.test.mjs` kjører testene.
- `node scripts/build.mjs` bygger `_site/`.
- `node scripts/serve.mjs` viser `_site/` på http://127.0.0.1:8030/ferro-webside/.
- `lib/schema.mjs` beskriver alle felt og regler. Admin, byggingen og testene bruker den.
- `lib/render.mjs` fyller malen. Admin og byggingen bruker den.
- `scripts/seed.mjs` laget `content/` fra det gamle nettstedet. Den trengs ikke igjen.
- Den lokale Payload-løsningen i `../ferro-cms` er uendret og kan brukes som reserve.

## Neste steg

- Ta imot henvendelser fra skjemaet med en liten serverfunksjon, så de kommer fram selv om den besøkende ikke har e-postprogram.
- Flere redaktører med ulike roller, for eksempel at noen bare kan lagre utkast og andre kan publisere.
- Planlagt publisering: velg dato og klokkeslett, så publiserer en planlagt jobb i Actions.
- Rydd i bildebiblioteket: finn bilder i `content/uploads/` som ikke brukes, og slett dem.
- Flytt innholdet til et privat repo eller en egen vert med innlogging, så utkast ikke er offentlige.
- Eget domene, så `robots.txt` virker og tokenet ligger på et eget domene.
- Gjør resten av forsiden redigerbar: «Hva vi bygger», «Slik jobber vi», kundesitater og nyheter.
- Sammenlign to versjoner side om side i historikken.
