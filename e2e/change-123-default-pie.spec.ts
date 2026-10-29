import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

async function source(name:string,uo:string,hours:number){
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: '+uo;
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO A';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=hours;
 return {name,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer:Buffer.from(await workbook.xlsx.writeBuffer())};
}

test('DEV-123 pie is default when multiple valid UOs exist; table remains selectable',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles([
  await source('dev123-a.xlsx','UO A',40),await source('dev123-b.xlsx','UO B',60)
 ]);
 await expect(page.getByRole('status').filter({hasText:'Importresultat'})).toContainText('dev123-b.xlsx');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const navigator=page.getByRole('region',{name:'Utforska UO'});
 const presentation=navigator.getByRole('combobox',{name:'Presentation för UO i analys'});
 await expect(presentation).toHaveValue('pie');
 await expect(navigator.getByRole('group',{name:'Cirkeldiagram: UO i analys'})).toBeVisible();
 await presentation.selectOption('table');
 await expect(navigator.getByRole('table',{name:'UO i analys'})).toBeVisible();
});

test('DEV-123 one UO uses table fallback, preserving drilldown',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles(await source('dev123-one.xlsx','UO A',40));
 await expect(page.getByRole('status').filter({hasText:'Importresultat'})).toContainText('dev123-one.xlsx');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const navigator=page.getByRole('region',{name:'Utforska UO'});
 await expect(navigator.getByRole('combobox',{name:'Presentation för UO i analys'})).toHaveValue('table');
 await expect(navigator.getByRole('table',{name:'UO i analys'})).toBeVisible();
 await navigator.getByRole('button',{name:'Visa LO'}).click();
 await expect(navigator.getByRole('table',{name:'LO och UO Övergripande'})).toBeVisible();
});
