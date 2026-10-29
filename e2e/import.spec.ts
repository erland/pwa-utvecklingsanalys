import {test,expect,type Locator} from '@playwright/test';
async function selectActivity(view:Locator,value:'development'|'maintenance'|'all'){
 const dev=view.getByRole('checkbox',{name:'Utveckling',exact:true});
 const maint=view.getByRole('checkbox',{name:'Förvaltning',exact:true});
 if(value==='all'){await dev.check();await maint.check()}
 else if(value==='development'){await dev.check();await maint.uncheck()}
 else {await maint.check();await dev.uncheck()}
}

import ExcelJS from 'exceljs';
test('direct import persists after reload and is available for analysis',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';
 sheet.getCell('D11').value=new Date(2027,0,1);
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=42;
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'uo-a.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByRole('status').filter({hasText:'uo-a.xlsx'})).toContainText('importerad');
 await page.reload();
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Importerade källor'})).toBeVisible();
 await expect(page.getByRole('table').first()).toContainText('UO A');
 await page.getByRole('button',{name:'Översikt',exact:true}).click();
 await expect(page.getByText('Importerade filer').locator('..')).toContainText('1');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Analysera utvecklingsbehoven'})).toBeVisible();
 await expect(page.locator('.canonical-result-head strong')).toHaveText('42 h');
 await page.getByLabel('period',{exact:true}).selectOption('2027');
 await expect(page.getByRole('table',{name:'UO i analys'})).toContainText('UO A');
 await page.getByRole('button',{name:'Visa LO'}).click();
 await expect(page.getByRole('table',{name:'LO och UO Övergripande'})).toContainText('LO 1');
});

test('v2 analysis controls keep units separate and filter by year and activity',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO V2';
 sheet.getCell('D11').value=new Date(2027,0,1);
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=42;
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'uo-v2.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByRole('status').filter({hasText:'uo-v2.xlsx'})).toContainText('importerad');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const v2=page.locator('.canonical-analytics');
 await expect(v2.getByRole('heading',{name:'Analys av importerade uppgifter'})).toBeVisible();
 await expect(v2.locator('.canonical-result-head strong')).toContainText('42 h');
 await v2.getByLabel('period',{exact:true}).selectOption('2027');
 await expect(v2.locator('.canonical-result-head strong')).toContainText('42 h');
 await selectActivity(v2,'development');
 await expect(v2.getByText('Ofullständig täckning:',{exact:false})).toBeVisible();
 await v2.getByLabel('enhet').selectOption('costs');
 await expect(v2.locator('.canonical-result-head strong')).toContainText('SEK');
 await v2.getByLabel('organisation',{exact:true}).selectOption('department');
 await expect(v2.locator('.canonical-result-head strong')).toContainText('0 SEK');
});
