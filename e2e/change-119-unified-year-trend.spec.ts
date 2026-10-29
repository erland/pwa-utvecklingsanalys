import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('DEV-119 selected IT and business hours share one trend series and annual difference table',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO Trend';
 sheet.getCell('D11').value=2027;sheet.getCell('E11').value=2028;
 sheet.getCell('B25').value='LO A';
 sheet.getCell('C26').value='IT timmar (h)';sheet.getCell('D26').value=100;sheet.getCell('E26').value=120;
 sheet.getCell('C27').value='Verksamhetstimmar (h)';sheet.getCell('D27').value=50;sheet.getCell('E27').value=60;
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'trend.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())});
 await expect(page.getByRole('status').filter({hasText:'Importresultat'})).toContainText('trend.xlsx');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const trend=page.getByRole('region',{name:'Årsvis utveckling för valt organisationsurval'});
 await expect(trend.getByRole('img',{name:/Linjediagram/})).toBeVisible();
 const table=trend.getByRole('table',{name:'Årsvis utveckling och förändring'});
 await expect(table.locator('tbody tr')).toHaveCount(2);
 await expect(table.locator('tbody tr').first()).toContainText('2027');
 await expect(table.locator('tbody tr').last()).toContainText('2028');
 await expect(table).toContainText('+30');
 await page.getByRole('checkbox',{name:'Verksamhetstimmar'}).uncheck();
 await expect(table.locator('tbody tr').last()).toContainText('+20');
 await expect(page.getByRole('region',{name:'Förändring från föregående år för valt organisationsurval'})).toHaveCount(0);
});
