export const INTERVENTIONS = [
  {
    key: 'dustControl',
    label: 'Construction Dust Control',
    description: 'Increase dust suppression at active construction sites.',
    maxImpact: 18
  },
  {
    key: 'waterSprinkling',
    label: 'Road Water Sprinkling',
    description: 'Deploy water sprinkling on high-dust corridors.',
    maxImpact: 12
  },
  {
    key: 'vehicleRestriction',
    label: 'Heavy Vehicle Restrictions',
    description: 'Restrict heavy diesel vehicle movement during peak hours.',
    maxImpact: 15
  },
  {
    key: 'trafficFlow',
    label: 'Traffic Flow Improvement',
    description: 'Optimize signal timing to reduce idling and congestion.',
    maxImpact: 10
  }
];

export const DEFAULT_INTERVENTION_STATE = {
  dustControl: 0,
  waterSprinkling: 0,
  vehicleRestriction: 0,
  trafficFlow: 0
};