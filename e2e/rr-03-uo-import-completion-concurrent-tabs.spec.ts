import {test,expect,type Page} from '@playwright/test';
import ExcelJS from 'exceljs';

async function enterCompletion(page:Page,development:string,maintenance:string){
 const section=page.getByRole('region',{name:'UO UO A'});
 await expect(section).toBeVisible();
 await section.getByRole('spinbutton',{name:'Utveckling UO A 2027 it_hours'}).fill(development);
 await section.getByRole('spinbutton',{name:'Förvaltning UO A 2027 it_hours'}).fill(maintenance);
}

test('RR-03: concurrent UO import completions reject stale second editor without data loss',async({context})=>{
 const writer=await context.newPage();
 await writer.goto('./');
 await writer.getByRole('button',{name:'Import',exact:true}).click();
 const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=100;
 await writer.locator('#direct-import-files').setInputFiles({
  name:'rr03-missing-uo.xlsx',
  mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer:Buffer.from(await book.xlsx.writeBuffer())
 });
 await expect(writer.getByRole('status').filter({hasText:'rr03-missing-uo.xlsx'})).toContainText('importerad');
 await expect(writer.getByRole('region',{name:'UO UO A'})).toBeVisible();

 const stale=await context.newPage();
 await stale.goto('./');
 await stale.getByRole('button',{name:'Import',exact:true}).click();
 await expect(stale.getByRole('region',{name:'UO UO A'})).toBeVisible();
 await enterCompletion(writer,'60','40');
 await enterCompletion(stale,'80','20');

 await writer.getByRole('button',{name:'Spara UO-värden för UO A'}).click();
 await expect(writer.getByRole('region',{name:'UO UO A'}).getByRole('button',{name:/UO A/})).toContainText('Kompletterat');
 await stale.getByRole('button',{name:'Spara UO-värden för UO A'}).click();
 await expect(stale.getByRole('alert').filter({hasText:'Kompletteringarna har ändrats i en annan flik'})).toBeVisible();

 await stale.reload();
 await stale.getByRole('button',{name:'Import',exact:true}).click();
 const saved=stale.getByRole('region',{name:'UO UO A'});
 await saved.getByRole('button',{name:/UO A/}).click();
 await expect(saved.getByRole('spinbutton',{name:'Utveckling UO A 2027 it_hours'})).toHaveValue('60');
 await expect(saved.getByRole('spinbutton',{name:'Förvaltning UO A 2027 it_hours'})).toHaveValue('40');
 await writer.close();await stale.close();
});
