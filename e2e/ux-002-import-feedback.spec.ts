import {expect,test} from '@playwright/test';
import ExcelJS from 'exceljs';

test('UX-002: mixed batch shows success and rejected files with distinct next actions',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';sheet.getCell('C26').value='IT timmar (h)';sheet.getCell('D26').value=42;
 const good=Buffer.from(await wb.xlsx.writeBuffer());
 const unknown=new ExcelJS.Workbook();unknown.addWorksheet('Unknown layout');
 const bad=Buffer.from(await unknown.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles([
  {name:'godkand.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:good},
  {name:'okand.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:bad}
 ]);
 const results=page.getByRole('status',{name:'Importresultat'});
 await expect(results).toContainText('1 importerade · 1 inte importerade');
 await expect(results).toContainText('godkand.xlsx');
 await expect(results).toContainText('okand.xlsx');
 await expect(results).toContainText('Okänt Excel-format');
 await expect(results).toContainText('Nästa åtgärd:');
 await expect(results).toContainText('Rätta de avvisade filerna och välj dem igen');
 await expect(page.getByRole('region',{name:'Efter import'})).toBeVisible();
});
