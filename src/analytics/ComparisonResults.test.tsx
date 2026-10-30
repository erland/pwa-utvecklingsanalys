import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import ComparisonResults from './ComparisonResults';

describe('DEV-140 clickable analysis labels',()=>{
 it('makes UO/LO/part names interactive without separate Visa buttons in the table',()=>{
  const html=renderToStaticMarkup(createElement(ComparisonResults,{title:'UO i analys',totalLabel:'Totalt',unit:'h',rows:[{key:'a',label:'UO A',value:50}],onOpen:()=>{}}));
  expect(html).toContain('>UO A</button>');
  expect(html).toContain('analysis-drilldown-label');
  expect(html).not.toContain('Fördjupning');
  expect(html).not.toContain('Visa LO');
 });
 it('makes legend names interactive in the default pie chart',()=>{
  const html=renderToStaticMarkup(createElement(ComparisonResults,{title:'LO i analys',totalLabel:'Totalt',unit:'h',rows:[{key:'a',label:'LO A',value:50},{key:'b',label:'UO Övergripande',value:30}],onOpen:()=>{}}));
  expect(html).toContain('>LO A</button>');
  expect(html).toContain('>UO Övergripande</button>');
  expect(html).not.toContain('Visa delpost');
 });
 it('keeps plain labels when a drilldown is unavailable',()=>{
  const html=renderToStaticMarkup(createElement(ComparisonResults,{title:'Vald delpost',totalLabel:'Totalt',unit:'h',rows:[{key:'a',label:'LO A',value:50}]}));
  expect(html).not.toContain('analysis-drilldown-label');
 });
});
