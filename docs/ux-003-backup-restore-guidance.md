# UX-003 – Begriplig och säker backupåterställning

**Bas:** `main` `2a368a61d9e7fc71e60944431af664e352182dc3`, efter mergad UX-002/PR #279.

## Verifierat UX-problem
I `src/portability/PortabilityView.tsx` kunde en användare välja en validerad projektbackup och ersätta samtliga lokala projektdata efter ett enda generellt meddelande med backupens namn/antal observationer. Det saknades tydlig jämförelse med aktuellt projekt och det fanns ingen direkt funktion för att uppdatera vyn efter lyckad återställning. Användaren fick själv läsa ett statusmeddelande och ladda om.

## Avgränsad förbättring (ux_change)
1. När en backup har validerats läses aktuellt projekt från IndexedDB. En förhandsgranskning visar **nuvarande projekt (ersätts)** samt **projekt i backupen (återställs)** med namn och antal källor. Backupen visar dessutom antal observationer.
2. Informationen varnar uttryckligen för att återställningen sker över flera lokala databaser, att rollback är best-effort och att andra flikar inte bör fortsätta skriva.
3. Filinmatning och återställningsknapp är otillgängliga medan ett moment pågår. Ingen återställning erbjuds vid avvisad fil eller misslyckad läsning av nuvarande projekt.
4. Efter lyckad återställning visas **Ladda om appen nu**, som laddar in det återställda projektets verkliga tillstånd. Statusmeddelandet **Projekt återställt** finns kvar så att befintliga tester och manuella användare får feedback.
5. Vid misslyckad återställning rekommenderas datakontroll före ett nytt försök. Den ursprungliga felkoden bevaras i feltexten.

Detta ändrar **inte** `restoreProject`, backupformat, databasstruktur, automatisk rollback eller gränsen för atomiskhet. En säkerhetskopia är fortfarande användarens ansvar.

## Verifieringskontrakt
- `e2e/ux-003-backup-restore-guidance.spec.ts`: export från namngivet projekt; namnändring; validerad backup; förhandsgranskning av ersatt/återställt namn; lyckad återställning; knapp för omladdning och korrekt namn efter omladdning. Avvisad backup måste sakna förhandsgranskning och inte kunna återställas.
- Ordinarie `e2e/rg-integrated-release-acceptance.spec.ts` och äldre backup/restore-flöden ska passera utan ändrat bekräftelsekontrakt.
- Full Verify PWA på slutlig PR-head: lint, TypeScript, unit, build, singlefile och Playwright.

## Kvarvarande risk
Över flera IndexedDB-databaser finns ingen distribuerad transaktion. Avbrott och rollback är därför fortsatt en dokumenterad releasebegränsning, och manuell acceptans av Safari/iPad, VoiceOver och avbruten återställning återstår. Release är **NO-GO**.

## Föreslaget nästa UX-steg
UX-004 – gör analysens aktuella urval tydligare; separat PR med analysfilter, år, organisation och mått i kompakt sammanfattning utan förändring av beräkningslogik.
