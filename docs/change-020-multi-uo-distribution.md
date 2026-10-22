# CHANGE-020 – Fördelningar för flera UO

Regler kan nu uttryckligen bindas till ett visst utvecklingsområde (`uoId`). Vid skapande väljer användaren UO och systemet använder endast dess egna LO, dess UO-källa för aktuellt mått/år/aktivitet och dess LO-detaljvärden som fördelningsvikter.

Fördelningsförslag beräknas separat per UO, och flera regler för samma informationskrav, år och aktivitet tillåts om de gäller olika UO. Befintliga regelkontroller mot saknade källvärden, manuella kompletteringar, dubbelräkning och ogiltiga fördelningsvikter behålls.

**Äldre regler:** Regler utan `uoId` fungerar fortfarande i projekt som bara har ett UO och behåller sina tidigare godkännandeavtryck. Om ett andra UO importeras blir äldre regler utan entydig UO-referens ogiltiga tills användaren skapar en uttryckligen avgränsad regel. Applikationen gissar aldrig vilket UO som avses.

Godkännandets signatur inkluderar `uoId` för nya regler. Källfingeravtrycket inkluderar det valda UO:t så att en ändrad UO-koppling kräver nytt godkännande. Projektbackup kontrollerar att refererat UO finns och har rätt objekttyp.

Regressionsfall omfattar två UO med olika LO och källvärden, bevarade totalsummor, felaktigt valt UO och äldre regler utan UO-val i flerkällprojekt.
