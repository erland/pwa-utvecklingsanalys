import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('CHANGE-040 v2 end-to-end: import, UO groups, filters, charts and CSV',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';
 sheet.getCell('D11').value=new Date(2027,0,1);
 sheet.getCell('E11').value=new Date(2028,0,1);
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=42;
 sheet.getCell('E26').value=18;
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#import-files').setInputFiles({name:'v2-acceptance.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await page.getByRole('button',{name:'Godkänn import'}).click();
 await expect(page.getByRole('status')).toContainText('Importen godkänd');

 await page.getByRole('button',{name:'Grupper',exact:true}).click();
 await page.getByRole('button',{name:'Ny gruppmodell'}).click();
 await page.getByLabel('Modellnamn').fill('V2-testmodell');
 await page.getByRole('button',{name:'Lägg till grupp'}).click();
 await page.getByLabel('Gruppnamn').fill('Operativa UO');
 await page.getByLabel('UO A').check();
 await page.getByRole('button',{name:'Spara gruppmodeller'}).click();
 await expect(page.getByRole('status')).toContainText('Gruppmodeller sparade');

 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const v2=page.locator('.canonical-analytics');
 await expect(v2.locator('.canonical-result-head strong')).toContainText('60 h');
 await v2.getByLabel('V2 UO-gruppmodell').selectOption({label:'V2-testmodell'});
 await expect(v2.getByRole('table',{name:'V2 analysresultat'})).toContainText('Operativa UO');

 await v2.getByLabel('V2 resultatgruppering').selectOption('year');
 const yearTable=v2.getByRole('table',{name:'V2 analysresultat'});
 await expect(yearTable).toContainText('2027');
 await expect(yearTable).toContainText('2028');
 await expect(yearTable).toContainText('42 h');
 await expect(yearTable).toContainText('18 h');
 await v2.getByLabel('V2 tidsdiagramtyp').selectOption('lines');
 await expect(v2.getByRole('img',{name:'Trendlinjer för v2-mått'})).toBeVisible();
 await v2.getByLabel('Diagramtyp för v2-fördelning').selectOption('pie');
 await expect(v2.getByRole('img',{name:/Cirkelfördelning v2, total 60 h/})).toBeVisible();
 await expect(v2.locator('.pie-legend')).toContainText('2027');

 const downloadPromise=page.waitForEvent('download');
 await v2.getByRole('button',{name:'Exportera v2-analys som CSV'}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('v2-analys.csv');
 const content=await (await import('node:fs/promises')).readFile(await download.path(),'utf8');
 expect(content).toContain('"Årstrend";"2027"');
 expect(content).toContain('"Årstrend";"2028"');
 expect(content).toContain('"Årsjämförelse";"2027";"2028"');
 expect(content).toContain('"Organisationsdel";"";"";"2027";"42";"h"');

 await v2.getByLabel('V2 period').selectOption('2027');
 await expect(v2.locator('.canonical-result-head strong')).toContainText('42 h');
 await v2.getByLabel('V2 aktivitet').selectOption('development');
 await expect(v2.getByText('Ofullständig täckning:',{exact:false})).toBeVisible();
 await v2.getByLabel('V2 enhet').selectOption('costs');
 await expect(v2.locator('.canonical-result-head strong')).toContainText('SEK');
});
