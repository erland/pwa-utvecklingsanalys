import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

/** Synthetic workbooks verify the actual Import → Fördelningar → Analys pipeline. */
async function workbook(kind:'uo'|'project'){
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value=kind==='uo'?'UO: Infrastruktur':'Projekt: Digitalisering';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value=kind==='uo'?'LO 1':'Gemensam informationshantering';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=kind==='uo'?40:60;
 if(kind==='project'){
  sheet.getCell('Q11').value='ÅRSBEHOV 2028';
  sheet.getCell('Q26').value=30;
  sheet.getCell('C28').value='OMK Övrigt (kr)';
  sheet.getCell('D28').value=200;
 }
 return {name:kind+'.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())};
}

test('release: imported UO and independent project stay additive after a saved project split and reload',async({page})=>{
 await page.addInitScript(()=>localStorage.removeItem('utvecklingsanalys:e2e-legacy-navigation'));
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles([await workbook('uo'),await workbook('project')]);
 await expect(page.getByRole('status').filter({hasText:'uo.xlsx'})).toContainText('importerad');
 await expect(page.getByRole('status').filter({hasText:'project.xlsx'})).toContainText('importerad');

 // All planning volume includes both types, but no activity is silently assumed.
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const analysis=page.locator('.canonical-analytics');
 await analysis.getByLabel('Planeringstyp').selectOption('all');
 await analysis.getByLabel('period',{exact:true}).selectOption('2027');
 const panel=page.getByRole('region',{name:'Samlat planeringsbehov'});
 await expect(panel.getByRole('table',{name:'Summering UO och projekt'})).toContainText('Infrastruktur');
 await expect(panel.getByRole('table',{name:'Summering UO och projekt'})).toContainText('100 h');
 await analysis.getByLabel('Planeringstyp').selectOption('project');
 await expect(panel).toContainText('Totalt: 60 h');
 await analysis.getByLabel('Aktivitet för projekt och UO').selectOption('development');
 await expect(panel).toContainText('Totalt: 0 h');
 await expect(panel).toContainText('Ofördelat: 60 h');

 // The allocation is saved in Fördelningar, not in an independent analysis editor.
 await page.getByRole('button',{name:'Fördelningar',exact:true}).click();
 const allocations=page.getByRole('region',{name:'Projektfördelningar'});
 await allocations.getByRole('button',{name:/Utveckling \/ Förvaltning – projekt/}).click();
 await allocations.getByLabel('Projektfördelning år').selectOption('2027');
 await allocations.getByRole('region',{name:'Välj projekt att fördela'}).getByRole('button',{name:/Digitalisering/}).click();
 const row=allocations.getByRole('region',{name:'Fördelning Gemensam informationshantering it_hours 2027'});
 await row.getByLabel('Utveckling procent Gemensam informationshantering 2027 it_hours').fill('60');
 await expect(row).toContainText('Förhandsvisning (ej sparad): Utveckling 36 h');
 await row.getByRole('button',{name:'Spara fördelning'}).click();
 await expect(row).toContainText('Sparad: 60 % Utveckling');
 await expect(allocations).toContainText('Ofördelat: 0 h');

 // The same persisted decision must drive the analysis after a reload.
 await page.reload();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const refreshed=page.locator('.canonical-analytics');
 await refreshed.getByLabel('Planeringstyp').selectOption('project');
 await refreshed.getByLabel('period',{exact:true}).selectOption('2027');
 await refreshed.getByLabel('Aktivitet för projekt och UO').selectOption('development');
 const selected=page.getByRole('region',{name:'Samlat planeringsbehov'});
 await expect(selected).toContainText('Totalt: 36 h');
 await refreshed.getByLabel('Aktivitet för projekt och UO').selectOption('maintenance');
 await expect(selected).toContainText('Totalt: 24 h');
 await refreshed.getByLabel('Aktivitet för projekt och UO').selectOption('all');
 await expect(selected).toContainText('Totalt: 60 h');
 await refreshed.getByLabel('Planeringstyp').selectOption('all');
 await expect(selected).toContainText('Totalt: 100 h');
});
