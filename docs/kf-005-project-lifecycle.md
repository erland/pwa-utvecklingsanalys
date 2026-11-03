# KF-005 – Separera projektets livscykel från App

## Baslinje och mål
- `main` efter PR #273 (KF-004): `ee165d26ea721b31b1ae242b41dcacaaeba8bbf1`.
- Plansteg: **KF-005**, finding **APP-COUPLING**.
- Ändringstyp: **beteendebevarande refaktorering**, inte UX-ändring eller datamigrering.

## Ändring
`src/app/useProjectWorkspace.ts` äger samma projektstatus, uppstartseffekter och funktioner som tidigare låg i `src/App.tsx`. `App` är fortfarande navets och sidornas kompositionspunkt och prenumererar fortsatt på flikhändelser enligt KF-004.

Bevarade kontrakt:
1. Initiering: `recoverInterruptedRestore()`, därefter `recoverSourceMutation()`, därefter `loadProject()`; feltext och cleanup-vakt är oförändrade.
2. Översikt laddas om när `project`, `analysisRefresh` eller `view` ändras. Tomt projekt ger fortfarande `overview=null`.
3. Inträde i analys kontrollerar alltid `loadProject()`, `loadCanonical()` och `loadGapState()` från lagring innan den visar analys, med samma meddelanden och navigation vid saknade data.
4. Projektbyte/import uppdaterar projekt och analys-refresh som tidigare.
5. Namnändring är optimistisk och anropar samma `saveProject` med bevarad sekventiell skrivkö; ingen ändring av lagringsformat eller onChange-semantik.
6. Historisk navigationsfixture och normal navigation renderas oförändrat.

## Verifiering
- Nytt `e2e/kf-005-project-lifecycle.spec.ts` täcker tom start, inaktiverad analys utan källdata, namnändring i Inställningar, byten mellan Import/Översikt samt namn efter webbläsaromladdning.
- Existerande tester för import, navigation, tvåflikskonflikter och lagring ska passera i oförändrad full Verify PWA.
- **Grönt PR-head-CI krävs före merge**. Ingen release ingår.

## Avgränsning och kvarstående risk
Ingen refaktorering av IndexedDB-skrivlogik, inga ändringar i importvyn (PR #256 är ett separat öppet utkast), inga ändringar i flikmeddelandenas semantik. Orkestreringen ligger i en hook för att begränsa diffen; en framtida större renodling av navigationskomponenter kräver ett separat beslut.

## Nästa steg
Efter verifierad och mergad KF-005: **KF-006**, samla release readiness och manuella godkännanden. Inget produktionssläpp får göras enbart på grund av grön CI.
