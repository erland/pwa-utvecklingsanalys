# CHANGE-026 – granskningsflöde för aktivitetsfördelningar (v2)

Under **Kompletteringar** finns en separat v2-vy där man väljer godkända källor/UO/år/timmått och skapar proportionalitetsregler. Regeln visar LO-värden för utveckling och förvaltning, kräver godkännandemotivering, och kan godkännas eller återkallas.

Regler och beslut lagras i GapState, och följer med befintlig projektbackup version 3. Backuper validerar identiteter och beslutsmotiveringar. Beslut lagras som källfingeravtryck, inte som modifierade originalvärden. Efter förändrad import blir ett tidigare beslut automatiskt inaktuellt, och godkända beräknade rader returneras inte förrän beslutet granskats igen.

## Avgränsning

Denna PR ansluter inte v2-projektionen till huvudanalysen. Den fortsätter läsa v1. Inga härledda rader skrivs till datakällornas originalvärden. Kompletteringen kräver hittills exakt avstämda LO- och UO-totaler och avvisar månad/år-blandning. Senare behövs en redovisning av ofullständig aktivitetstäckning och en användardriven konfliktlösning för differenser.

## Verifiering

Utöver tidigare tester för motorns fingeravtryck, avstämning och invarianta totaler tillkommer backup-roundtrip av regel- och beslutsunderlag, inklusive avvisning av felaktiga beslut.
