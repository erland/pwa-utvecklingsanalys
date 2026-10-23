# CHANGE-051 – migrations- och återgångsplan för analys v2

**Status:** Planförslag. Ingen avveckling godkänd eller genomförd.

## Steg 0 – Baslinje och ansvar

- Fastställ verksamhetsansvarig och teknisk beslutsägare.
- Frys en identifierbar release/commit av parallellvyerna som återgångspunkt.
- Kontrollera GitHub Actions, inklusive CHANGE-040–050. Dokumentera specifik commit och testresultat.
- Samla syntetiska regressionsunderlag i repo; förvara eventuella verkliga testunderlag lokalt och säkert, inte i offentligt GitHub-repo.

## Steg 1 – Verksamhetsverifiering

- Testa minst två operativa UO, två stöd-/plattforms-UO och en blandad uppsättning med flera LO, avdelningar och perioder.
- Kontrollera timmått och kostnadsmått separat samt fil- och organisationsfilter.
- Jämför källa → kanoniskt värde → tabell, diagram och CSV. Dokumentera för varje urval total, källpostantal, undantagna alternativ och täckningsstatus.
- Klassificera avvikelser som **defekt**, **avsiktlig semantisk förändring** eller **kvarvarande funktionsbehov**. Godkänn aldrig numerisk paritet där tolkningarna skiljer sig.
- Kör navigering, tangentbordsanvändning, mobil porträttläge och bred grupp × år-tabell.

## Steg 2 – Skydda projektdata

1. Exportera full projektbackup (JSON, alternativt GZIP) från aktuell applikation innan förändring.
2. Kontrollera att backupen är validerbar och sparas säkert.
3. Återställ i en separat webbläsarprofil; jämför kanoniska analysvärden, godkännanden och dokumenterade urval.
4. Behåll säkerhetskopian och möjligheten att köra tidigare release. Var försiktig med IndexedDB-schemaändringar; en äldre release får inte antas förstå nyare lagrat data.
5. Kontrollera att åtgärder för återgång inte raderar befintliga källor eller ersätter ett projekt utan bekräftelse.

## Steg 3 – Beslutspunkt GO / NO-GO

**GO kräver:** grön CI på utpekad commit, godkända referensfall, inga blockerande avvikelser, återställningsövning, tillgänglighetskontroll och dokumenterat godkännande av beslutsägaren.

**NO-GO vid:** saknade/otillförlitliga värden, felaktig dubbelräkning, utebliven källspårbarhet, godkännanden som överlever förändrat underlag felaktigt, omöjlig återställning eller blockerande tillgänglighetsbrister.

Registrera beslut, datum, ansvarig, accepterade kända avvikelser och verifierad återgångsrelease.

## Steg 4 – Kontrollerad avveckling (separat framtida PR)

- Visa tydligt vilken analys som är målmodellen och informera om relevanta semantiska förändringar.
- Flytta eller dokumentera användarnas sparade urval och arbetsflöden, i den mån de stöds.
- Ta bort äldre analyskomponenter först efter GO. Behåll historiska backupformat/migreringskod och nödvändiga kompatibilitetstester.
- Validera på nytt att import, återkallelse, källbyte, exporter, mobilt läge och återställning fungerar.
- Uppdatera användardokumentation och arkitekturbeslut.

## Återgång vid fel

1. Stoppa utrullningen, bevara felande projektbackup och diagnostik utan känsliga uppgifter.
2. Återgå till dokumenterad fungerande applikationsrelease.
3. Använd separat exporterad projektbackup för att återställa ett kompatibelt dataläge; skriv inte blint över aktuell IndexedDB.
4. Bekräfta att äldre och kanonisk analys ger förväntade baslinjer före fortsatt användning.
5. Registrera felorsak och förnyad acceptans innan ett nytt GO-beslut.

## Spårbarhet

- Arkitekturbeslut: `docs/adr/001-v2-analysis-transition.md`
- Acceptanskriterier: `docs/change-050-v2-migration-acceptance.md`
- Tidigare funktionsparitet: `docs/change-034-v2-analysis-parity.md`
