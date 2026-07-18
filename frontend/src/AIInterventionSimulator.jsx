import { useState, useEffect, useRef } from 'react';
import { INTERVENTIONS, DEFAULT_INTERVENTION_STATE } from './interventionConstants';
import { simulateIntervention } from './interventionSimulator';
import { api } from './api';

const KEY_MAP = {
  dustControl: 'construction_dust_control',
  waterSprinkling: 'road_water_sprinkling',
  vehicleRestriction: 'heavy_vehicle_restrictions',
  trafficFlow: 'traffic_flow_improvement',
};

export default function AIInterventionSimulator({ currentAqi, currentCategory }) {
  const [state, setState] = useState(DEFAULT_INTERVENTION_STATE);
  const [backendResult, setBackendResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorFallback, setErrorFallback] = useState(false);
  const debounceRef = useRef(null);
  const baseAqi = currentAqi ?? 176;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSimulation(), 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line
  }, [state, baseAqi]);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const payload = {
        station_id: 'DL001',
        forecast_aqi: baseAqi,
        interventions: {
          construction_dust_control: state.dustControl,
          road_water_sprinkling: state.waterSprinkling,
          heavy_vehicle_restrictions: state.vehicleRestriction,
          traffic_flow_improvement: state.trafficFlow,
        }
      };
      const res = await api.post('/intervention/simulate', payload);
      setBackendResult(res.data);
      setErrorFallback(false);
    } catch (err) {
      setErrorFallback(true);
      setBackendResult(null);
    }
    setLoading(false);
  };

  const updateSlider = (key, value) => setState(prev => ({ ...prev, [key]: Number(value) }));
  const reset = () => setState(DEFAULT_INTERVENTION_STATE);

  const fallback = errorFallback ? simulateIntervention(baseAqi, state) : null;
  const display = backendResult || fallback;

  return (
    <div id="intervention-simulator">
      <div className="page-title">Intervention Planning</div>
      <div className="page-subtitle">Scenario-based intervention estimate, not a causal guarantee</div>

      <div className="sim-status-row">
        <div className="sim-status-item">
          <div className="command-strip-label">Current AQI</div>
          <div className="command-strip-value">{baseAqi}</div>
        </div>
        <div className="sim-status-item">
          <div className="command-strip-label">Current Category</div>
          <div className="command-strip-value" style={{fontSize: 16}}>{currentCategory ?? '—'}</div>
        </div>
        {errorFallback && (
          <div className="sim-status-item">
            <div className="command-strip-label">Status</div>
            <div className="command-strip-value" style={{fontSize: 13, color: 'var(--amber)'}}>Scenario estimate temporarily unavailable, showing local fallback</div>
          </div>
        )}
      </div>

      <div className="sim-grid">
        <div className="card sim-controls">
          <h3 style={{fontSize: 13, marginBottom: 16}}>Intervention Controls</h3>
          {INTERVENTIONS.map(int => (
            <div className="slider-block" key={int.key}>
              <div className="slider-top">
                <span className="slider-label">{int.label}</span>
                <span className="slider-value">{state[int.key]}%</span>
              </div>
              <input
                type="range" min="0" max="100" value={state[int.key]}
                onChange={e => updateSlider(int.key, e.target.value)}
                className="slider-input"
                aria-label={`${int.label} ${state[int.key]}%`}
              />
              <div className="slider-desc">{int.description}</div>
            </div>
          ))}
          <button className="run-btn" style={{marginTop: 8}} onClick={reset}>Reset Simulation</button>
        </div>

        <div className="sim-output-col">
          <div className="card sim-result">
            <h3 style={{fontSize: 13, marginBottom: 14}}>{loading ? 'Estimating...' : 'Predicted Outcome'}</h3>
            {display && (
              <>
                <div className="sim-aqi-flow">
                  <div className="sim-aqi-box">
                    <div className="command-strip-label">Current</div>
                    <div className="sim-aqi-num">{baseAqi}</div>
                  </div>
                  <div className="sim-arrow">→</div>
                  <div className="sim-aqi-box">
                    <div className="command-strip-label">Predicted</div>
                    <div className="sim-aqi-num" style={{color: 'var(--amber)'}}>
                      {backendResult ? backendResult.estimated_aqi : fallback.predictedAqi}
                    </div>
                  </div>
                </div>
                <div className="sim-improvement">
                  -{backendResult ? backendResult.aqi_reduction : fallback.totalReduction} AQI,{' '}
                  {backendResult ? backendResult.improvement_percent : fallback.improvementPct}% improvement,{' '}
                  {backendResult ? backendResult.estimated_category : fallback.predictedCategory}
                </div>
                <div className="sim-health-row">
                  <div>
                    <div className="command-strip-label">Population Protected</div>
                    <div className="stage-result" style={{fontSize: 18}}>
                      {(backendResult ? backendResult.population_protected : fallback.populationProtected).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="command-strip-label">Respiratory Risk Reduction</div>
                    <div className="stage-result" style={{fontSize: 18}}>
                      {backendResult ? backendResult.respiratory_risk_reduction_percent : fallback.respiratoryRiskReduction}%
                    </div>
                  </div>
                </div>
                {backendResult && (
                  <div className="evidence-meta" style={{marginTop: 10}}>{backendResult.method.disclaimer}</div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <h3 style={{fontSize: 13, marginBottom: 10}}>Priority Actions</h3>
            <ul className="action-list">
              {(backendResult ? backendResult.recommended_actions : fallback?.recommendations || []).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>

          <div className="sim-summary-grid">
            <div className="card">
              <h3 style={{fontSize: 12, marginBottom: 8}}>Most Effective Action</h3>
              {backendResult?.most_effective_intervention ? (
                <>
                  <div style={{fontSize: 14, marginBottom: 4}}>{backendResult.most_effective_intervention.name}</div>
                  <div className="evidence-meta">Est. reduction {backendResult.most_effective_intervention.estimated_aqi_reduction} AQI</div>
                </>
              ) : fallback ? (
                <>
                  <div style={{fontSize: 14, marginBottom: 4}}>{fallback.mostEffective}</div>
                  <div className="evidence-meta">Est. reduction {fallback.mostEffectiveImpact} AQI</div>
                </>
              ) : <div className="evidence-meta">No interventions selected</div>}
            </div>
            <div className="card">
              <h3 style={{fontSize: 12, marginBottom: 8}}>Feasibility</h3>
              <div className="feasibility-row"><span>Cost</span><span>{backendResult ? backendResult.feasibility.estimated_cost : fallback?.cost ?? '—'}</span></div>
              <div className="feasibility-row"><span>Difficulty</span><span>{backendResult ? backendResult.feasibility.implementation_difficulty : fallback?.difficulty ?? '—'}</span></div>
              <div className="feasibility-row"><span>Time to effect</span><span>{backendResult ? backendResult.feasibility.expected_time : fallback?.timeToEffect ?? '—'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}