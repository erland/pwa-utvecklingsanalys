import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('DEV-120 analysis controls are directly visible without extra disclosure panels',async({page})=>{
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: Test';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO A';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=100;
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({
  name:'analysis-controls.xlsx',
  mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer:Buffer.from(await workbook.xlsx.writeBuffer())
 });
 await expect(page.getByRole('status').filter({hasText:'Importresultat'})).toContainText('analysis-controls.xlsx');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 await expect(page.getByRole('region',{name:'Redovisning och gruppering'})).toBeVisible();
 await expect(page.getByRole('combobox',{name:'organisation'})).toBeVisible();
 await expect(page.getByRole('combobox',{name:'resultatgruppering'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Avgränsa underlag'})).toHaveCount(0);
 await expect(page.getByRole('region',{name:'Utforska UO'})).toBeVisible();
 await expect(page.getByText('Fler analysval – organisation och gruppering')).toHaveCount(0);
 await expect(page.getByText('Fler filter – datakälla, UO och LO')).toHaveCount(0);
});
