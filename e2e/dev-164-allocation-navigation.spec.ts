import {test,expect} from '@playwright/test';
test('DEV-164 overview is unselected and period is chosen only on overview',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Fördelningar',exact:true}).click();
 const view=page.getByRole('region',{name:'Valfria fördelningar'});
 await expect(view.getByLabel('Aktuell fördelningstyp')).toHaveCount(0);
 await expect(view.getByLabel('Fördelningsår')).toHaveCount(0);
 await expect(view.getByRole('region',{name:'Översikt fördelningstyper'})).toBeVisible();
 await expect(view.getByLabel('Översiktsperiod')).toBeVisible();
});
