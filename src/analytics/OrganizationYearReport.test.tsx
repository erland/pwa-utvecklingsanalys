import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import OrganizationYearReport from './OrganizationYearReport';
import type {GroupYearMatrix} from './canonicalGroupYears';

describe('IP-009 organization-year report presentation',()=>{
 const matrix:GroupYearMatrix={
  years:[2027,2028],unit:'h',
  rows:[
   {key:'uo:a',label:'UO A',values:[100,null],total:100},
   {key:'uo:b',label:'UO B',values:[50,60],total:110}
  ],
  yearTotals:[150,60],total:210
 };
 it('keeps line graph and exact year table with missing cells not converted to zero',()=>{
  const html=renderToStaticMarkup(createElement(OrganizationYearReport,{matrix}));
  expect(html).toContain('Utveckling per organisationsdel och tabell');
  expect(html).toContain('Linjediagram för utveckling per organisationsdel');
  expect(html).toContain('Organisation per år');
  expect(html).toContain('UO A');
  expect(html).toContain('UO B');
  expect(html).toContain('2027');
  expect(html).toContain('2028');
  expect(html).toContain('100 h');
  expect(html).toContain('60 h');
  expect(html).toContain('210 h');
  expect(html).toMatch(/<td[^>]*>–<\/td>/);
  expect(html).toContain('Streck betyder saknat värde, inte noll.');
 });
 it('preserves the empty state without rendering a year matrix',()=>{
  const html=renderToStaticMarkup(createElement(OrganizationYearReport,{matrix:null}));
  expect(html).toContain('Inga årsvärden för aktuellt urval.');
  expect(html).not.toContain('aria-label="Organisation per år"');
 });
 it('retains Swedish formatting for cost values',()=>{
  const costs:GroupYearMatrix={years:[2027],unit:'SEK',rows:[{key:'a',label:'UO A',values:[1234.5],total:1234.5}],yearTotals:[1234.5],total:1234.5};
  const html=renderToStaticMarkup(createElement(OrganizationYearReport,{matrix:costs}));
  expect(html).toContain('1 234,5 SEK');
 });
});
