# UX-007 – Begriplig diagnostik för fördelningar

**Bas:** `main` `edd2ca042d22ea7b24ef271f43dcba76ce917400`, efter mergad UX-006/PR #283.

## Problem och konkret evidens
I `src/analytics/CanonicalAnalytics.tsx` visades tekniska diagnostikkoder (t.ex. `AUTO_ALLOCATION_FAILED` och `STALE_OR_INVALID_APPROVAL`), identifierare och ibland engelska felorsaker direkt för användaren. Användaren fick ingen konsekvent förklaring av vad som behöver kontrolleras eller vad nästa steg är.

## Genomförd, avgränsad UX-förändring
- Varje av de fyra definierade diagnostikkategorierna har en lättläst svensk rubrik, förklaring och **Nästa åtgärd**.
- Analysens diagnostik behåller den existerande sammanfattningen **Diagnostik för fördelningar (antal)**, men visar svensk status per UO/år/mått först.
- Under **Tekniska detaljer** finns fortfarande ursprunglig felkod, källa och orsak. Dessa har inte modifierats, bortfiltrerats eller gömts permanent.
- Diagnostikens datamodell, beslutsregler, avstämning, import och analysberäkningar är helt oförändrade.
- Ren formatteringsfunktion i `src/analytics/allocationDiagnosticHelp.ts`, med typad switch över den existerande felkodsuninen i `AllocationDiagnostic`.

## Verifiering
- `src/analytics/allocationDiagnosticHelp.test.ts`: samtliga fyra koder ska få svensk vägledning med tydlig åtgärd; alla fyra måttnamn ska presenteras i svenska termer.
- Full `Verify PWA` på PR-head: ESLint, TypeScript, Vitest, produktion, singlefile och Playwright, inklusive gamla analys-/import-/fördelningsregressioner.
- Något fysiskt användartest eller VoiceOver-test har inte genomförts; automatisk testning bekräftar inte att varje formulering förstås av faktiska användare.

## Nästa steg och kvarvarande risk
UX-007 omfattar **diagnostik i analysvyn**, inte en generell omöversättning av samtliga felkoder i appens samtliga moduler. En efterföljande granskning kan inventera importer-, backup- och lagringsfel med verkliga reproduktionssteg. Manuella RG-01–RG-10, Safari/iPad och VoiceOver återstår.

**Releasebeslut: NO-GO.** Ingen merge, tagg eller release genomförs automatiskt.
