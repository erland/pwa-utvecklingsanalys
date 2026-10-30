import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

async function sourceFile(name:string,uo:string,first:number,second:number){
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: '+uo;
 sheet.getCell('D11').value=2027;
 sheet.getCell('E11').value=2028;
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=first;
 sheet.getCell('E26').value=second;
 return {name,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())};
}

test('DEV-114 multi-source acceptance: totals, yearly matrix, filters, UO drilldown and reload',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 const a=await sourceFile('dev114-a.xlsx','UO A',40,60);
 const b=await sourceFile('dev114-b.xlsx','UO B',100,120);
 await page.locator('#direct-import-files').setInputFiles([a,b]);
 const importResult=page.getByRole('status').filter({hasText:'Importresultat'});
 await expect(importResult).toContainText('dev114-a.xlsx');
 await expect(importResult).toContainText('dev114-b.xlsx');
 await expect(importResult).not.toContainText('Inte importerad');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const view=page.locator('.canonical-analytics');
 const total=view.locator('.canonical-result-head strong');
 const matrix=view.getByRole('table',{name:'Organisation per år'});
 const navigator=view.getByRole('region',{name:'Utforska UO'});
 await page.locator('.canonical-analytics details.organization-year-details > summary').click();
 await expect(total).toHaveText('320 h');
 await expect(matrix).toHaveCount(1);
 await expect(matrix).toContainText('UO A');
 await expect(matrix).toContainText('UO B');
 await expect(matrix.locator('tfoot')).toContainText('320 h');
 const uoPie=navigator.getByRole('group',{name:'Cirkeldiagram: UO i analys'});
 await expect(uoPie).toContainText('UO A');
 await expect(uoPie).toContainText('UO B');
 await expect(view.getByRole('region',{name:'Fördjupade analysrapporter'})).toHaveCount(0);

 // All imported sources contribute by default. Hierarchy navigation is the only UO/LO scoping.
 await expect(view.getByRole('region',{name:'Avgränsa underlag'})).toHaveCount(0);
 await expect(view.getByRole('group',{name:'Datakällor'})).toHaveCount(0);
 await expect(view.getByRole('group',{name:'UO',exact:true})).toHaveCount(0);
 await expect(view.getByRole('group',{name:'LO',exact:true})).toHaveCount(0);
 await uoPie.getByRole('button',{name:'UO A',exact:true}).click();
 const selectedTotal=await total.textContent();
 expect(['100 h','220 h']).toContain(selectedTotal?.trim());
 await expect(matrix.locator('tfoot')).toContainText(selectedTotal!.trim());
 await expect(navigator.getByRole('table',{name:'LO och UO Övergripande'})).toContainText('LO 1');
 await expect(matrix).toContainText('LO 1');

 // Incomplete activity allocations must not be misclassified as maintenance.
 await view.getByRole('checkbox',{name:'Förvaltning',exact:true}).uncheck();
 await expect(total).toHaveText('0 h');
 await expect(view.getByText('Ofullständig täckning:',{exact:false})).toBeVisible();
 await view.getByRole('checkbox',{name:'Förvaltning',exact:true}).check();
 await expect(total).toHaveText(selectedTotal!.trim());

 await page.reload();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 await expect(page.locator('.canonical-analytics .canonical-result-head strong')).toHaveText('320 h');
 await page.locator('.canonical-analytics details.organization-year-details > summary').click();
 await expect(page.getByRole('table',{name:'Organisation per år'})).toHaveCount(1);
});
