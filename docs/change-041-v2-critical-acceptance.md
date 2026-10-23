# CHANGE-041 – kritiska v2-regressioner

Utökar CHANGE-040 med automatiserade domänacceptansfall. `canonicalCriticalAcceptance.test.ts` använder faktiska funktioner i den kanoniska analysmotorn, men bygger testdata direkt i minnet; det är **inte** ett separat Playwright-flöde genom kompletteringsgränssnittet.

| Fall | Syfte | Förväntat |
|---|---|---|
| A1 | UO + LO + datakälla + år | Snitt av filtren, aldrig summering av orelaterade UO |
| A2 | Avdelningsaxel och källfilter | Avdelningsredovisning separat från UO/LO |
| A3 | Godkänd utveckling/förvaltning | 600 + 400 och total 1 000; inga dubbla aktivitetsmatriser |
| A4 | Ändrad källa efter godkännande | Inaktuell fördelning används inte; omprövning krävs |
| A5 | Årsserie med LO- och källfilter | 2027 och 2028 baserat enbart på relevanta observationer |

## Öppet innan äldre analys avvecklas

- Verkligt UI-flöde för att skapa, godkänna och ompröva aktivitetsfördelningar
- Kombinerade filter och avdelningsredovisning i Playwright, inte bara i domäntester
- Responsiv mobilvy, tangentbordsnavigering och skärmläsartillgänglighet
- Produktionsmallar och återställning av verkliga backupfiler

CI PASS på denna PR är därför **inte** ett godkännande att avveckla den äldre analysen.
