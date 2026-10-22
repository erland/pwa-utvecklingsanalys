# CHANGE-019 – Godkända manuella kompletteringar

## Syfte
Tillåt användaren att uttryckligen godkänna, återkalla och godkänna om tidigare registrerade manuella kompletteringar. Precis som fördelningsreglerna ska dessa redovisas separat från importerade originaldata och aldrig tyst adderas till huvudanalysens totalsumma.

## Genomförande
- Godkännande sparar koppling till kompletteringens nyckel, aktuella versionsstämpel och godkännandedatum.
- Ändras värdet, motiveringen eller statusen för kompletteringen efter godkännandet blir det tidigare godkännandet **inaktuellt**.
- Ett godkännande är ogiltigt om krav/objekt inte längre finns, om motsvarande originalobservation tillkommer eller om samma kombination ingår i en redan godkänd fördelning.
- Två manuella godkännanden som gäller samma mått, objekt, år och aktivitet får inte räknas dubbelt.
- Den separata kompletterade analysen får godkända manuella värden inklusive **noll**, men huvudanalysens importerade summeringar förblir orörda.
- Godkännanden ingår i det befintliga lokala kompletteringsregistret som redan omfattas av projektbackup och återställning.
- Äldre projektbackuper utan manuella godkännanden fortsätter fungera.

## Avgränsning
Denna PR implementerar ett **sammanhängande** godkännandeflöde för manuella värden. Flera UO i proportionella fördelningsregler, avancerade diagram och fullständig kompositanalys av blandade ursprung/kompletteringar genomförs som separata förändringar.

## Testning
Regressions- och Chromiumtester kontrollerar manuellt nollvärde, godkännande, föråldrade versioner, återkallning, överlapp med originaldata, dubbla krav och oförändrade importsummeringar.
