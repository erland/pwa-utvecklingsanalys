import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
test('chart modes reuse imported data and preserve accessible totals',async({page})=>{
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('UO Tot 2027-30');
 s.getCell('B1').value='UO: UO A';s.getCell('D11').value=new Date(2027,0,1);
 s.getCell('B25').value='LO 1';s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=42;
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'uo-a.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByRole('status')).toContainText('importerad');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const v2=page.locator('.canonical-analytics');
 await expect(v2.locator('.canonical-result-head strong')).toContainText('42 h');
 const navigator=v2.getByRole('region',{name:'Utforska UO'});
 await expect(navigator.getByRole('combobox',{name:'Presentation för UO i analys'})).toHaveCount(0);
 await expect(navigator.getByRole('table',{name:'UO i analys'})).toContainText('42');
 await expect(navigator.getByRole('table',{name:'UO i analys'}).getByRole('button',{name:'UO A'})).toBeVisible();

});
