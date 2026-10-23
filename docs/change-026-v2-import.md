# CHANGE-026 – Kanoniskt v2-importunderlag, fas 1

Fasen introducerar en deterministisk omvandlare av godkända UO-budgetfakta till det nya `CanonicalDataset`-kontraktet. LO-timmar blir rapporterade totaler med okänd aktivitet, medan utvecklings-/förvaltningsmatrisen blir aktivitetsdelar på UO-nivå. Avdelningstimmar stöds som ett **separat importargument**, med egen redovisningsaxel; själva Excelmappningen för avdelningar återstår.

`canonicalFromBudget` arbetar rent och oförstörande och behåller alla källceller. `replaceCanonicalSource` gör ny import av samma källa idempotent. `canonicalStore` skapar ett versionsseparerat IndexedDB-lager som också rensas av projektets data-/fabriksåterställning.

En viktig regel i v2-summeringarna: när samma importerade källa innehåller LO-totaler och UO:s aktivitetsmatris ska UO-matrisen inte adderas till LO-totalerna vid beräkning av **alla timmar**.

## Avgränsning och efterföljande anslutning

Detta är den första av två säkra anslutningsfaser för import. Ännu sker ingen automatisk v2-skrivning från den befintliga importguiden eftersom nuvarande källers livscykel (ersätt, radera), avbrottsåterställning och projektbackup ännu bara hanterar v1. Den integrationen måste genomföras samlat så att vi inte får två lokala källor som glider isär vid fel. Även avdelningssektionens grafiska Excelmappning och godkända kompletteringar i v2 är kvar att implementera.

Gamla projektdata konverteras inte. Äldre analyser läser fortfarande den befintliga modellen. Ingen användare bör betrakta v2-lagret som färdigt analysunderlag förrän integrationen och backupen är verifierade.

## Verifiering

Enhetstester för identitet, återimport, UO-aktiviteter, avdelningsperspektiv, avvikande/negativa källvärden och förhindrad dubbelräkning. Ordinarie GitHub CI för typkontroll, enhetstest, vanlig och single-file-byggnation samt browserregression.
