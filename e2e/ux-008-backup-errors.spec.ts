import {test,expect} from '@playwright/test';

test('UX-008: invalid backup explains the problem and keeps technical information optional',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 const picker=page.getByLabel('Välj projektbackup');
 const restore=page.getByRole('button',{name:'Bekräfta återställning'});
 await picker.setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"not":"a backup"}')});
 await expect(page.getByRole('status')).toContainText('backupformatet känns inte igen');
 await expect(page.getByRole('status')).not.toContainText('UNSUPPORTED_BACKUP_VERSION');
 await expect(restore).toBeDisabled();
 const details=page.getByText('Tekniska detaljer om den avvisade filen');
 await expect(details).toBeVisible();
 await details.click();
 await expect(page.getByText('UNSUPPORTED_BACKUP_VERSION', {exact:true})).toBeVisible();
 await picker.setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{broken json')});
 await expect(page.getByRole('status')).toContainText('inte giltig JSON');
 await expect(restore).toBeDisabled();
 await expect(page.getByRole('region',{name:'Granska återställning'})).toHaveCount(0);
});
