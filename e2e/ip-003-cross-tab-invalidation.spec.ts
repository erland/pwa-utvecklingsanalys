import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('IP-003: source import warns another open tab but not the writer and reload clears warning',async({context})=>{
 const first=await context.newPage();
 const second=await context.newPage();
 await first.goto('./');
 await second.goto('./');
 await expect(second.getByRole('button',{name:'Import',exact:true})).toBeVisible();

 const workbook=new ExcelJS.Workbook();
 const sheet=workbook.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=42;
 sheet.getCell('D4').value='Utv. 27';
 sheet.getCell('E4').value='Förv. 27';
 sheet.getCell('C5').value='IT timmar (th)';
 sheet.getCell('D5').value=0.025;
 sheet.getCell('E5').value=0.017;

 await first.getByRole('button',{name:'Import',exact:true}).click();
 await first.locator('#direct-import-files').setInputFiles({
  name:'ip003-cross-tab.xlsx',
  mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer:Buffer.from(await workbook.xlsx.writeBuffer())
 });
 await expect(first.getByRole('status').filter({hasText:'ip003-cross-tab.xlsx'})).toContainText('importerad');
 await expect(second.getByRole('alert').filter({hasText:'Arbetsytan har ändrats i en annan flik'})).toBeVisible();
 await expect(first.getByRole('alert').filter({hasText:'Arbetsytan har ändrats i en annan flik'})).toHaveCount(0);
 await second.getByRole('button',{name:'Ladda om nu'}).click();
 await expect(second.getByRole('alert').filter({hasText:'Arbetsytan har ändrats i en annan flik'})).toHaveCount(0);
 await first.close();
 await second.close();
});
