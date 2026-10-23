# CHANGE-059 – Tvåkolumnsimport av antal anställda

Ett separat importformat för Excel-blad med kolumnerna **Avdelning** och **Antal anställda**. Kalkylbladets namn måste innehålla exakt ett tydligt år, exempelvis `Bemanning 2027`.

Importen kräver icke-negativa heltal och hanterar varken formler eller odaterade observationer. Ett blad som saknar år, eller har flera olika år i namnet, identifieras inte som detta format och kan inte direktimporteras. Formatmodulen äger både identifiering och parserregler och är registrerad i det befintliga formatregistret.

Regressionsfall omfattar giltigt format, saknat/tvetydigt år, negativa eller brutna antal och beräknade formelvärden.

Den gamla konfigurerbara importvyn lämnas kvar i detta steg. Nästa steg bör vara att säkra bakåtkompatibilitet för befintliga utkast och källbyten före avveckling av importgranskningen.
