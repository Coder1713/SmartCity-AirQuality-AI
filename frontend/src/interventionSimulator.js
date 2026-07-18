import { INTERVENTIONS } from './interventionConstants';

function getCategory(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function simulateIntervention(currentAqi, interventionState) {
  let totalReduction = 0;
  const perActionImpact = {};

  INTERVENTIONS.forEach(({ key, maxImpact }) => {
    const pct = interventionState[key] || 0;
    const impact = (pct / 100) * maxImpact;
    perActionImpact[key] = impact;
    totalReduction += impact;
  });

  const predictedAqi = Math.max(0, Math.round(currentAqi - totalReduction));
  const improvementPct = currentAqi > 0 ? Math.round((totalReduction / currentAqi) * 100) : 0;

  const mostEffectiveKey = Object.keys(perActionImpact).reduce(
    (a, b) => (perActionImpact[a] > perActionImpact[b] ? a : b),
    Object.keys(perActionImpact)[0]
  );
  const mostEffective = INTERVENTIONS.find(i => i.key === mostEffectiveKey);

  const populationProtected = Math.round((totalReduction / 100) * 320000);
  const respiratoryRiskReduction = Math.min(45, Math.round(improvementPct * 0.6));

  const activeCount = Object.values(interventionState).filter(v => v > 30).length;
  const cost = activeCount >= 3 ? 'High' : activeCount === 2 ? 'Medium' : 'Low';
  const difficulty = interventionState.vehicleRestriction > 50 ? 'High' : activeCount >= 2 ? 'Medium' : 'Low';
  const timeToEffect = interventionState.waterSprinkling > 40 ? 'Immediate' : totalReduction > 15 ? '4-8 Hours' : '24 Hours';

  const recommendations = [];
  if (interventionState.waterSprinkling < 50) recommendations.push('Increase road water sprinkling.');
  if (interventionState.dustControl < 60) recommendations.push('Inspect construction clusters for dust suppression compliance.');
  if (interventionState.vehicleRestriction < 40) recommendations.push('Restrict heavy diesel vehicles after 6 PM.');
  if (interventionState.trafficFlow < 30) recommendations.push('Improve signal timing on high congestion corridors.');
  if (recommendations.length === 0) recommendations.push('Current intervention levels are near optimal for this station.');

  return {
    predictedAqi,
    predictedCategory: getCategory(predictedAqi),
    totalReduction: Math.round(totalReduction),
    improvementPct,
    populationProtected,
    respiratoryRiskReduction,
    mostEffective: mostEffective ? mostEffective.label : '—',
    mostEffectiveImpact: mostEffective ? Math.round(perActionImpact[mostEffectiveKey]) : 0,
    cost,
    difficulty,
    timeToEffect,
    recommendations: recommendations.slice(0, 3)
  };
}