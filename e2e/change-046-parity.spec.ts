import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('CHANGE-046: v2 preserves historical period totals without rendering the legacy analysis',async({page})=>{
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('UO Tot 2027-30');
 s.getCell('B1').value='UO: Paritet UO';s.getCell('D11').value=2027;s.getCell('E11').value=2028;
 s.getCell('B25').value='LO 1';s.getCell('C26').value='IT timmar (h)';
 s.getCell('D26').value=42;s.getCell('E26').value=18;
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#import-files').setInputFiles({name:'parity.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await page.getByRole('button',{name:'Godkänn import'}).click();
 await expect(page.getByRole('status')).toContainText('Importen godkänd');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const v2=page.locator('.canonical-analytics');
 await expect(page.locator('.analysis-layout')).toHaveCount(0);
 await expect(v2.locator('.canonical-result-head strong')).toHaveText('60 h');
 await v2.getByLabel('period').selectOption('2027');
 await expect(v2.locator('.canonical-result-head strong')).toHaveText('42 h');
 await v2.getByLabel('period').selectOption('2028');
 await expect(v2.locator('.canonical-result-head strong')).toHaveText('18 h');
});
