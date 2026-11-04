# UX-001 – Tydlig sparstatus för projektnamn

**Utgångsläge:** `main` `f19a633a1913e1915e50cb2c92eba27794592536` efter mergad PR #277; [Verify PWA](https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41779099476) är godkänd.

## Problem och UX-evidens

I `src/App.tsx` sparades projektnamnet vid varje tangenttryckning via `useProjectWorkspace.updateName`, men utan någon synlig indikation om att skrivningen väntade eller hade avslutats. Ett fel visades som en generell lagringsvarning utan tydlig möjlighet att försöka spara det aktuella namnet på nytt. Problemet är **direkt verifierbart i kod**; hur ofta användarna upplever osäkerhet är däremot en hypotes som bör följas upp.

## UX-förändring

- Under fältet **Namn på lokalt projekt** visas status med `aria-live="polite"` (utan extra `role="status"`, för att inte skapa tvetydiga statusregioner för andra funktioner): *Sparar projektnamn…*, *Projektnamnet är sparat.* eller *Projektnamnet kunde inte sparas.*
- Vid fel visas **Försök spara igen**, som sparar det nuvarande namn som visas, utan att tvinga fram ett nytt tangenttryck.
- En monoton versionsräknare ignorerar sena resultat från tidigare skrivförsök. Detta är viktigt eftersom `saveProject` serialiserar IndexedDB-skrivningar; bara den senaste användarredigeringen får rapportera sparat/fel.
- Lagringsformat, importflöde, navigation och hur namnet uppdateras i rubriken är oförändrade. Inget debouncing- eller spara-på-blur-beteende införs.

## Verifiering och acceptans

- Nytt `e2e/ux-001-project-save-feedback.spec.ts` kontrollerar snabba redigeringar, sista sparade värde efter sidomladdning, simulering av misslyckat IndexedDB-`put`, visat fel och lyckad återhämtning.
- Befintligt `e2e/kf-005-project-lifecycle.spec.ts` testar tidigare sparnings- och navigationsbeteende.
- Full `Verify PWA` ska vara grön på den slutliga PR-headen före merge.

## Avgränsning

Detta är en **UX-förändring** och berör enbart projektnamnet i Inställningar. Sparstatus för import, gruppmodeller, fördelningar och backup ingår inte. Systemet har fortfarande lokala, separata datalager och manuell releaseacceptans RG-01–RG-10 återstår.

## Nästa steg

**UX-002:** förbättra importresultatens tydlighet och vägledning till nästa åtgärd, utan att ändra själva Excel-importens beräkningar. Manuella iPad-/VoiceOver-tester behövs för slutligt UX-godkännande.

**Release:** fortsatt NO-GO tills formell manuell acceptans är dokumenterad. Ingen tagg eller release ska skapas här.
