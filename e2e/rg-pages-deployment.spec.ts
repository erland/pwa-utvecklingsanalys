import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
import {readFile} from 'node:fs/promises';

/**
 * RG-09: runs in ordinary CI against Vite preview and in the release workflow
 * against the actual Pages deployment URL (RG_PAGES_URL).
 * Browser storage is isolated; all imported data is generated and synthetic.
 */
const target=process.env.RG_PAGES_URL??'./';
test('RG-09: Pages deployment serves a working Excel import, analysis, export and persisted project',async({browser})=>{
 const context=await browser.newContext({acceptDownloads:true});
 try{
  const page=await context.newPage();
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(target);
  await expect(page.getByRole('heading',{name:'Överblick över verksamhetsutvecklingen'})).toBeVisible();
  const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('UO Tot 2027-30');
  sheet.getCell('B1').value='UO: Pages Test';
  sheet.getCell('D11').value=2027;
  sheet.getCell('E11').value=2028;
  sheet.getCell('B25').value='LO 1';
  sheet.getCell('C26').value='IT timmar (h)';
  sheet.getCell('D26').value=42;
  sheet.getCell('E26').value=58;

  await page.getByRole('button',{name:'Import',exact:true}).click();
  await page.locator('#direct-import-files').setInputFiles({
   name:'rg-pages-test.xlsx',
   mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
   buffer:Buffer.from(await workbook.xlsx.writeBuffer())
  });
  await expect(page.getByRole('status').filter({hasText:'rg-pages-test.xlsx'})).toContainText('importerad');
  await page.getByRole('button',{name:'Analys',exact:true}).click();
  const total=page.locator('.canonical-analytics .canonical-result-head strong');
  await expect(total).toHaveText('100 h');
  await page.getByLabel('period',{exact:true}).selectOption('2027');
  await expect(total).toHaveText('42 h');
  await page.getByLabel('period',{exact:true}).selectOption('2028');
  await expect(total).toHaveText('58 h');
  const csvPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Exportera analys som CSV'}).click();
  const csvText=await readFile(await (await csvPromise).path(),'utf8');
  expect(csvText).toContain('"Årstrend";"2027";"";"it_hours";"42";"h"');
  expect(csvText).toContain('"Årstrend";"2028";"";"it_hours";"58";"h"');

  await page.getByRole('button',{name:'Inställningar',exact:true}).click();
  const backupPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Ladda ner projektbackup'}).click();
  const backup=JSON.parse(await readFile(await (await backupPromise).path(),'utf8'));
  expect(backup.version).toBe(3);
  expect(backup.canonical.records.length).toBeGreaterThan(0);
  expect(backup.project.datasets).toHaveLength(1);

  await page.reload();
  await page.getByRole('button',{name:'Analys',exact:true}).click();
  await expect(page.locator('.canonical-result-head strong')).toHaveText('100 h');
  expect(errors).toEqual([]);
 }finally{await context.close()}
},120_000);
