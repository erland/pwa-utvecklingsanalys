import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
test('tabular process-hour import reaches semantic analysis',async({page})=>{
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('Processarbete');
 s.getRow(1).values=['Process','År','Timmar'];s.getRow(2).values=['Process A',2027,80];
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'processer.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByRole('status')).toContainText('importerad');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const v2=page.locator('.canonical-analytics');
 await expect(v2).toBeVisible();
 await expect(v2.getByRole('heading',{name:'Analys av importerade uppgifter'})).toBeVisible();
});
