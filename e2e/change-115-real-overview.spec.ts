import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('DEV-115 overview starts without demo data and reflects imported project after reload',async({page})=>{
 await page.goto('./');
 const overview=page.getByRole('main');
 await expect(overview.getByRole('heading',{name:'Börja här'})).toBeVisible();
 await expect(overview.getByText('Importerade källor')).toHaveCount(1);
 await expect(overview.getByText('Automatiska LO-fördelningar')).toHaveCount(1);
 await expect(overview.getByText('Underlag att kontrollera')).toHaveCount(1);
 await expect(overview.getByText('Utvecklingsområden i demo')).toHaveCount(0);
 await expect(overview.getByText('Demo – totalt antal timmar')).toHaveCount(0);
 await expect(overview.getByRole('button',{name:'Gå till analysen'})).toHaveCount(0);
 await expect(page.locator('footer')).not.toContainText('Demodata');
 await overview.getByRole('button',{name:'Importera Excel-filer'}).click();
 await expect(overview.getByRole('heading',{name:'Importera Excelunderlag'})).toBeVisible();
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';sheet.getCell('C26').value='IT timmar (h)';sheet.getCell('D26').value=42;
 await page.locator('#direct-import-files').setInputFiles({name:'dev115.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())});
 await expect(page.getByRole('status').filter({hasText:'Importresultat'})).toContainText('dev115.xlsx');
 await page.getByRole('button',{name:'Översikt',exact:true}).click();
 await expect(overview.getByText('Importerade källor').locator('..')).toContainText('1');
 await expect(overview.getByRole('heading',{name:'Fortsätt arbeta'})).toBeVisible();
 await expect(overview.getByRole('button',{name:'Gå till analysen'})).toBeVisible();
 await page.reload();
 await expect(overview.getByText('Importerade källor').locator('..')).toContainText('1');
 await expect(overview.getByRole('button',{name:'Gå till analysen'})).toBeVisible();
});
