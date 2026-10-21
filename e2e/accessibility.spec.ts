import {test,expect} from '@playwright/test';
test('mobile navigation, keyboard operation and labeled backup controls',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('./');
 await expect(page.getByRole('navigation',{name:'Huvudmeny'})).toBeVisible();
 const settings=page.getByRole('button',{name:'Inställningar'});
 await settings.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Inställningar'})).toBeVisible();
 await expect(page.getByLabel('Välj projektbackup')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Exportera observationer XLSX'})).toBeVisible();
});
