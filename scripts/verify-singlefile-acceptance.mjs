import {chromium,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

/** RG-09 partial automation: file:// single-file bundle, synthetic data only.
 * This is Chromium coverage, not a substitute for manual Safari/iPad acceptance.
 */
const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('UO Tot 2027-30');
sheet.getCell('B1').value='UO: Standalone Test';
sheet.getCell('D11').value=2027;
sheet.getCell('E11').value=2028;
sheet.getCell('B25').value='LO 1';
sheet.getCell('C26').value='IT timmar (h)';
sheet.getCell('D26').value=42;
sheet.getCell('E26').value=58;
const buffer=Buffer.from(await workbook.xlsx.writeBuffer());
const url=pathToFileURL(resolve('dist-singlefile/index.html')).href;
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({acceptDownloads:true});
 try{
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  await expect(page.getByRole('heading',{name:'Överblick över verksamhetsutvecklingen'})).toBeVisible();
  await page.getByRole('button',{name:'Import',exact:true}).click();
  await page.locator('#direct-import-files').setInputFiles({
   name:'rg-standalone.xlsx',
   mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
   buffer
  });
  await expect(page.getByRole('status').filter({hasText:'rg-standalone.xlsx'})).toContainText('importerad');
  await page.getByRole('button',{name:'Analys',exact:true}).click();
  const analysis=page.locator('.canonical-analytics');
  await expect(analysis.locator('.canonical-result-head strong')).toHaveText('100 h');
  await analysis.getByLabel('period',{exact:true}).selectOption('2027');
  await expect(analysis.locator('.canonical-result-head strong')).toHaveText('42 h');
  await analysis.getByLabel('period',{exact:true}).selectOption('2028');
  await expect(analysis.locator('.canonical-result-head strong')).toHaveText('58 h');

  const csvPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Exportera analys som CSV'}).click();
  const csv=await csvPromise;
  const csvText=await readFile(await csv.path(),'utf8');
  if(!csvText.includes('"Årstrend";"2027";"";"it_hours";"42";"h"')||
     !csvText.includes('"Årstrend";"2028";"";"it_hours";"58";"h"'))
   throw new Error('Standalone CSV does not match source annual totals');

  await page.getByRole('button',{name:'Inställningar',exact:true}).click();
  const backupPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Ladda ner projektbackup'}).click();
  const backup=JSON.parse((await readFile(await (await backupPromise).path())).toString('utf8'));
  if(backup.version!==3||backup.canonical.records.length===0||backup.project.datasets.length!==1)
   throw new Error('Standalone backup does not include the expected project records');

  await page.reload();
  await page.getByRole('button',{name:'Analys',exact:true}).click();
  await expect(page.locator('.canonical-result-head strong')).toHaveText('100 h');
  if(errors.length)throw new Error('Standalone browser runtime error: '+errors.join(' | '));
  console.info('RG_STANDALONE_FILE PASS: import, years, CSV, backup, reload (Chromium file://)');
 }finally{await context.close()}
}finally{await browser.close()}
