# CHANGE-062 – säkra direktimport före borttagning av gamla vyn

Vid granskning inför avveckling av den konfigurerbara importpanelen upptäcktes att direktimportens tabellgren hade ett felaktigt reguljärt uttryck för filändelsen `.xlsx`. Det gjorde att vanliga process- och personalfiler avvisades trots att deras format hade identifierats.

Den här ändringen reparerar kontrollen och lägger till regressionstester som kontrollerar **hela direktimportgrenen fram till anropet för att spara en tabellkälla**, inte bara formatparsern.

Den tidigare panelen behålls avsiktligt i detta steg: befintliga webbläsartester verifierar ett separat arbetsflöde med aktivering av aktivitetsmatris och ny källgranskning. Att ta bort den innan direktimporten har stöd för dessa fall skulle innebära en funktionell regression.

Fortsatt arbete: lägg till automatisk men säkert validerad hantering av aktivitetsmatrisen för UO-formatet, migrera end-to-end-fallen och inför en separat säker hantering av gamla utkast. Därefter kan panelen och mappningsinställningarna tas bort helt.
