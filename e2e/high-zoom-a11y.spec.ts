import {test,expect} from '@playwright/test';
const views=['Översikt','Import','Analys','Grupper','Relationer','Fördelningar','Planering','Konfiguration','Inställningar'];
test('400 percent text size: essential controls remain inside responsive content',async({page})=>{
 await page.setViewportSize({width:320,height:720});
 await page.goto('./');
 await page.evaluate(()=>{document.documentElement.style.fontSize='64px'});
 for(const name of views){
  await page.getByRole('button',{name,exact:true}).click();
  await expect(page.getByRole('main')).toBeVisible();
  const clipped=await page.locator('main').evaluate(main=>{
   const max=document.documentElement.clientWidth;const issues:string[]=[];
   for(const el of Array.from(main.querySelectorAll('button,input,select,textarea'))){
    const box=el.getBoundingClientRect();
    if(box.width>0&&(box.right>max+2||box.left< -2))issues.push((el.getAttribute('aria-label')||el.textContent||el.tagName).trim().slice(0,50));
   }
   return issues;
  });
  expect(clipped,name).toEqual([]);
 }
});
test('keyboard reachability of planning input and navigation at 320px',async({page})=>{
 await page.setViewportSize({width:320,height:720});await page.goto('./');
 const button=page.getByRole('button',{name:'Planering'});
 await button.focus();await page.keyboard.press('Enter');
 await expect(button).toHaveAttribute('aria-current','page');
 const year=page.getByRole('spinbutton',{name:'Planeringsår'});
 await year.focus();await expect(year).toBeFocused();
 await page.keyboard.press('ArrowUp');await expect(year).toHaveValue('2028');
});
