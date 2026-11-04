import type {AllocationDiagnostic} from '../domain/preparedAnalysis';

type Help={title:string;explanation:string;action:string};

/** User-facing guidance derived only from the diagnostic category; keep raw details for support. */
export function allocationDiagnosticHelp(code:AllocationDiagnostic['code']):Help{
 switch(code){
  case 'STALE_OR_INVALID_APPROVAL':return {
   title:'En sparad LO-fördelning behöver ses över',
   explanation:'En tidigare sparad fördelning gäller inte längre för det aktuella importunderlaget.',
   action:'Öppna Fördelningar, kontrollera LO-andelarna och spara en aktuell fördelning.'
  };
  case 'AUTO_ALLOCATION_FAILED':return {
   title:'Automatisk LO-fördelning kunde inte beräknas',
   explanation:'Det importerade UO-underlaget kunde inte fördelas automatiskt till LO.',
   action:'Kontrollera att UO- och LO-värdena är fullständiga och överensstämmer. Se sedan över fördelningen.'
  };
  case 'INCOMPLETE_IMPORTED_LO_ACTIVITY':return {
   title:'Importerade LO-värden är ofullständiga',
   explanation:'Minst ett LO saknar de importerade aktivitetsvärden som behövs för fördelningen.',
   action:'Kontrollera källfilens uppgifter om utveckling och förvaltning för berörda LO.'
  };
  case 'MANUAL_REBALANCE_FAILED':return {
   title:'Manuell UO-fördelning kunde inte stämmas av',
   explanation:'De valda andelarna gick inte att fördela mellan LO med bibehållna låsta värden.',
   action:'Kontrollera de låsta LO-värdena och justera fördelningen under Fördelningar.'
  };
 }
}

export const diagnosticMetricLabel=(metric:AllocationDiagnostic['metric']):string=>({
 it_hours:'IT-timmar',business_hours:'Verksamhetstimmar',consultant_cost:'Konsultkostnader',other_cost:'Övriga kostnader'
})[metric];
