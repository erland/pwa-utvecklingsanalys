import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

async function sourceFile(name:string,uo:string,first:number,second:number){
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: '+uo;
 sheet.getCell('D11').value=2027;
 sheet.getCell('E11').value=2028;
 sheet.getCell('B25').value='Gemensam';
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
 console.log('DEV114 ANALYSIS DIAGNOSTIC:',await view.innerText());
 await expect(total).toHaveText('320 h');
 await expect(matrix).toHaveCount(1);
 await expect(matrix).toContainText('UO A');
 await expect(matrix).toContainText('UO B');
 await expect(matrix.locator('tfoot')).toContainText('320 h');
 await expect(navigator.getByRole('table',{name:'UO i analys'})).toContainText('UO A');
 await expect(navigator.getByRole('table',{name:'UO i analys'})).toContainText('UO B');
 await expect(view.getByRole('region',{name:'Fördjupade analysrapporter'})).toHaveCount(0);

 // Source filtering must apply to the navigator and annual reports, not just the headline.
 const sources=view.getByRole('group',{name:'Datakällor'});
 await expect(sources.getByRole('checkbox')).toHaveCount(2);
 await sources.getByRole('checkbox').first().check();
 const selectedTotal=await total.textContent();
 expect(['100 h','220 h']).toContain(selectedTotal?.trim());
 await expect(matrix.locator('tfoot')).toContainText(selectedTotal!.trim());
 await expect(navigator.getByRole('table',{name:'UO i analys'}).locator('tbody tr')).toHaveCount(1);
 await sources.getByRole('button',{name:'Alla källor'}).click();
 await expect(total).toHaveText('320 h');

 // Work filters must affect all three views, including the navigator's drilldown.
 const uoFilters=view.getByRole('group',{name:'UO'});
 await uoFilters.getByRole('checkbox',{name:'UO A'}).check();
 await expect(total).toHaveText('100 h');
 await expect(matrix.locator('tfoot')).toContainText('100 h');
 await expect(matrix.locator('tbody')).not.toContainText('UO B');
 await expect(navigator.getByRole('table',{name:'UO i analys'})).not.toContainText('UO B');
 await navigator.getByRole('table',{name:'UO i analys'}).getByRole('button',{name:'Visa LO'}).click();
 await expect(navigator.getByRole('table',{name:'LO och UO Övergripande'})).toContainText('Gemensam');
 await expect(matrix).toContainText('Gemensam');
 await expect(matrix.locator('tfoot')).toContainText('100 h');
 await view.getByRole('group',{name:'LO'}).getByRole('checkbox',{name:'Gemensam'}).check();
 await expect(total).toHaveText('100 h');

 // Incomplete activity allocations must not be misclassified as maintenance.
 await view.getByRole('checkbox',{name:'Förvaltning',exact:true}).uncheck();
 await expect(total).toHaveText('0 h');
 await expect(view.getByText('Ofullständig täckning:',{exact:false})).toBeVisible();
 await view.getByRole('checkbox',{name:'Förvaltning',exact:true}).check();
 await expect(total).toHaveText('100 h');

 await page.reload();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 await expect(page.locator('.canonical-analytics .canonical-result-head strong')).toHaveText('320 h');
 await expect(page.getByRole('table',{name:'Organisation per år'})).toHaveCount(1);
});
