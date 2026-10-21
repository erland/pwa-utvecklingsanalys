# Test.xlsx – inledande importinventering

Granskning 2026-10-21 av faktiskt bifogad mall, främst cell A1:K35 i relevanta blad. Detta är **inte** en verifierad fullständig cellmappning.

- `1. Läs detta!`: instruktioner, bekräftar bara vita celler som redigerbara, behov per LO och att aktiveringsbehov ingår i totalbehov.
- `UO Tot 2027-30`: B1 har UO-platshållare; C3:I7 har sammanfattningsrubriker utveckling/förvaltning 2027–28; rader 11+ innehåller 2027-månader, rad 12 total-UO, rader 13–18 resurser/omkostnader/aktivering, rad 19 UO övergripande, LO-block börjar vid rad 25 och upprepas. Undersök alla årskolumner/LO-block före mappning.
- `Aktivering  2027-2030`: separat aktiveringsstruktur, total-UO på rad 6 och flera upprepade aktiveringsblock från rad 12. Namnet har två blanksteg före 2027.
- `Timmar per avdelning`: rader 4–19 innehåller avdelningsfördelning, 2027–29 och avvikelse-/förankringskommentarer.
- `Blad1`: register över utvecklingsområden och ansvarig avdelning.
- `LO`, `LO (2)` etc: verkar bygga på äldre 2025-upplägg; **ignorera eller flagga som separat källtyp** i första importprofilen för att undvika sammanblandning.
- `Till BS`: finns som separat blad; roll inte klarlagd.

## Importspik DEV-002
Kartlägg fulla blad, vilka celler är inmatning kontra formler/summeringar, alla år/månader, LO-block och enhetsvarianter. Bygg maskinläsbar golden fixture och regressionsprov. Identifiera Excel-datumserier och formelcache. Ladda inte implicit samma belopp från total och detalj.
