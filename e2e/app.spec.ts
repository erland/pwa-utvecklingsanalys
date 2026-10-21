import {test,expect} from '@playwright/test';

test('navigation, empty analysis and local project persistence',async({page})=>{
 await page.goto('./');
 await expect(page.getByRole('heading',{name:'Överblick över verksamhetsutvecklingen'})).toBeVisible();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 await expect(page.getByText('Inga importerade analysvärden ännu')).toBeVisible();
 await page.getByRole('button',{name:'Inställningar'}).click();
 const input=page.getByLabel('Namn på lokalt projekt');
 await expect(input).toBeEnabled();
 await input.fill('Testprojekt');
 await expect.poll(async()=>page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
   const req=indexedDB.open('utvecklingsanalys');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  return new Promise<string>((resolve,reject)=>{
   const req=db.transaction('projects','readonly').objectStore('projects').get('active');
   req.onsuccess=()=>{resolve(req.result?.name??'');db.close()};req.onerror=()=>reject(req.error);
  });
 })).toBe('Testprojekt');
 await page.reload();
 await expect(page.getByText('Testprojekt')).toBeVisible();
});

test('PWA manifest and offline reload',async({page,context})=>{
 await page.goto('./');
 await expect(page.getByRole('heading',{name:'Överblick över verksamhetsutvecklingen'})).toBeVisible();
 await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href',/manifest/);
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload();
 await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
 await context.setOffline(true);
 await page.reload();
 await expect(page.getByRole('heading',{name:'Överblick över verksamhetsutvecklingen'})).toBeVisible();
 await context.setOffline(false);
});
