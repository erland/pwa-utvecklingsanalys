# DEV-008 – användardefinierade fördelningar

En fördelningstyp består av namngivna kategorier och en vald beräkningsbas: manuell vikt, verksamhetstimmar, IT-timmar, FTE eller antal anställda. Fördelningar anges per år. UO-förslag ärvs av tillhörande LO om det inte finns någon uttrycklig LO-överstyrning.

## Regler
- Kategoriandelar måste vara ändliga tal 0–100. Summan får aldrig överstiga 100 %.
- Om summan är mindre än 100 % visas återstoden som **ofördelat**; appen normaliserar inte bort den.
- LO-överstyrning **ersätter**, inte adderas till, UO-förslaget. Detta undviker en cirkulär/arvsmässig extra beräkningsnivå.
- Viktad summering sker en gång per LO-ID. Dubblettvikter, negativa och ogiltiga vikter avvisas.
- För vald bas kan vikter föreslås från importerade LO-observationer samma år. Bara detaljer inkluderas och samma källcell dedupliceras. Snapshotmått som FTE och antal anställda blockeras om mer än ett distinkt värde finns per LO och år. Användaren kan justera vikterna manuellt.
- Resultaten visar både kategoriandelar, viktade mängder och återstående ofördelad vikt.
- Regeländringarna lagras lokalt med källa `user`. Framtida importer/exporter av konfigurationspaket och fullständigt ändringsregister ingår i DEV-010.

## Avgränsningar
Den första versionen hanterar endast ett arvsteg från UO till LO, inte godtyckliga hierarkiska regelkedjor. De importerade vikterna används som utgångsvärden och ingår inte i en automatiskt uppdaterande, låst rapportberäkning. Fördelningsreglernas validitet avser kalenderår och har ännu inga egna från-/tilldatum inom året.
