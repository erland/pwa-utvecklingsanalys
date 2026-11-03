import {expect,test} from '@playwright/test';

test('KF-005: project name persists through navigation and reload',async({page})=>{
 await page.goto('./');
 await expect(page.getByRole('heading',{name:'Överblick över verksamhetsutvecklingen'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Analys',exact:true})).toHaveAttribute('aria-disabled','true');

 await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 const name=page.getByLabel('Namn på lokalt projekt');
 await expect(name).toBeEnabled();
 await name.fill('KF-005 testprojekt');
 await expect(page.locator('.topbar strong')).toHaveText('KF-005 testprojekt');

 // Wait until the existing serialized IndexedDB write is committed.
 await page.waitForFunction(async()=>{
  const request=indexedDB.open('utvecklingsanalys');
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  const value=await new Promise<{name?:string}|undefined>((resolve,reject)=>{
   const read=db.transaction('projects','readonly').objectStore('projects').get('active');
   read.onsuccess=()=>resolve(read.result);
   read.onerror=()=>reject(read.error);
  });
  db.close();
  return value?.name==='KF-005 testprojekt';
 });

 await page.getByRole('button',{name:'Import',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Importera Excelunderlag'})).toBeVisible();
 await page.getByRole('button',{name:'Översikt',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Överblick över verksamhetsutvecklingen'})).toBeVisible();
 await page.reload();
 await expect(page.locator('.topbar strong')).toHaveText('KF-005 testprojekt');
 await expect(page.getByRole('button',{name:'Analys',exact:true})).toHaveAttribute('aria-disabled','true');
 await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 await expect(page.getByLabel('Namn på lokalt projekt')).toHaveValue('KF-005 testprojekt');
});
