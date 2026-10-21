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

## DEV-002 – verifierade mappningsregler för UO-budget 2027–2030

Importprofilen `uo-budget-2027-v1` identifierar bladet `UO Tot 2027-30`, UO-namnet i B1 och periodrubrikerna på rad 11.

- D:O: månader januari–december 2027 (rubriker lagrade som Excel-datum).
- P: härledd årssumma 2027; **exkluderas** eftersom månadsvärdena redan importerats.
- Q:S: inmatade årsbehov 2028–2030, identifieras från `ÅRSBEHOV 2028` osv.
- T: ram 2027, U: differens, V: kommentar; är **inte** råa behovsvärden.
- Raderna 20–24 avser UO Övergripande, därefter följer LO-block (LO 1 osv).
- Källdetaljer importeras endast från igenkända resursslag (`IT timmar`, `V timmar`, övriga omkostnader och produktkonsulter).
- Formelceller, OMK-TOT och sammanställningsrader exkluderas för att undvika dubbelräkning.
- `Aktivering  2027-2030` innehåller en **delmängd** av behovet och får inte adderas till samma mått igen.
- Äldre LO-flikar, avdelningstid och andra informationskällor kräver separata profiler.

Importen återger källa (blad/cell) för varje numeriskt detaljvärde. Icke-numeriska celler rapporteras som varningar i stället för att få ett påhittat tal.

**Begränsning:** Den första parsern omfattar UO-budgetens detaljvärden och kan anropas programmässigt. Användargränssnittet för filuppladdning och interaktiv återkoppling byggs i DEV-003. Testerna använder syntetiska arbetsböcker, så ingen verklig planeringsfil lagras i GitHub.
