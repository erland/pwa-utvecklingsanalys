import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('UX-004: the analysis summary follows year, metrics, activity, area and UO navigation',async({page})=>{
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=42;
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'ux-004.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await workbook.xlsx.writeBuffer())});
 await expect(page.getByRole('status').filter({hasText:'ux-004.xlsx'})).toContainText('importerad');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const summary=page.getByRole('region',{name:'Valda filter för resultaten'});
 await expect(summary).toContainText('Organisation: Alla UO');
 await expect(summary).toContainText('År: Alla år');
 await expect(summary).toContainText('IT-timmar + Verksamhetstimmar');
 await expect(summary).toContainText('Utveckling och förvaltning');

 await page.getByLabel('period',{exact:true}).selectOption('2027');
 await expect(summary).toContainText('År: 2027');
 await page.getByRole('checkbox',{name:'Verksamhetstimmar',exact:true}).uncheck();
 await expect(summary).toContainText('Mått: Timmar · IT-timmar');
 await page.getByRole('checkbox',{name:'Förvaltning',exact:true}).uncheck();
 await expect(summary).toContainText('Aktivitet: Utveckling');

 await page.getByRole('table',{name:'UO i analys'}).getByRole('button',{name:'UO A'}).click();
 await expect(summary).toContainText('Organisation: UO: UO A');

 await page.getByRole('tab',{name:'Kostnader'}).click();
 await expect(summary).toContainText('Mått: Kostnader');
 await expect(summary).not.toContainText('Aktivitet:');
 await page.getByLabel('organisation',{exact:true}).selectOption('department');
 await expect(summary).toContainText('Organisation: Avdelningar');
 await expect(summary).toContainText('Mått: Timmar');
});
