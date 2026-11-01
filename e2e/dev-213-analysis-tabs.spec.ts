import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('DEV-213 keeps independent hour/cost tabs and respects cost selection',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';sheet.getCell('D26').value=42;
 sheet.getCell('C27').value='OMK (kr) - Övrigt';sheet.getCell('D27').value=100;
 sheet.getCell('C28').value='OMK (kr) - Prod.konsulter';sheet.getCell('D28').value=200;
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'analysis-tabs.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())});
 await expect(page.getByRole('status').filter({hasText:'analysis-tabs.xlsx'})).toContainText('importerad');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const tabs=page.getByRole('tablist',{name:'Analysområde'});
 await expect(tabs.getByRole('tab',{name:'Timmar'})).toHaveAttribute('aria-selected','true');
 await tabs.getByRole('tab',{name:'Kostnader'}).click();
 await expect(tabs.getByRole('tab',{name:'Kostnader'})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('region',{name:'Analys av kostnadsslag'})).toBeVisible();
 await page.getByRole('combobox',{name:'period'}).selectOption('2027');
 await expect(page.getByRole('region',{name:'Kostnadsutveckling per kostnadsslag'})).toHaveCount(0);
 await page.getByRole('combobox',{name:'period'}).selectOption('all');
 await tabs.getByRole('tab',{name:'Timmar'}).click();
 await expect(tabs.getByRole('tab',{name:'Timmar'})).toHaveAttribute('aria-selected','true');
 await tabs.getByRole('tab',{name:'Kostnader'}).click();
 await page.getByText('Välj kostnadsmått', {exact:false}).click();
 await expect(page.getByRole('checkbox',{name:'Konsultkostnader'})).toBeChecked();
});
