import {expect,test} from '@playwright/test';

test('UX-001: rapid project name edits show last saved value and survive reload',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 const name=page.getByLabel('Namn på lokalt projekt');
 await name.fill('Första namnet');
 await name.fill('Andra namnet');
 await name.fill('Slutligt projektnamn');
 await expect(page.getByRole('status').filter({hasText:'Projektnamnet är sparat.'})).toBeVisible();
 await expect(page.locator('.topbar strong')).toHaveText('Slutligt projektnamn');
 await page.reload();
 await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 await expect(page.getByLabel('Namn på lokalt projekt')).toHaveValue('Slutligt projektnamn');
});

test('UX-001: failed local write explains failure and allows retry',async({page})=>{
 await page.addInitScript(()=>{
  const original=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(...args){
   if(this.name==='projects'&&(window as Window&{__failProjectNameSave?:boolean}).__failProjectNameSave){
    throw new DOMException('Simulated storage failure','QuotaExceededError');
   }
   return original.apply(this,args);
  };
 });
 await page.goto('./');
 await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 await page.evaluate(()=>{(window as Window&{__failProjectNameSave?:boolean}).__failProjectNameSave=true});
 await page.getByLabel('Namn på lokalt projekt').fill('Projektnamn efter retry');
 await expect(page.getByRole('status').filter({hasText:'Projektnamnet kunde inte sparas.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Försök spara igen'})).toBeVisible();
 await page.evaluate(()=>{(window as Window&{__failProjectNameSave?:boolean}).__failProjectNameSave=false});
 await page.getByRole('button',{name:'Försök spara igen'}).click();
 await expect(page.getByRole('status').filter({hasText:'Projektnamnet är sparat.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Försök spara igen'})).toHaveCount(0);
 await page.reload();
 await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 await expect(page.getByLabel('Namn på lokalt projekt')).toHaveValue('Projektnamn efter retry');
});
