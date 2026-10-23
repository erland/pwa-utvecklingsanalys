import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
test('combined hours appear in analysis with explicit constituents and annual visualization',async({page})=>{
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('UO Tot 2027-30');
 s.getCell('B1').value='UO: UO A';s.getCell('D11').value=new Date(2027,0,1);
 s.getCell('B25').value='LO 1';s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=42;
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#import-files').setInputFiles({name:'uo-a.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await page.getByRole('button',{name:'Godkänn import'}).click();
 await expect(page.getByRole('status')).toContainText('Importen godkänd');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const v2=page.locator('.canonical-analytics');
 await expect(v2.locator('.canonical-result-head strong')).toContainText('42 h');
 await v2.getByLabel('V2 tidsdiagramtyp').selectOption('lines');
 await expect(v2.getByRole('img',{name:'Trendlinjer för v2-mått'})).toBeVisible();
 await v2.getByLabel('V2 enhet').selectOption('costs');
 await expect(v2.locator('.canonical-result-head strong')).toContainText('SEK');
});
