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
 const successfulFile=results.locator('li').filter({hasText:'godkand.xlsx'});
 await expect(successfulFile).toContainText('importerad');
 await expect(successfulFile.locator('details')).not.toHaveAttribute('open');
 await expect(successfulFile.getByText(/detaljvärden/)).toBeHidden();
 await expect(successfulFile).not.toContainText('Nästa åtgärd:');
 await successfulFile.getByText('Visa detaljer').click();
 await expect(successfulFile).toContainText('1 detaljvärden');
 await expect(results).toContainText('okand.xlsx');
 await expect(results).toContainText('Okänt Excel-format');
 await expect(results).toContainText('Nästa åtgärd:');
 await expect(results).toContainText('Rätta de avvisade filerna och välj dem igen');
 await expect(page.getByRole('region',{name:'Efter import'})).toBeVisible();
});

test('clean single-file import stays concise with optional details',async({page})=>{
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO En';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=35;
 const buffer=Buffer.from(await workbook.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles([
  {name:'klar.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer}
 ]);
 const results=page.getByRole('status',{name:'Importresultat'});
 await expect(results).toContainText('klar.xlsx');
 await expect(results).toContainText('importerad');
 await expect(results).not.toContainText('Nästa åtgärd:');
 await expect(results).not.toContainText('kompletteringar eller fördelningar');
 const details=results.locator('details');
 await expect(details).not.toHaveAttribute('open');
 await details.locator('summary').click();
 await expect(details).toHaveAttribute('open');
 await expect(details).toContainText('UO Tot 2027-30');
});
