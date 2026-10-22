# CHANGE-021 – Återställ data och konfiguration

En användare kan nu återställa **data**, **konfiguration** eller **allt** via Inställningar.

- **Data:** projektinformation, importerade observationer, utkast, planering, kompletteringskrav/-beslut och käll-/återställningsjournaler. Mallprofiler, gruppmodeller och konfigurationsrevisioner bevaras.
- **Konfiguration:** aktuella inställningar och revisionshistorik, mallprofiler, gruppmodeller och äldre fördelningsinställningar. Projektets källdata och kompletteringar bevaras.
- **Allt:** båda grupperna av lokal information tas bort och applikationen laddas om till samma initialiseringslogik som för en ny installation.

Återställningen sker endast för en uttrycklig lista med applikationens egna IndexedDB-databaser och objektlager. Den raderar inte annan lokal lagring i webbläsaren eller andra webbapplikationer. Användaren måste ange **ÅTERSTÄLL** och kan ladda ner en projektbackup innan åtgärden. Vid rensningsfel stannar processen och ett tydligt felmeddelande visas; en återställning över separata databaser är inte en atomisk transaktion.

Återställning av enbart konfiguration kan lämna kvar data som tidigare kompletterades med vissa konfigurationsregler. Applikationen skapar då nya standardinställningar, inte gamla användardefinierade konfigurationer. En äldre backup kan användas för att återställa hela projektet. Rensningen avser inte serviceworker-cache, sparad installationsstatus eller andra webbläsarinställningar som ligger utanför projektets IndexedDB.

Tester kontrollerar urvalet av databaser samt full återställning i Chromium med en separat, orelaterad IndexedDB som måste bevaras.
