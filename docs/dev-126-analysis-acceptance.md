# DEV-126 – Acceptans av den förenklade analysvyn

## Syfte
Verifiera samlat beteendet efter DEV-122–125, utan att förväxla godkända automatiska tester med manuell acceptans i målmiljö. Underlaget ska vara syntetiskt och får inte innehålla produktionsuppgifter.

## Förutsättningar
- Starta från en testinstallation eller ta en separat projektbackup först. Import och borttagning kan påverka lokalt lagrade data.
- Använd minst två Excel-filer med olika UO, samma LO-namn, åren 2027–2030 och olika timvärden.
- Skapa dessutom en UO-gruppmodell med minst två grupper; lämna gärna något UO utan grupp.
- Använd en testkälla med ett saknat år och en annan med saknad/ej godkänd aktivitetsfördelning.
- Genomför gärna provet på både dator och iPad i stående läge.

## Acceptanspunkter

| ID | Kontroll | Förväntat resultat | Automatisk grund |
| --- | --- | --- | --- |
| AC-126-01 | Importera flera källor och gå till Analys | Alla ingår utan urval; inga checkboxar för datakälla, UO eller LO visas | `change-114-multi-source-acceptance.spec.ts`, `change-120-visible-analysis-controls.spec.ts` |
| AC-126-02 | Visa Alla UO och välj sedan en UO | Sammanfattning, tabeller och diagram följer hierarkin; likadana LO-namn från andra UO blandas inte in | `change-114-multi-source-acceptance.spec.ts` |
| AC-126-03 | Visa UO-grupper och öppna en grupp | Gruppnivån respektive dess UO visas enligt vald gruppmodell, inklusive Ej grupperad när tillämpligt | Befintliga grupp- och navigeringstester; manuell kontroll |
| AC-126-04 | Jämför minst två giltiga UO | Cirkeldiagram är standard; användaren kan växla till tabell | `change-123-default-pie.spec.ts` |
| AC-126-05 | Visa endast en UO eller data som inte kan visas som cirkel | Tabell visas som reserv och fördjupningsknapparna fungerar | `change-123-default-pie.spec.ts` |
| AC-126-06 | Växla år, timmar, IT/verksamhet och utveckling/förvaltning | Alla analysresultat och årsvyer utgår från samma urval; inget saknat värde räknas som noll | Befintliga analys- och acceptanstester; manuell kontroll |
| AC-126-07 | Läs Årsvis utveckling | Total trend och tabell med skillnad mot föregående år stämmer med underlaget | Befintliga årstrendtester |
| AC-126-08 | Läs Utveckling per organisationsdel, växla grupp/UO/LO | En serie per aktuell organisationsdel, med samma årsvärden som matrisen Organisation per år | `change-124-organization-year-lines.spec.ts` |
| AC-126-09 | Kontrollera linjer och diagramförklaring | Färger kompletteras med motsvarande linjemönster; saknade årsserier bryts och visas inte som noll | Utökat `change-124-organization-year-lines.spec.ts`; manuell kontroll av saknat år |
| AC-126-10 | Öppna Visa detaljerad organisation per år | Matrisen är ihopfälld från början och kan visas; summor stämmer mot diagrammen | `change-121-optional-organization-matrix.spec.ts` |
| AC-126-11 | Kontrollera vid smal skärm, zoom och tangentbord | Inga kritiska kontroller blockeras; diagramförklaring och tabeller är läsbara | Befintliga responsivitets- och tillgänglighetstester; manuell kontroll |
| AC-126-12 | Ladda om sidan och exportera CSV | Importerade uppgifter finns kvar och exporterad analys är konsekvent med synliga resultat | Befintliga import-, export- och omladdningstester |

## Avslutande verifiering
1. Bekräfta grön **Verify PWA** på aktuell commit: lint, typkontroll, enhetstester, bygg, single-file-kontroller och Playwright.
2. Utför AC-126-01–12 manuellt och notera PASS/FAIL, enhet/webbläsare och eventuella avvikelser.
3. Kontrollera Pages-versionen och fristående HTML var för sig efter eventuell release. `file://` och Pages har olika lagringsursprung.
4. Om något fallerar: skapa ett konkret avgränsat felärende/utvecklingssteg innan release. Ingen release genomförs av detta dokumentationssteg.

## Status
Automatisk grund finns i repositoryt. **Manuell acceptans och releaseverifiering är inte utförda genom denna PR.**
