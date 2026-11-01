import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('DEV-154 analysis presents selection, summary and detail in order',async({page})=>{
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: Test UO';sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO A';sheet.getCell('C26').value='IT timmar (h)';sheet.getCell('D26').value=50;
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'analysis-hierarchy.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await workbook.xlsx.writeBuffer())});
 await expect(page.getByRole('status')).toContainText('importerad');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const selection=page.getByRole('region',{name:'Analysurval'});
 const summary=page.getByRole('region',{name:'Sammanfattning av analys'});
 const details=page.getByRole('region',{name:'Fördjupad analys'});
 await expect(selection).toBeVisible();
 await expect(summary).toBeVisible();
 await expect(details).toBeVisible();
 await expect(selection.getByRole('tablist',{name:'Analysområde'})).toBeVisible();
 await expect(selection.getByLabel('period')).toBeVisible();
 await expect(summary).toContainText('Totalt i vald redovisning');
 await expect(details).toContainText('Fördjupning');
});
