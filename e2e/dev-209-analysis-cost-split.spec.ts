import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('DEV-209 analysis offers separate hour and kronor activity distributions',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';sheet.getCell('C26').value='IT timmar (h)';sheet.getCell('D26').value=60;
 sheet.getCell('B31').value='LO 2';sheet.getCell('C32').value='IT timmar (h)';sheet.getCell('D32').value=40;
 sheet.getCell('D4').value='Utv. 27';sheet.getCell('E4').value='Förv. 27';
 sheet.getCell('C5').value='IT timmar (th)';sheet.getCell('D5').value=0.05;sheet.getCell('E5').value=0.05;
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'dev-209.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())});
 await expect(page.getByRole('status').filter({hasText:'dev-209.xlsx'})).toContainText('importerad');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const selector=page.getByLabel('Analysera fördelningstyp');
 await expect(selector.locator('option',{hasText:'Utveckling / Förvaltning – timmar'})).toHaveCount(1);
 await expect(selector.locator('option',{hasText:'Utveckling / Förvaltning – kronor'})).toHaveCount(0);
 await selector.selectOption('activities-hours');
 await expect(page.getByRole('table',{name:'Fördelning Utveckling / Förvaltning – timmar'})).toBeVisible();
 await page.getByRole('tab',{name:'Kostnader'}).click();
 await expect(selector.locator('option',{hasText:'Utveckling / Förvaltning – kronor'})).toHaveCount(1);
 await expect(selector.locator('option',{hasText:'Utveckling / Förvaltning – timmar'})).toHaveCount(0);
 await selector.selectOption('activities-costs');
 await expect(page.getByRole('table',{name:'Fördelning Utveckling / Förvaltning – kronor'})).toBeVisible();
});
