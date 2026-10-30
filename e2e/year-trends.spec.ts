import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
test('annual bars and trend preserve imported yearly results',async({page})=>{
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('UO Tot 2027-30');
 s.getCell('B1').value='UO: UO A';s.getCell('D11').value=new Date(2027,0,1);
 s.getCell('E11').value=new Date(2027,1,1);s.getCell('B25').value='LO 1';
 s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=42;s.getCell('E26').value=18;
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'uo-a.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByRole('status')).toContainText('importerad');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const v2=page.locator('.canonical-analytics');

 await expect(v2.getByRole('region',{name:'Årsvis utveckling för valt organisationsurval'})).toHaveCount(0);
 await expect(v2.getByRole('table',{name:'Organisation per år'})).toHaveCount(0);
 await v2.getByLabel('period',{exact:true}).selectOption('2027');
 await expect(v2.locator('.canonical-result-head strong')).toContainText('60 h');
});
