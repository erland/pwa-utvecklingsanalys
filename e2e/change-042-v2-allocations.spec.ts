import {test,expect,type Locator} from '@playwright/test';
async function selectActivity(view:Locator,value:'development'|'maintenance'|'all'){
 const dev=view.getByRole('checkbox',{name:'Utveckling',exact:true});
 const maint=view.getByRole('checkbox',{name:'Förvaltning',exact:true});
 if(value==='all'){await dev.check();await maint.check()}
 else if(value==='development'){await dev.check();await maint.uncheck()}
 else {await maint.check();await dev.uncheck()}
}

import ExcelJS from 'exceljs';

test('CHANGE-042: approve and revoke v2 allocation through real UI',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
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
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'allocation-v2.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByRole('status').filter({hasText:'allocation-v2.xlsx'})).toContainText('importerad');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const v2=page.locator('.canonical-analytics');
 await expect(v2.locator('.canonical-result-head strong')).toContainText('42 h');
 await selectActivity(v2,'development');
 await expect(v2.locator('.canonical-result-head strong')).toContainText('25 h');
 await page.getByRole('button',{name:'Kompletteringar',exact:true}).click();
 const allocation=page.getByRole('heading',{name:'Aktivitetsfördelning till LO'}).locator('..');
 await expect(allocation.getByLabel('fördelningskälla')).toContainText('it_hours');
 await allocation.getByRole('button',{name:'Skapa fördelning'}).click();
 await expect(allocation.getByText('Inväntar godkännande')).toBeVisible();
 await allocation.getByLabel('godkännandemotivering', {exact:false}).fill('Testad källavstämning');
 await allocation.getByRole('button',{name:'Godkänn föreslagen fördelning'}).click();
 await expect(allocation.getByText('Godkänd',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const updated=page.locator('.canonical-analytics');
 await selectActivity(updated,'development');
 await expect(updated.locator('.canonical-result-head strong')).toContainText('25 h');
 await selectActivity(updated,'maintenance');
 await expect(updated.locator('.canonical-result-head strong')).toContainText('17 h');
 await selectActivity(updated,'all');
 await expect(updated.locator('.canonical-result-head strong')).toContainText('42 h');
 await page.getByRole('button',{name:'Kompletteringar',exact:true}).click();
 await allocation.getByRole('button',{name:'Återkalla godkännande'}).click();
 await expect(allocation.getByText('Inväntar godkännande')).toBeVisible();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 await selectActivity(page.locator('.canonical-analytics'),'development');
 await expect(page.locator('.canonical-analytics .canonical-result-head strong')).toContainText('25 h');
});
