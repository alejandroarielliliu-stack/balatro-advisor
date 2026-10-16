/** Qualitative priorities, no exchange rate between dollars, chips and counters. */
export const POLICY = Object.freeze({ version: 'h3-2', maxScenarios: 20,
  coverage: 'H-COVERAGE', economy: 'H-ECONOMY', progress: 'H-PROGRESS', incomplete: 'H-INCOMPLETE', persistence:'H-PERSISTENCE' });
export interface Metrics {
  scenarioId: string; reached: boolean; score: number; margin: number;
  handsUsed: number; discardsUsed: number; moneyAfterShop: number | null; moneyAfterRound: number | null;
  terminalGoal: boolean; persistentBenefits:string[];
}
export interface Preference { preferred: string; over: string; ruleId: string; scenarioIds: string[]; explanation: string }
/** Called only on fully comparable scenario vectors, aligned by scenario ID. */
export function prefer(a: Metrics[], b: Metrics[]): Omit<Preference, 'preferred'|'over'> | null {
  const ids = a.map(x => x.scenarioId);
  if (a.some((x,i) => !x.reached && b[i]!.reached)) return null;
  if (a.some((x,i) => x.reached && !b[i]!.reached)) return { ruleId:POLICY.coverage, scenarioIds:ids,
    explanation:'Supera un conjunto estrictamente mayor de los planes aportados sin perder ninguno ya superado. Se prioriza esa cobertura sobre el gasto, solo en estos escenarios.' };
  const allReached = a.every(x => x.reached);
  const deltas: number[] = [];
  for (let i=0; i<a.length; i++) {
    const x=a[i]!, y=b[i]!;
    // Do not price away a demonstrated persistent benefit when coverage is unchanged.
    if(y.persistentBenefits.some(benefit=>!x.persistentBenefits.includes(benefit))) return null;
    if (x.moneyAfterShop === null || y.moneyAfterShop === null) return null;
    deltas.push(x.moneyAfterShop-y.moneyAfterShop, y.handsUsed-x.handsUsed, y.discardsUsed-x.discardsUsed);
    if (x.reached) {
      if (!(x.terminalGoal && y.terminalGoal)) {
        if (x.moneyAfterRound === null || y.moneyAfterRound === null) return null;
        deltas.push(x.moneyAfterRound-y.moneyAfterRound);
      }
    } else deltas.push(x.margin-y.margin);
  }
  if (deltas.every(d=>d>=0) && deltas.some(d=>d>0)) return { ruleId:allReached ? POLICY.economy : POLICY.progress, scenarioIds:ids,
    explanation:allReached ? 'Todos estos planes vencen; no usa más manos/descartes ni deja menos dinero en ninguna dimensión, y mejora al menos una. El exceso de puntos no recibe un precio ficticio.'
      : 'Misma cobertura; mejora alguna dimensión sin empeorar dinero, recursos ni margen de los planes que no vencen. No demuestra capacidad de ganar.' };
  return null;
}
