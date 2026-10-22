import {test,expect} from '@playwright/test';
const views=['Översikt','Import','Analys','Grupper','Relationer','Fördelningar','Planering','Konfiguration','Inställningar'];
test('400 percent zoom equivalent viewport reflow of critical controls',async({browser})=>{
 const context=await browser.newContext({viewport:{width:320,height:720},deviceScaleFactor:1});
 const page=await context.newPage();
 await page.goto('./');
 for(const name of views){
  await page.getByRole('button',{name,exact:true}).click();
  await expect(page.getByRole('main')).toBeVisible();
  const outside=await page.locator('main').evaluate(main=>{
   const max=innerWidth;return Array.from(main.querySelectorAll('input,button,textarea,select')).filter(el=>{
    const r=el.getBoundingClientRect();return r.width>0&&(r.right>max+2||r.left< -2)
   }).map(el=>el.getAttribute('aria-label')||el.textContent?.trim().slice(0,50)||el.tagName)
  });
  expect(outside,name).toEqual([]);
 }
 await context.close();
});
test('navigation sequence is reachable without mouse',async({page})=>{
 await page.goto('./');
 await page.keyboard.press('Tab');
 await expect(page.getByRole('link',{name:'Hoppa till innehållet'})).toBeFocused();
 const items=['Översikt','Import','Analys','Grupper','Relationer','Fördelningar','Planering','Konfiguration','Inställningar'];
 for(const name of items){
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name,exact:true})).toBeFocused();
 }
 await page.keyboard.press('Enter');
 await expect(page.getByRole('button',{name:'Inställningar'})).toHaveAttribute('aria-current','page');
});
