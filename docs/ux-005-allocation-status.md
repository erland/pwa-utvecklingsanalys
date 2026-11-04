# UX-005 – Tydlig LO-status och konsekvenser vid massändring

**Bas:** `main` `7c2c96905f0cdf4eaa0574bc2d5988bd2131ec91`, efter mergad UX-004/PR #281.

## Direkt verifierbart problem
I `BuiltInAllocations.tsx` kunde användaren se importerade UO-data och LO-reglage utan tydlig förklaring av om ett LO-värde var en låst import, ett automatiskt förslag eller en sparad egen ändring. Massändringens bekräftelse gav ingen förhandsberäkning av antal redigerbara/låsta LO, trots att den existerande motorn stoppar kombinationen av låsta och redigerbara LO inom samma UO-underlag.

## UX-förändring
1. Varje LO-kort får en kort status med stödtext: **Importerad · låst**, **Manuellt justerad · sparad**, **Sparad fördelning** eller **Automatiskt föreslagen**.
2. Status utgår från existerande source previews och giltiga (fingerprint-matchade) beslut; en inaktuell tidigare justering ska inte felaktigt markeras sparad.
3. Bekräftelsen för **Massändra LO till UO-fördelningen** visar valt UO, period, antal underlag samt antal redigerbara och låsta LO. Informationen förklarar att befintliga egna LO-justeringar kan ersättas.
4. Om alla LO är låsta eller en källa har blandade låsningar visas anledningen och bekräftelseknappen avaktiveras, i linje med existerande `bulkMatchUo`.

**Scope:** enbart UI-status och förhandsinformation för de *inbyggda* fördelningarna. Själva balanserings-, låsnings-, spar- och årsurvalsreglerna ändras inte; valfria fördelningstyper har separat UI och ingår inte i detta steg. Detta är en `ux_change`, inte en beteendebevarande refaktorering.

## Verifiering
- `src/allocations/allocationUxStatus.test.ts`: låst, föreslagen, sparad och manuellt justerad LO-status, inaktuella beslut och bulkförhandsgranskning med och utan låsning.
- `e2e/ux-005-allocation-status.spec.ts`: importera syntetisk budget med två LO, kontrollera status och förhandsgranskning, avbryt massändring.
- Regressioner bland annat `e2e/dev-205-bulk-builtins.spec.ts`, `e2e/change-078-adjusted-allocation.spec.ts` och `e2e/allocations.spec.ts`.
- Full `Verify PWA` på slutlig PR-head krävs före merge (lint, TypeScript, Vitest, byggen, singlefile, Playwright).

## Kvarvarande risk och nästa steg
Det här ersätter inte manuella iPad-/VoiceOver-tester eller numerisk acceptans av samtliga fördelningar. `RG-01–RG-10` återstår och release är fortsatt **NO-GO**. Nästa steg är UX-006: riktad tillgänglighets-, iPad- och språkgranskning, där automatiska tester kompletteras av dokumenterade manuella kontroller.
