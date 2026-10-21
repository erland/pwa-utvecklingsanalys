import {test,expect} from '@playwright/test';
test('backup download and import review',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Inställningar'}).click();
 const button=page.getByRole('button',{name:'Ladda ner projektbackup'});
 await expect(button).toBeVisible();
 const event=page.waitForEvent('download');
 await button.click();
 const download=await event;
 expect(download.suggestedFilename()).toContain('projekt');
});
