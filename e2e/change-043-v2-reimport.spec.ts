import {test,expect,type Locator} from '@playwright/test';
async function selectActivity(view:Locator,value:'development'|'maintenance'|'all'){
 const dev=view.getByRole('checkbox',{name:'Utveckling',exact:true});
 const maint=view.getByRole('checkbox',{name:'Förvaltning',exact:true});
 if(value==='all'){await dev.check();await maint.check()}
 else if(value==='development'){await dev.check();await maint.uncheck()}
 else {await maint.check();await dev.uncheck()}
}

import ExcelJS from 'exceljs';

test('CHANGE-043: replacing approved source invalidates v2 allocation until reapproval',async({page})=>{
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
 await expect(v2.locator('.canonical-result-head strong')).toContainText('0 h');
 await expect(v2.getByText('Ofullständig täckning:',{exact:false})).toBeVisible();
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

 // Replace the exact previously approved source; no imported record is manually edited.
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.getByRole('button',{name:'Visa källor och hantera import'}).click();
 await page.getByRole('button',{name:'Ersätt',exact:true}).click();
 const replacement=new ExcelJS.Workbook(),rs=replacement.addWorksheet('UO Tot 2027-30');
 rs.getCell('B1').value='UO: UO A';
 rs.getCell('D11').value=2027;
 rs.getCell('B25').value='LO 1';
 rs.getCell('C26').value='IT timmar (h)';
 rs.getCell('D26').value=40;
 rs.getCell('D4').value='Utv. 27';
 rs.getCell('E4').value='Förv. 27';
 rs.getCell('C5').value='IT timmar (th)';
 rs.getCell('D5').value=0.024;
 rs.getCell('E5').value=0.016;
 const replacementBuffer=Buffer.from(await replacement.xlsx.writeBuffer());
 await page.locator('#direct-import-files').setInputFiles({name:'allocation-v2-replaced.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:replacementBuffer});
 await expect(page.getByRole('status').filter({hasText:'allocation-v2-replaced.xlsx'})).toContainText('importerad');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const staleV2=page.locator('.canonical-analytics');
 await expect(staleV2.locator('.canonical-result-head strong')).toContainText('40 h');
 await selectActivity(staleV2,'development');
 await expect(staleV2.locator('.canonical-result-head strong')).toContainText('0 h');
 await expect(staleV2.getByText('godkännanden behöver omprövas',{exact:false})).toBeVisible();

 await page.getByRole('button',{name:'Kompletteringar',exact:true}).click();
 const changedAllocation=page.getByRole('heading',{name:'Aktivitetsfördelning till LO'}).locator('..');
 await expect(changedAllocation.getByText('Kräver nytt godkännande')).toBeVisible();
 await changedAllocation.getByLabel('godkännandemotivering',{exact:false}).fill('Kontrollerad efter källbyte');
 await changedAllocation.getByRole('button',{name:'Godkänn föreslagen fördelning'}).click();
 await expect(changedAllocation.getByText('Godkänd',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 await selectActivity(page.locator('.canonical-analytics'),'development');
 await expect(page.locator('.canonical-analytics .canonical-result-head strong')).toContainText('24 h');
});
