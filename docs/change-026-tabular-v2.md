# CHANGE-026 – avdelningstabeller i v2

En godkänd tabellimport med objekttyp **Avdelning** och måttet IT-timmar eller verksamhetstimmar skapar nu även ursprungsobservationer i `canonical-v2`. Varje observation behåller år, källblad, källcell och matchad avdelningsidentitet. Aktivitet anges som *unknown* tills fördelning mellan utveckling och förvaltning är känd.

Ny tabellimport och ersättning av tabellkälla går genom befintlig journalförd källmutation. Källborttagning, v3-backup och rollback omfattar redan v2-lagret.

Process- och personaluppgifter (FTE och headcount) importeras fortfarande till v1, eftersom v2-kontraktet ännu saknar dessa mått och en processaxel. Ingen falsk konvertering görs och den befintliga huvudanalysen använder fortsatt v1.

## Nästa steg

Kompletteringsflödet för aktivitetsandelar, inklusive UO→LO och avstämning mot originalvärden, samt den slutliga övergången till en gemensam v2-analys återstår.

## Tester

Enhetstest av avdelningssiffror, källproveniens, matchningsbeslut, avgränsning av icke-stödda tabeller, negativa timmar och dubbla totaler. CI kör fullständiga bygg- och browserregressioner.
