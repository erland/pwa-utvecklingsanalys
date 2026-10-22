import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
test('tabular process-hour import reaches semantic analysis',async({page})=>{
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('Processarbete');
 s.getRow(1).values=['Process','År','Timmar'];s.getRow(2).values=['Process A',2027,80];
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#import-files').setInputFiles({name:'processer.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByLabel('Tabellprofil')).toHaveValue('process-hours');
 await page.getByRole('button',{name:'Granska tabell'}).click();
 await expect(page.getByText('1 numeriska observationer')).toBeVisible();
 await page.getByRole('button',{name:'Godkänn tabellimport'}).click();
 await expect(page.getByRole('status')).toContainText('Importen har godkänts');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 await page.getByLabel('Mått').selectOption('business_hours');
 await expect(page.locator('.result-head strong')).toHaveText('80 h');
});
