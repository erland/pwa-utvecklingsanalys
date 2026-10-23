# CHANGE-060 – säker ersättning genom direktimport

Importvyernas gamla konfigurerbara ersättningsflöde kan inte tas bort förrän direktimporten kan ersätta en befintlig källa utan att skapa ytterligare en källa eller lämna kvar tidigare observationer.

Detta steg använder `replaceImportedSource` för båda typer av registrerade format (UO-budget och tabell). Därmed återanvänds projektets befintliga återställningsjournal över projekt, semantiska observationer, kanoniska observationer och importutkast. Källans ID bevaras vid lyckad ersättning, och misslyckad validering ändrar inte den gamla källan.

- I ersättningsläge accepteras exakt **en** fil.
- Identitetskontroller för tabellformat körs före lagring.
- Utanför ersättningsläge fortsätter den befintliga flerfilsimporten som tidigare.
- Den äldre importvyn tas **inte** bort i samma kodändring, eftersom befintliga Playwright-flöden och äldre utkast först behöver hanteras och testas separat.

Nästa steg är att flytta den befintliga källtabellen och borttagningsdialogen till en ren importvy och tillhandahålla en återhämtningsväg för gamla utkast, utan mappning och preview. Därefter kan den äldre panelen avvecklas.
