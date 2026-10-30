import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

async function source(name:string,uo:string,a:number,b:number){
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: '+uo;
 sheet.getCell('D11').value=2027;
 sheet.getCell('E11').value=2028;
 sheet.getCell('B25').value='LO A';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=a;
 sheet.getCell('E26').value=b;
 return {name,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())};
}

test('DEV-124 organization lines track year matrix and hierarchy selection',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles([
  await source('dev124-a.xlsx','UO A',40,55),await source('dev124-b.xlsx','UO B',70,85)
 ]);
 await expect(page.getByRole('status').filter({hasText:'Importresultat'})).toContainText('dev124-b.xlsx');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const lines=page.getByRole('region',{name:'Årsvis utveckling per organisationsdel'});
 await expect(lines.getByRole('img',{name:'Linjediagram för utveckling per organisationsdel'})).toBeVisible();
 await expect(lines.getByRole('list',{name:'Diagramförklaring'})).toContainText('UO A');
 await expect(lines.getByRole('list',{name:'Diagramförklaring'})).toContainText('UO B');
 // Series remain distinguishable without relying on color alone; legend matches line patterns.
 const seriesPaths=lines.locator('svg[role="img"] path');
 await expect(seriesPaths).toHaveCount(2);
 await expect(seriesPaths.nth(0)).toHaveAttribute('stroke-dasharray','');
 await expect(seriesPaths.nth(1)).toHaveAttribute('stroke-dasharray','9 4');
 const legendSamples=lines.getByRole('list',{name:'Diagramförklaring'}).locator('svg line');
 await expect(legendSamples.nth(1)).toHaveAttribute('stroke-dasharray','9 4');
 const matrix=page.getByRole('table',{name:'Organisation per år'});
 await expect(matrix).toContainText('UO A');
 await expect(matrix).toContainText('UO B');
 const navigator=page.getByRole('region',{name:'Utforska UO'});
 await navigator.getByRole('group',{name:'Cirkeldiagram: UO i analys'}).getByRole('button',{name:'UO A',exact:true}).click();
 await expect(lines.getByRole('list',{name:'Diagramförklaring'})).toContainText('LO A');
 // Year trends belong to multi-year analysis only; the current-year result remains.
 await page.getByLabel('period',{exact:true}).selectOption('2027');
 await expect(page.getByRole('region',{name:'Årsvis utveckling för valt organisationsurval'})).toHaveCount(0);
 await expect(lines).toHaveCount(0);
 await expect(page.locator('.canonical-result-head strong')).toBeVisible();
 await expect(matrix).toBeVisible();
 await page.getByLabel('period',{exact:true}).selectOption('all');
 await expect(page.getByRole('region',{name:'Årsvis utveckling för valt organisationsurval'})).toBeVisible();
 await expect(lines).toBeVisible();
 await expect(matrix).toContainText('LO A');
});
