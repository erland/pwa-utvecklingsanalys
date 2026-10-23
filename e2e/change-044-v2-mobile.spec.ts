import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('CHANGE-044: narrow portrait viewport keeps v2 analysis usable with charts and filters',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: Mobiltest';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=42;
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#import-files').setInputFiles({name:'mobile.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await page.getByRole('button',{name:'Godkänn import'}).click();
 await expect(page.getByRole('status')).toContainText('Importen godkänd');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const v2=page.locator('.canonical-analytics');
 await expect(v2.getByRole('heading',{name:'Analys – informationsmodell v2'})).toBeVisible();
 await expect(v2.locator('.canonical-result-head strong')).toContainText('42 h');
 await v2.getByLabel('V2 period').selectOption('2027');
 await v2.getByLabel('V2 tidsdiagramtyp').selectOption('lines');
 await expect(v2.getByRole('img',{name:'Trendlinjer för v2-mått'})).toBeVisible();
 await v2.getByLabel('Diagramtyp för v2-fördelning').selectOption('pie');
 await expect(v2.getByRole('img',{name:/Cirkelfördelning v2, total 42 h/})).toBeVisible();
 await expect(v2.getByRole('table',{name:'V2 analysresultat'})).toContainText('42 h');
 // Check that the key interactive controls and result are within the visible viewport width.
 for(const locator of [v2.getByLabel('V2 period'),v2.getByLabel('V2 tidsdiagramtyp'),v2.getByLabel('Diagramtyp för v2-fördelning'),v2.locator('.canonical-result-head strong')]){
  const box=await locator.boundingBox();
  expect(box,'Control or result must have a measurable position').not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x+box!.width).toBeLessThanOrEqual(392);
 }
});
