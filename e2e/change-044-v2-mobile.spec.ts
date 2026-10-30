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
 await page.locator('#direct-import-files').setInputFiles({name:'mobile.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByRole('status')).toContainText('importerad');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const v2=page.locator('.canonical-analytics');
 await expect(v2.getByRole('heading',{name:'Analys av importerade uppgifter'})).toBeVisible();
 await expect(v2.locator('.canonical-result-head strong')).toContainText('42 h');
 await v2.getByLabel('period',{exact:true}).selectOption('2027');
 await expect(v2.getByRole('region',{name:'Årsvis utveckling för valt organisationsurval'})).toHaveCount(0);
 await expect(v2.getByRole('region',{name:'Årsvis utveckling per organisationsdel'})).toHaveCount(0);
 await expect(v2.getByRole('table',{name:'Organisation per år'})).toHaveCount(0);
 // Check that the key interactive controls and result are within the visible viewport width.
 for(const locator of [v2.getByLabel('period',{exact:true}),v2.getByRole('checkbox',{name:'IT-timmar'}),v2.locator('.canonical-result-head strong')]){
  const box=await locator.boundingBox();
  expect(box,'Control or result must have a measurable position').not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x+box!.width).toBeLessThanOrEqual(392);
 }
});
