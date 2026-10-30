# Kato Meal Planner

Een volledig statische, Nederlandstalige maaltijdplanner voor GitHub Pages. De applicatie gebruikt React, TypeScript en Vite; menu's, favorieten, instellingen en boodschappenlijst blijven lokaal op het apparaat van de gebruiker.

## Functies

- 100 unieke receptvarianten met hoeveelheden per portie, bereiding, voedingswaarden, allergenen en geschatte prijs.
- Weekmenu van maandag tot zondag; de actieve week begint op maandag om 06:00 in `Europe/Brussels`.
- Daggebaseerde planning en een rotatiegeschiedenis van minstens 30 dagen; de planning wordt lokaal bewaard en verandert niet bij verversen.
- Voorkeuren voor porties, budget, bereidingstijd en uitgesloten ingrediënten.
- Recepten zoeken, filteren, favoriet maken, vervangen en handmatig aan een dag toewijzen.
- Boodschappenlijst op basis van het weekmenu, met gecombineerde hoeveelheden, categorieën, afvinken, handmatige producten, aanpassen, kopiëren en afdrukken.
- Voedingswaarden en porties in receptdetails; maaltijden afvinken voor dagelijkse voortgang.
- Responsive interface en service worker voor de offline app-shell. Recepten en opgeslagen planning werken offline nadat de app eerder is geladen; eerder geladen receptfoto's worden ook gecachet. Nog niet eerder geladen foto's vereisen een netwerkverbinding.
- Geen account, betaalde API of server nodig.

Voedingswaarden en prijzen zijn schattingen en kunnen per product en winkel verschillen. Controleer verpakkingen voor actuele allergeneninformatie.

## Lokaal starten

Vereist Node.js 20 of hoger.

```bash
npm install
npm run dev
```

## Productiebuild

```bash
npm run build
npm run preview
```

De statische site wordt gegenereerd in `dist/`.

## GitHub Pages publiceren

1. Push de repository naar de branch `main`.
2. Open **Settings → Pages** in GitHub en stel **Build and deployment → Source** in op **GitHub Actions**.
3. De workflow `.github/workflows/deploy.yml` bouwt en publiceert de site na iedere push.

De Vite-base is ingesteld op `/voedsel-scheme-app/`, passend bij de GitHub-repository. Pas `base` in `vite.config.ts` aan als de repository een andere naam krijgt of op een eigen domein wordt gehost.

## Lokale gegevens

De planner bewaart gegevens in `localStorage` van de browser. Gegevens worden niet tussen apparaten gesynchroniseerd. De weekplanning wordt aangemaakt bij het eerste bezoek na de weekgrens; de applicatie hoeft daarvoor niet op de achtergrond geopend te blijven.
