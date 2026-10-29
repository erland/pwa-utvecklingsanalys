# DEV-114 – Historisk integrerad acceptans av analysvyn

> **Historiskt underlag:** Detta dokument gäller DEV-114 före UX-ändringarna DEV-122–125. Datakälle-, UO- och LO-checkboxarna har sedan dess tagits bort. För aktuell acceptans, se [DEV-126](dev-126-analysis-acceptance.md).

## Omfattning

Slutlig sammanhängande kontroll av DEV-109–113: en organisationskontext, oberoende tim- och aktivitetsfilter, årsvis utveckling, förändring mot föregående år och en enda tabell **Organisation per år**. Den separata fördjupade rapportsektionen är avvecklad.

## Acceptanskriterier och verifiering

| Kriterium | Automatisk verifiering |
| --- | --- |
| Flera källor och UO med likalydande LO-namn hålls isär | `analysisSourceScope.test.ts`, `change-114-multi-source-acceptance.spec.ts` |
| Summeringar räknas utan dubbelräkning av UO-matriser eller godkända aktivitetsdelar | `canonicalQuery.test.ts`, `organizationContext.test.ts`, `analysisSourceScope.test.ts` |
| Datakällefilter påverkar huvudsumma, UO-navigator, LO-detaljer och årsrapporter konsekvent | `analysisSourceScope.test.ts`, `change-114-multi-source-acceptance.spec.ts` |
| UO- och LO-filter avgränsar samma datamängd i alla organisationsvyer | `analysisSourceScope.test.ts`, `change-114-multi-source-acceptance.spec.ts` |
| Organisation per år finns en gång och följer organisationsnivån | `change-113-integrated-years.spec.ts`, `change-114-multi-source-acceptance.spec.ts` |
| Ej fördelade timmar redovisas som ofullständig täckning, inte som förvaltning | `analysisSourceScope.test.ts`, `change-114-multi-source-acceptance.spec.ts` |
| Importerade uppgifter överlever omladdning via webbläsarens lagring | `change-114-multi-source-acceptance.spec.ts` |
| Typkontroll, lint, enhetstester, bygg, single-file och Playwright-regression | GitHub Actions: **Verify PWA** |

## Användarflöde

1. Importera minst två UO-källor med skilda värden och gemensamma LO-namn.
2. Kontrollera huvudsumma, organisation per år och UO-jämförelse.
3. Välj en källa och verifiera att alla tre vyer visar samma avgränsning.
4. Återställ källor, välj ett UO och öppna dess LO-detaljer.
5. Välj enbart utveckling eller förvaltning och kontrollera täckningsmarkering vid saknad godkänd fördelning.
6. Ladda om sidan och verifiera att importerad data fortfarande finns.

## Avgränsning och driftsättning

Denna acceptans verifierar lokala import- och analysflöden i Playwright/Chromium. PWA-installation, offline-cache och uppdateringsbeteende för en **publicerad** version måste fortfarande kontrolleras i release-/driftsättningsmiljön. Ingen GitHub Release eller produktionspublicering ingår i DEV-114. Testunderlagen är syntetiska.
