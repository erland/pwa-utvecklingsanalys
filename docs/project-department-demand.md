# Projekt i avdelningsanalysen

## Beslut
Ett tvärgående projekt är ett separat, additivt planeringsobjekt. Importerat blad `Timmar per avdelning` fördelar samma projekttimmar alternativt över avdelningar; avdelningsuppgifterna får inte adderas på nytt ovanpå budgetens timmar.

## Leverans
- Läs samma avdelningsblad vid projektimport som vid UO-import, utan att projektet får en fiktiv UO-koppling.
- Spara källspårning (fil, blad, cell), års- och måttidentitet samt separat `planningType: 'project'` och id `project:...`. Äldre UO-observationer saknar typefältet och behandlas som UO.
- Avdelningsanalysens ingång får valen **Alla / UO / Projekt** och visar båda när Alla väljs. Avdelningsdrilldown visar källobjektets typ.
- Befintlig UO-specifik avdelningsanalys filtrerar bort projekt.
- Projekt utan avdelningsblad ger inget påhittat avdelningsbehov. En avdelning kan ha efterfrågan från samma UO och projekt, och deras värden är separata.
- Reimport/ersättning/radering använder befintlig källa- och återställningsjournal, som även rensar avdelningsobservationer per dataset.

## Kompatibilitet och fortsatt arbete
För att hålla den gamla semantiska datastrukturen bakåtkompatibel används fältet `uoId` som gemensamt planeringsobjekts-ID i avdelningsobservationerna. Projekt identifieras uttryckligt med `planningType='project'` och ett `project:`-prefix. Ett framtida större schemasprång kan ge fältet ett mer generiskt namn.

Utan avdelningsblad kan inte en projektbudget fördelas automatiskt per avdelning. Någon proportionalisering eller gissning införs inte.
