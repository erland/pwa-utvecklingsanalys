import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
test('unknown sheet is rejected without manual mapping',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('Planering ny version');
 sheet.getCell('C1').value='UO: UO X';sheet.getCell('E10').value=2027;
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'ändrad.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByRole('status').filter({hasText:'ändrad.xlsx'})).toContainText('Okänt Excel-format');
 await expect(page.getByText('Inga godkända källor.')).toBeVisible();
});
