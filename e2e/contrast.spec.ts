import {test,expect} from '@playwright/test';
const views=['Översikt','Import','Analys','Grupper','Relationer','Fördelningar','Planering','Konfiguration','Inställningar'];
test('WCAG contrast scan of primary view text and controls',async({page})=>{
 await page.goto('./');
 for(const name of views){
  await page.getByRole('button',{name,exact:true}).click();
  const violations=await page.evaluate(()=>{
   const parse=(color:string)=>{const m=color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);return m?[Number(m[1]),Number(m[2]),Number(m[3])]:null};
   const luminance=(rgb:number[])=>{const channels=rgb.map(c=>{const x=c/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*channels[0]+.7152*channels[1]+.0722*channels[2]};
   const ratio=(a:number[],b:number[])=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
   const issues:string[]=[];
   for(const el of Array.from(document.querySelectorAll('main h1,main h2,main h3,main p,main label,main button,main th,main td,nav button'))){
    if(!(el instanceof HTMLElement)||el.getClientRects().length===0)continue;
    const style=getComputedStyle(el);const fg=parse(style.color);if(!fg)continue;
    let parent:HTMLElement|null=el;let bg:number[]|null=null;
    while(parent){const c=getComputedStyle(parent);const color=parse(c.backgroundColor);if(color&&c.backgroundColor.match(/rgba?\([^)]*\)/)&&!c.backgroundColor.endsWith(', 0)')){bg=color;break}parent=parent.parentElement}
    if(!bg)bg=[255,255,255];
    const large=parseFloat(style.fontSize)>=24||parseFloat(style.fontSize)>=18.66&&Number(style.fontWeight)>=700;
    if(ratio(fg,bg)<(large?3:4.5))issues.push(el.tagName+' '+(el.textContent??'').trim().slice(0,60)+' ratio '+ratio(fg,bg).toFixed(2));
   }
   return issues;
  });
  expect(violations,name).toEqual([]);
 }
});
