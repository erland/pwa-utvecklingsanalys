# CHANGE-026 – godkänd aktivitetsfördelning i modell v2 (domänsteg)

Inför en ren funktion för förhandsgranskning av UO:s utvecklings-/förvaltningstimmar fördelade på LO med LO-totaler som vikt.

**Skydd:**
- Samma källa, UO, år och timmått måste användas.
- En fullständig UO-matris krävs med både utveckling och förvaltning.
- LO-totalerna måste summera till matrisens total (max 0,0001 % numerisk tolerans).
- Fördelningen blockeras om ett LO redan har aktivitetsvärden i grundmaterialet.
- Blandade månads- och årsvärden avvisas i denna fas.
- Originalobservationer är oförändrade; godkända aktivitetsrader skapas endast som en beräknad projektion.
- Beslut innehåller fingeravtryck av berörda källobservationer; om underlaget ändras visas inte längre de tidigare godkända raderna.

**Nästa fas:** koppla regler och godkännandebeslut till ett användargränssnitt, spara dem i projektets kompletteringsregister och projektbackup, samt visa godkända beräknade delar i den nya v2-analysen. Denna PR lagrar inga beslut och ändrar inte befintliga v1-analyser.

Enhetstester kontrollerar bevarad totalsumma, uppdelning 600/400 över LO med vikter 700/300, konflikt med originalvärden, invalidation vid ändring, tidskonflikter och motivering.
