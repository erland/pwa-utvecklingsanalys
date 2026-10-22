# CHANGE-024 – Responsiv analys och arbetsflödesnavigation

## Omfattning
- Navigationsvalen är grupperade under **Analysera**, **Konfigurera**, **Komplettera** och **Projekt**, men existerande vy-ID, knappar och funktioner bevaras under denna första förändring.
- På porträttsurfplatta och mindre fönster (upp till 1150 px) placeras navigeringen över innehållet och går att skrolla horisontellt i stället för att ta 250 px av dataytan.
- Analysfiltren flyttas från en fast vänsterkolumn till en fällbar panel ovanför analysresultaten. Panelen är initialt öppen, så befintlig tillgänglighet och befintliga urval bevaras.
- Resultattabeller och diagram får hela den tillgängliga innehållsbredden; den valda analysen och dess beräkningar ändras inte.

## Varför den mindre förändringen
Det nya trestegsflödet behöver en säker navigationsomläggning innan vi kan minska antalet huvudval till ett fåtal flikar: automatiska tester och tidigare användares arbetsflöden refererar befintliga vyknappar. Detta steg grupperar dem utan att bryta navigerbarheten, och nästa UX-steg kan införas separat med undernavigation och fullständiga regressionstester.

## Verifiering
Ordinarie CI samt nytt Playwright-test med 820 × 1180 (porträtt), import till analys, fullbreddsresultat och öppna/stäng filter.
