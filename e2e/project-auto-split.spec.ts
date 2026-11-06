import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('project source matrix automatically splits project parts and remains editable',async({page})=>{
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('UO Tot 2027-30');
 s.getCell('B1').value='Projekt: Digitalisering';
 s.getCell('D11').value=2027;
 s.getCell('B25').value='Gemensam informationshantering';
 s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=60;
 s.getCell('D4').value='Utv. 27';s.getCell('E4').value='Förv. 27';
 s.getCell('C5').value='IT timmar (th)';s.getCell('D5').value=0.036;s.getCell('E5').value=0.024;
 await page.addInitScript(()=>localStorage.removeItem('utvecklingsanalys:e2e-legacy-navigation'));
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({
  name:'digitalisering.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer:Buffer.from(await wb.xlsx.writeBuffer())
 });
 const feedback=page.getByRole('status',{name:'Importresultat'});
 await expect(feedback).toContainText('digitalisering.xlsx');
 await expect(feedback).not.toContainText('Inte importerad');

 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const analysis=page.locator('.canonical-analytics');
 await analysis.getByRole('combobox',{name:'Planeringstyp',exact:true}).selectOption('project');
 await analysis.getByLabel('period',{exact:true}).selectOption('2027');
 await analysis.getByLabel('Aktivitet för projekt och UO').selectOption('development');
 await expect(page.getByRole('region',{name:'Samlat planeringsbehov'})).toContainText('Totalt: 36 h');
 await analysis.getByLabel('Aktivitet för projekt och UO').selectOption('maintenance');
 await expect(page.getByRole('region',{name:'Samlat planeringsbehov'})).toContainText('Totalt: 24 h');

 await page.getByRole('button',{name:'Fördelningar',exact:true}).click();
 const allocations=page.getByRole('region',{name:'Projektfördelningar',exact:true});
 await allocations.getByRole('button',{name:/Utveckling \/ Förvaltning – projekt/}).click();
 await allocations.getByLabel('Projektfördelning år').selectOption('2027');
 await allocations.getByRole('region',{name:'Välj projekt att fördela'}).getByRole('button',{name:/Digitalisering/}).click();
 const row=allocations.locator('[aria-label="Fördelning Gemensam informationshantering it_hours 2027"]');
 await expect(row).toContainText('Automatiskt fördelad: 60 % Utveckling');
 await row.getByLabel('Utveckling procent Gemensam informationshantering 2027 it_hours').fill('40');
 await row.getByRole('button',{name:'Spara fördelning'}).click();
 await expect(row).toContainText('Sparad: 40 % Utveckling');
 await page.reload();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const refreshed=page.locator('.canonical-analytics');
 await refreshed.getByRole('combobox',{name:'Planeringstyp',exact:true}).selectOption('project');
 await refreshed.getByLabel('period',{exact:true}).selectOption('2027');
 await refreshed.getByLabel('Aktivitet för projekt och UO').selectOption('development');
 await expect(page.getByRole('region',{name:'Samlat planeringsbehov'})).toContainText('Totalt: 24 h');
});
