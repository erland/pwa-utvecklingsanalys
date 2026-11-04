import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import DepartmentDemandBreakdown from './DepartmentDemandBreakdown';
import DepartmentDemandTrend from './DepartmentDemandTrend';
import type {DepartmentDemandObservation} from '../domain/semantic';

const rows=[
 {id:'10',label:'Avdelning A',itHours:40,businessHours:10,total:50},
 {id:'20',label:'Avdelning B',itHours:30,businessHours:20,total:50}
];
const observation=(year:number,departmentCode:string,hours:number):DepartmentDemandObservation=>({
 id:year+'-'+departmentCode,uoId:'uo:A',departmentCode,departmentCodeRaw:departmentCode,
 departmentName:departmentCode==='10'?'Avdelning A':'Avdelning B',
 year,metric:'it_hours',hours,anchoringStatus:'',comments:[],
 source:{datasetId:'fixture',fileName:'test.xlsx',sheet:'Timmar per avdelning',cell:'A1'}
});
describe('release review: department charts, tables and filters',()=>{
 it('exposes the same drilldown in chart legend and table without changing row totals',()=>{
  const html=renderToStaticMarkup(createElement(DepartmentDemandBreakdown,{
   title:'Efterfrågade timmar per avdelning',rows,onSelect:()=>{}
  }));
  expect((html.match(/>Avdelning A<\/button>/g)??[])).toHaveLength(2);
  expect((html.match(/>Avdelning B<\/button>/g)??[])).toHaveLength(2);
  expect(html).toContain('Totalt 100 timmar');
  expect(html).toContain('50 h');
  expect(html).toContain('100 h');
  const detail=renderToStaticMarkup(createElement(DepartmentDemandBreakdown,{
   title:'Fördjupning',rows,showPlanningType:true
  }));
  expect(detail).not.toContain('analysis-drilldown-label');
 });
 it('shows all trend years but marks the year selected in the budget overview',()=>{
  const records=[observation(2027,'10',100),observation(2028,'10',120),observation(2028,'20',30)];
  const html=renderToStaticMarkup(createElement(DepartmentDemandTrend,{
   records,metrics:['it_hours'],selectedYear:2028
  }));
  expect(html).toContain('aria-current="date">2028</th>');
  expect(html).toContain('<th>2027</th>');
  expect(html).toContain('2027');
  expect(html).toContain('2028');
  expect(html).toContain('Trenden visar alla tillgängliga år');
  expect(html).toContain('100 h');
  expect(html).toContain('120 h');
  expect(html).toContain('30 h');
 });
});
