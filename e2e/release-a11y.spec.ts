import {test,expect} from '@playwright/test';
const views=['Översikt','Import','Analys','Grupper','Relationer','Fördelningar','Planering','Konfiguration','Inställningar'];
test('release accessibility sweep across all primary views',async({page})=>{
 await page.goto('./');
 for(const name of views){
  await page.getByRole('button',{name,exact:true}).click();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('button',{name,exact:true})).toHaveAttribute('aria-current','page');
  const issues=await page.locator('main').evaluate(root=>{
   const result:string[]=[];
   const inputElements=Array.from(root.querySelectorAll('input,textarea,select'));
   for(const element of inputElements){
    const label=element.getAttribute('aria-label')||element.getAttribute('aria-labelledby')||element.id&&document.querySelector('label[for="'+element.id+'"]')?.textContent||element.closest('label')?.textContent;
    if(!label?.trim())result.push('Unlabeled control: '+element.outerHTML.slice(0,100));
   }
   for(const image of Array.from(root.querySelectorAll('img'))){
    if(!image.hasAttribute('alt'))result.push('Missing image alt text');
   }
   return result;
  });
  expect(issues, name).toEqual([]);
 }
});
test('200 percent zoom does not clip primary settings actions',async({page})=>{
 await page.setViewportSize({width:640,height:700});
 await page.goto('./');await page.getByRole('button',{name:'Inställningar'}).click();
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
 const control=page.getByRole('button',{name:'Ladda ner komprimerad backup (GZIP)'});
 await expect(control).toBeVisible();
 const box=await control.boundingBox();expect(box).not.toBeNull();
 expect(box!.x+box!.width).toBeLessThanOrEqual(641);
});
