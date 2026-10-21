# DEV-010 – konfigurationspaket och versionshistorik

## Omfattning
Konfigurationsvyn exporterar JSON med format `utvecklingsanalys-config` version 1. Användaren kan välja fördelningstyper och mallprofiler separat. `definitions-only` tar bort årsvisa UO/LO-regler från exporten; `full-configuration` inkluderar även dessa regler. Ursprungliga Excelarbetsböcker, observationer och importerade person-/verksamhetsdata ingår inte i paketen.

Importen granskar schemaversion och datatyper, visar namnkollisioner och kräver uttryckligt val om befintliga definitioner ska ersättas. Okända schemaversioner och ogiltiga värden avvisas. Import av definitionspaket behåller lokala årsvisa regler där dimensionerna är kompatibla. Om dimensionernas kategori-ID ändras så att befintliga regler blir ogiltiga avvisas transaktionen.

Årsförslag skapar kopior av existerande fördelningsregler för ett annat år. Befintliga målårsregler skrivs inte över.

## Transaktioner och återställning
Efter initialisering sker förändringar av fördelningstyper och mallprofiler i den **gemensamma konfigurationsdatabasen** `utvecklingsanalys-configuration`. Aktuell konfiguration och revisionspost lagras i **samma IndexedDB-transaktion**. Optimistisk revisionskontroll förhindrar att en parallell ändring obemärkt skriver över någon annans lokala förändring. Återställning skapar en ny revisionspost.

Befintliga inställningar från tidigare versionsseparerade databaser läses in första gången konfigurationsvyn öppnas och sparas i det nya lagret. Detta gäller **inte** migrering av samtliga observationer, projektöversikter, scenarier och importutkast: dessa lagras fortsatt i andra databaser. Fullt atomära transaktioner **mellan olika IndexedDB-databaser stöds inte**; en framtida samlad projektlagring kräver att alla relevanta data flyttas till en gemensam databas och objektbutiker. Detta är kvarstående arbete, inte ett löfte om att befintliga importer är atomära.

## Avgränsning
Paketet omfattar i DEV-010 mallprofiler och fördelningstyper men ännu inte scenariounderlag, processtaxonomier eller kompletta projektbackuper. Projektbackup, export/import av observationsdata, migrering mellan framtida schemaformat och tillgänglighetskontroller omfattas av DEV-011. Import av en ny konfiguration kräver att berörda vyer öppnas igen för att läsa uppdaterade inställningar. Ändringar i samma webbläsarprofil räknas inte som säkerhetskopiering till en annan enhet.

## Verifiering
Enhetstester täcker roundtrip, schemaavvisning, definitions-only, konflikter, uttryckligt ersättningsbeslut och årsregelkopiering. Webbläsartest med Chromium kontrollerar validerad import och återställning som en ny revision efter omladdning.
