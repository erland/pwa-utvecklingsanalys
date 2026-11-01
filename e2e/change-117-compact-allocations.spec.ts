import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('DEV-117 approved allocation is collapsed but can be reopened and changed per source',async({page})=>{
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('UO Tot 2027-30');
 s.getCell('B1').value='UO: UO A';s.getCell('D11').value=2027;
 s.getCell('B25').value='LO 1';s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=60;
 s.getCell('B31').value='LO 2';s.getCell('C32').value='IT timmar (h)';s.getCell('D32').value=40;
 s.getCell('D4').value='Utv. 27';s.getCell('E4').value='Förv. 27';
 s.getCell('C5').value='IT timmar (th)';s.getCell('D5').value=.05;s.getCell('E5').value=.05;
 await page.goto('./');await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'dev117.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())});
 await expect(page.getByRole('status').filter({hasText:'dev117.xlsx'})).toContainText('importerad');
 await expect(page.getByRole('region',{name:'Efter import'})).toBeVisible();
 await page.getByRole('button',{name:'Visa källor och hantera import'}).click();
 await page.getByRole('button',{name:'Visa/ändra fördelningar'}).click();
 await expect(page.getByRole('region',{name:'Valfria fördelningar'})).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:'Fördelningar',exact:true}).click();
 await expect(page.getByRole('region',{name:'Valfria fördelningar'})).toBeVisible();
});
