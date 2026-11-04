import {test,expect} from '@playwright/test';

test('UX-006: narrow mobile menu is discoverable and scrolls with keyboard-accessible controls',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 await page.goto('./');
 const nav=page.getByRole('navigation',{name:'Huvudmeny'});
 const left=page.getByRole('button',{name:'Bläddra menyn åt vänster'});
 const right=page.getByRole('button',{name:'Bläddra menyn åt höger'});
 await expect(page.getByText('Fler vyer? Svep menyn eller använd pilarna.')).toBeVisible();
 await expect(left).toBeVisible();
 await expect(right).toBeVisible();
 const before=await nav.evaluate(el=>el.scrollLeft);
 await right.focus();
 await page.keyboard.press('Enter');
 await expect.poll(()=>nav.evaluate(el=>el.scrollLeft)).toBeGreaterThan(before);
 await left.focus();
 await page.keyboard.press('Enter');
 await expect.poll(()=>nav.evaluate(el=>el.scrollLeft)).toBeLessThan(200);
 await nav.getByRole('button',{name:'Inställningar',exact:true}).click();
 await expect(nav.getByRole('button',{name:'Inställningar',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.getByRole('heading',{name:'Inställningar'})).toBeVisible();
 await expect(page.locator('.topbar')).not.toContainText('DEV-011');
 const viewport=await page.evaluate(()=>document.documentElement.clientWidth);
 expect(viewport).toBe(320);
});

test('UX-006: tablet displays menu guidance while desktop retains full sidebar',async({page})=>{
 await page.setViewportSize({width:820,height:900});
 await page.goto('./');
 await expect(page.getByRole('button',{name:'Bläddra menyn åt höger'})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Huvudmeny'})).toBeVisible();
 await page.setViewportSize({width:1280,height:900});
 await expect(page.getByRole('button',{name:'Bläddra menyn åt höger'})).toBeHidden();
 await expect(page.getByRole('navigation',{name:'Huvudmeny'})).toBeVisible();
});
