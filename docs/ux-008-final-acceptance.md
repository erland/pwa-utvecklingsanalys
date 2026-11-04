# UX-008 – Begripliga backupfel och slutlig UX-granskning

**Bas:** `main` `23c3f3d66fe29f99d328c77ae23f1fc83fc54c78`, efter mergad UX-007/PR #284.

## Verifierad brist

`PortabilityView` visar vid val av felaktig backup hela den tekniska orsaken direkt i statusen, till exempel `UNSUPPORTED_BACKUP_VERSION`, `ARCHIVE_TOO_LARGE` eller JavaScripts JSON-parserfel. En användare får då inte alltid veta vad som kan göras. Samma felstatus blandade tidigare samman två olika felklasser: ogiltig fil och att aktuellt projekt inte kan läsas.

## Avgränsad UX-ändring

1. Fel vid **val/validering** av backup översätts till begripliga svenska meddelanden och en rimlig nästa åtgärd för för stor fil, okänd version, saknat GZIP-stöd, trasig JSON samt ofullständigt arkiv.
2. Ursprungligt fel finns kvar i en separat expanderbar **Tekniska detaljer om den avvisade filen**.
3. Fel vid läsning av nuvarande projekt särskiljs från fel i vald backup.
4. Återställningsknappen förblir inaktiverad när validering eller läsning av aktuellt projekt misslyckas. Felstatus börjar fortsatt med **Filen avvisades**, så befintliga användbarhets- och tangentbordstester behåller sin kontrakt.
5. Validatorer, backupformat, integritetskontroll, rollback och återställningslogik ändras inte. UX-förändringen är endast presentation och tillstånd för felåterkoppling.

## Automatiska verifieringar

- `src/portability/backupSelectionError.test.ts`: felklasser, svensk förklaring, tekniskt original och generiska fel.
- `e2e/ux-008-backup-errors.spec.ts`: felaktigt JSON-arkiv, valideringskod, expanderbara detaljer och fortsatt spärrad återställning.
- Regressioner: `e2e/ux-003-backup-restore-guidance.spec.ts`, `e2e/keyboard-workflows.spec.ts` och övriga tester via full Verify PWA.

## Prioriterad manuell UX- och releaseacceptans (EJ UTFÖRD)

| Prioritet | Scenario | Miljö | Godkännandekrav |
| --- | --- | --- | --- |
| P0 | Säkerhetskopiering, validering, återställning och säker omladdning av syntetiskt projekt | Safari på Mac och iPad | Förhandsgranskning korrekt, avvisad fil kan inte återställas, bekräftat projekt går att öppna efteråt |
| P0 | Import av giltig och ogiltig XLSX, fördelning på UO/LO, låsta värden och massändring | iPad Safari stående och liggande | Tillstånd begripliga, inga oavsiktliga ändringar, knappar nåbara och beräkningar stämmer |
| P0 | Tangentbord/VoiceOver för navigation, återställningsdialoger, filval, statusmeddelanden och analys | Mac Safari + VoiceOver, iPad VoiceOver | Kontroller och värden annonseras förståeligt, fokus försvinner inte, inga fastnade dialoger |
| P1 | 200–400 % faktisk zoom och omflöde vid motsvarande skärmbredder | Safari och Chrome | Innehåll och kontroller bevaras, tabeller kan scrollas separat och tangentbordsfokus är synligt |
| P1 | Analysurval/diagram/tabeller och tillgänglighet i begränsat fönster | iPad Safari och iPhone Safari | Urval och resultat förblir begripliga, inga osynliga navigationssteg eller bortklippta kontroller |
| P1 | Begripligt språk, återhämtning vid skrivfel och flera öppna flikar | Mac/iPad | Felmeddelanden pekar mot verkliga åtgärder; ändringar i annan flik kräver säker omladdning |

**Protokoll per scenario:** datum, enhet/modell, operativsystem, webbläsare, commit, provdata, PASS/AVVIKELSE, reproduktionssteg och eventuell skärmbild. Kör endast på syntetiska testdata. Värdera därefter tidigare release-acceptans RG-01–RG-10 utifrån dokumenterat resultat; markera inte automatiskt PASS.

## Kvarvarande risk och nästa arbetssteg

Även efter grön Chromium-CI krävs riktig Safari/iPad-/VoiceOver-granskning och tidigare RG-01–RG-10. Det finns ingen atomisk transaktion över samtliga lokala databaser. Den här PR:en åtgärdar enbart backupfilens felåterkoppling; en generell revidering av alla felmeddelanden ligger utanför steget.

**Releasebeslut: NO-GO.** Ingen tagg, release eller automatisk merge.
