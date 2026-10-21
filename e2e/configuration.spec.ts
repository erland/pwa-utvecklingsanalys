import {test,expect} from '@playwright/test';
test('configuration import, version history and restore',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Konfiguration'}).click();
 await expect(page.getByRole('heading',{name:'Konfigurationspaket'})).toBeVisible();
 await expect(page.getByText(/1 revisionsposter/)).toBeVisible();
 const pkg={format:'utvecklingsanalys-config',version:1,exportedAt:'2026-01-01T00:00:00Z',mode:'definitions-only',sections:{mappings:{Budget:{sheet:'Ny budget',uoCell:'B1',headerRow:11,areaColumn:2,labelColumn:3,startRow:19}}}};
 await page.getByLabel('Välj konfigurationsfil').setInputFiles({name:'configuration.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pkg))});
 await expect(page.getByText('0 konflikter.')).toBeVisible();
 await page.getByRole('button',{name:'Bekräfta import'}).click();
 await expect(page.getByRole('status')).toContainText('Konfiguration importerad');
 await expect(page.getByText(/2 revisionsposter/)).toBeVisible();
 await page.getByRole('button',{name:'Återställ'}).first().click();
 await expect(page.getByRole('status')).toContainText('Tidigare konfiguration återställd');
 await expect(page.getByText(/3 revisionsposter/)).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:'Konfiguration'}).click();
 await expect(page.getByText(/3 revisionsposter/)).toBeVisible();
});
