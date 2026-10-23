# CHANGE-055 – automatisk direktimport, steg 1

Första leveransen av ett förenklat importflöde för redan registrerade format.

- Ny enkel filväljare för flera Excel-filer och resultat per fil utan konfiguration, förhandsgranskning eller manuell godkännandeknapp.
- Endast registrerade format accepteras: för närvarande `UO Tot 2027-30`.
- Varje fil valideras innan lagring; okända/ogiltiga filer avvisas och ändrar inte befintliga källor.
- Varje framgångsrik fil skrivs via befintlig källjournal och får ett eget käll-ID. Andra filer i samma omgång fortsätter om en fil misslyckas.
- Den gamla importpanelen finns temporärt kvar under den nya importfunktionen för äldre tabellformat samt pågående utkast, granskningar och källbyten. Den ska avvecklas först efter att motsvarande format och testfall flyttats till den nya importmotorn.

## Säkerhetsavgränsningar

Numeriska detaljformler beräknas inte. Detaljvärden med fel avvisas. Årsmatrisens alternativa aktivitetsfördelningar aktiveras **inte** automatiskt i detta första steg, så att risk för dubbelräkning undviks. Befintliga källor ersätts aldrig implicit vid ny import.

## Nästa steg

Flytta de befintliga tabellformaten till fristående kodbaserade moduler med explicita detektionsregler och identitetsvalidering. Följ sedan upp med att ta bort den gamla konfigurerbara importpanelen och använda den nya, enkla vyn som enda importflöde.
