import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import ExcelJS from 'exceljs';

/** Release acceptance is synthetic: never put production Excel data into CI. */
async function source(name:string,uo:string,year2027:number,year2028:number){
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: '+uo;
 sheet.getCell('D11').value=2027;
 sheet.getCell('E11').value=2028;
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=year2027;
 sheet.getCell('E26').value=year2028;
 return {name,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer:Buffer.from(await workbook.xlsx.writeBuffer())};
}

async function assertProject(page:Page){
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const analysis=page.locator('.canonical-analytics');
 const total=analysis.locator('.canonical-result-head strong');
 await expect(total).toHaveText('100 h');
 const matrix=analysis.getByRole('table',{name:'Organisation per år'});
 await expect(matrix).toContainText('UO A');
 await expect(matrix).toContainText('UO B');
 await expect(matrix).toContainText('2027');
 await expect(matrix).toContainText('2028');
 await expect(matrix.locator('tfoot')).toContainText('100 h');
 await expect(analysis.getByRole('img',{name:'Linjediagram för utveckling per organisationsdel'})).toBeVisible();
 await analysis.getByLabel('period',{exact:true}).selectOption('2027');
 await expect(total).toHaveText('40 h');
 await expect(matrix).toHaveCount(0);
 await analysis.getByLabel('period',{exact:true}).selectOption('2028');
 await expect(total).toHaveText('60 h');
 await analysis.getByLabel('period',{exact:true}).selectOption('all');
 await expect(total).toHaveText('100 h');
}

test('RG synthetic acceptance: two Excel sources, annual analysis, CSV and backup restore in separate browser context',async({browser})=>{
 const sourceContext=await browser.newContext({acceptDownloads:true});
 try{
  const page=await sourceContext.newPage();
  await page.goto('./');
  await page.getByRole('button',{name:'Import',exact:true}).click();
  await page.locator('#direct-import-files').setInputFiles([
   await source('rg-a.xlsx','UO A',10,20),
   await source('rg-b.xlsx','UO B',30,40)
  ]);
  const imports=page.getByRole('status').filter({hasText:'Importresultat'});
  await expect(imports).toContainText('rg-a.xlsx');
  await expect(imports).toContainText('rg-b.xlsx');
  await expect(imports).not.toContainText('Inte importerad');
  await assertProject(page);

  const csvPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Exportera analys som CSV'}).click();
  const csv=await csvPromise;
  expect(csv.suggestedFilename()).toBe('analys.csv');
  const csvText=(await readFile(await csv.path())).toString('utf8');
  expect(csvText).toContain('"Årstrend";"2027";"";"it_hours";"40";"h"');
  expect(csvText).toContain('"Årstrend";"2028";"";"it_hours";"60";"h"');

  await page.getByRole('button',{name:'Inställningar',exact:true}).click();
  const backupPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Ladda ner projektbackup'}).click();
  const backupFile=await backupPromise;
  const backupBytes=await readFile(await backupFile.path());
  const backup=JSON.parse(backupBytes.toString('utf8'));
  expect(backup.version).toBe(3);
  expect(backup.canonical.records.length).toBeGreaterThan(0);
  expect(backup.project.datasets).toHaveLength(2);

  const targetContext=await browser.newContext({acceptDownloads:true});
  try{
   const target=await targetContext.newPage();
   await target.goto('./');
   await target.getByRole('button',{name:'Inställningar',exact:true}).click();
   await target.getByLabel('Välj projektbackup').setInputFiles({
    name:'rg-project-backup.json',mimeType:'application/json',buffer:backupBytes
   });
   await expect(target.getByRole('status')).toContainText('Validerad backup');
   await target.getByRole('button',{name:'Bekräfta återställning'}).click();
   await expect(target.getByRole('status')).toContainText('Projekt återställt');
   await target.reload();
   await assertProject(target);
  }finally{await targetContext.close()}
 }finally{await sourceContext.close()}
});
