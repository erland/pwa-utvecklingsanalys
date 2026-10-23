import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('CHANGE-013 integrated acceptance: XLSX, grouping, combined measures, charts and years',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';
 sheet.getCell('D11').value=new Date(2027,0,1);
 sheet.getCell('E11').value=new Date(2027,1,1);
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=42;
 sheet.getCell('E26').value=18;
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#import-files').setInputFiles({name:'acceptance.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByRole('button',{name:'Godkänn import'})).toBeEnabled();
 await page.getByRole('button',{name:'Godkänn import'}).click();
 await expect(page.getByRole('status')).toContainText('Importen godkänd');

 await page.getByRole('button',{name:'Grupper'}).click();
 await page.getByRole('button',{name:'Ny gruppmodell'}).click();
 await page.getByLabel('Modellnamn').fill('Acceptansmodell');
 await page.getByRole('button',{name:'Lägg till grupp'}).click();
 await page.getByLabel('Gruppnamn').fill('Digital utveckling');
 await page.getByLabel('UO A').check();
 await page.getByRole('button',{name:'Spara gruppmodeller'}).click();
 await expect(page.getByRole('status')).toContainText('Gruppmodeller sparade');

 await page.getByRole('button',{name:'Analys',exact:true}).click();
 await page.getByLabel('Mått').selectOption('all_hours');
 await expect(page.locator('.result-head strong')).toHaveText('60 h');
 await page.getByLabel('Gruppera efter').selectOption('uo-group');
 await expect(page.locator('.analysis-table').first()).toContainText('Digital utveckling');
 await page.getByLabel('Visualisering',{exact:true}).selectOption('pie');
 await expect(page.getByRole('img',{name:/Cirkeldiagram, total 60 h/})).toBeVisible();
 await page.getByLabel('Tidsvisning').selectOption('trend');
 await expect(page.getByRole('img',{name:'Trendlinjer per grupp'})).toBeVisible();
 await expect(page.getByRole('table',{name:'Periodtabell'})).toContainText('Digital utveckling');
 await page.getByLabel('Tidsvisning').selectOption('grouped');
 await expect(page.getByLabel('Grupperade årsstaplar')).toBeVisible();
 await page.getByLabel('År',{exact:true}).selectOption('2027');
 await expect(page.locator('.result-head strong')).toHaveText('60 h');
 await page.getByLabel('Mått').selectOption('all_costs');
 await expect(page.locator('.result-head strong')).toHaveText('0 SEK');
 await page.reload();
 await page.getByRole('button',{name:'Grupper'}).click();
 await expect(page.getByLabel('Modellnamn')).toHaveValue('Acceptansmodell');
});
