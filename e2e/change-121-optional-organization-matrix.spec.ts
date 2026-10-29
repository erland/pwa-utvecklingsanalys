import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('DEV-121 organizational year matrix is optional and trend remains visible',async({page})=>{
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO Matris';
 sheet.getCell('D11').value=2027;
 sheet.getCell('E11').value=2028;
 sheet.getCell('B25').value='LO A';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=40;
 sheet.getCell('E26').value=60;
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({
  name:'dev121.xlsx',
  mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer:Buffer.from(await workbook.xlsx.writeBuffer())
 });
 await expect(page.getByRole('status').filter({hasText:'Importresultat'})).toContainText('dev121.xlsx');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const trend=page.getByRole('region',{name:'Årsvis utveckling för valt organisationsurval'});
 await expect(trend.getByRole('table',{name:'Årsvis utveckling och förändring'})).toBeVisible();
 const details=page.locator('details.organization-year-details');
 const matrix=details.getByRole('table',{name:'Organisation per år',includeHidden:true});
 await expect(details).not.toHaveAttribute('open',/.+/);
 await expect(matrix).toBeHidden();
 await details.locator('summary').click();
 await expect(matrix).toBeVisible();
 await expect(matrix).toContainText('2027');
 await expect(matrix).toContainText('2028');
 await details.locator('summary').click();
 await expect(matrix).toBeHidden();
 await expect(trend.getByRole('table',{name:'Årsvis utveckling och förändring'})).toBeVisible();
});
