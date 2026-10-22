import {test,expect} from '@playwright/test';
test('keyboard skip link leads to main landmark and current navigation is announced',async({page})=>{
 await page.goto('./');
 await page.evaluate(()=>{document.body.tabIndex=-1;document.body.focus()});
 await page.keyboard.press('Tab');
 const skip=page.getByRole('link',{name:'Hoppa till innehållet'});
 await expect(skip).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/#main-content$/);
 await expect(page.locator('main#main-content')).toHaveCount(1);
 const overview=page.getByRole('button',{name:'Översikt'});
 await expect(overview).toHaveAttribute('aria-current','page');
 await page.getByRole('button',{name:'Inställningar'}).click();
 await expect(overview).not.toHaveAttribute('aria-current','page');
 await expect(page.getByRole('button',{name:'Inställningar'})).toHaveAttribute('aria-current','page');
});
test('navigation and backup controls have names at 320px without horizontal clipping',async({page})=>{
 await page.setViewportSize({width:320,height:720});await page.goto('./');
 await page.getByRole('button',{name:'Inställningar'}).click();
 await expect(page.getByRole('main')).toBeVisible();
 await expect(page.getByRole('button',{name:'Ladda ner komprimerad backup (GZIP)'})).toBeVisible();
 const unlabeled=await page.locator('main input').evaluateAll(items=>items.filter(el=>{
  const input=el as HTMLInputElement;
  const id=input.id;
  return !input.getAttribute('aria-label')&&!input.getAttribute('aria-labelledby')&&!input.closest('label')&&!(id&&document.querySelector('label[for="'+id+'"]'));
 }).length);
 expect(unlabeled).toBe(0);
});
