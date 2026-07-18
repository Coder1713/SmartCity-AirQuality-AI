import { useState, useMemo } from 'react';
import { INTERVENTIONS, DEFAULT_INTERVENTION_STATE } from './interventionConstants';
import { simulateIntervention } from './interventionSimulator';

export default function AIInterventionSimulator({ currentAqi, currentCategory }) {
  const [state, setState] = useState(DEFAULT_INTERVENTION_STATE);
  const baseAqi = currentAqi ?? 176;

  const sim = useMemo(() => simulateIntervention(baseAqi, state), [baseAqi, state]);

  const updateSlider = (key, value) => {
    setState(prev => ({ ...prev, [key]: Number(value) }));
  };

  const reset = () => setState(DEFAULT_INTERVENTION_STATE);

  return (
    <div id="intervention-simulator">
      <div className="page-title">AI Intervention Simulator</div>
      <div className="page-subtitle">Estimate the impact of operational interventions before implementation</div>

      <div className="sim-status-row">
        <div className="sim-status-item">
          <div className="command-strip-label">Current AQI</div>
          <div className="command-strip-value">{baseAqi}</div>
        </div>
        <div className="sim-status-item">
          <div className="command-strip-label">Current Category</div>
          <div className="command-strip-value" style={{fontSize: 16}}>{currentCategory ?? '—'}</div>
        </div>
        <div className="sim-status-item">
          <div className="command-strip-label">Forecast AQI</div>
          <div className="command-strip-value">{Math.round(baseAqi * 1.1)}</div>
        </div>
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
                type="range"
                min="0"
                max="100"
                value={state[int.key]}
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
            <h3 style={{fontSize: 13, marginBottom: 14}}>Predicted Outcome</h3>
            <div className="sim-aqi-flow">
              <div className="sim-aqi-box">
                <div className="command-strip-label">Current</div>
                <div className="sim-aqi-num">{baseAqi}</div>
              </div>
              <div className="sim-arrow">→</div>
              <div className="sim-aqi-box">
                <div className="command-strip-label">Predicted</div>
                <div className="sim-aqi-num" style={{color: 'var(--amber)'}}>{sim.predictedAqi}</div>
              </div>
            </div>
            <div className="sim-improvement">
              -{sim.totalReduction} AQI, {sim.improvementPct}% improvement, {sim.predictedCategory}
            </div>

            <div className="sim-health-row">
              <div>
                <div className="command-strip-label">Population Protected</div>
                <div className="stage-result" style={{fontSize: 18}}>{sim.populationProtected.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="command-strip-label">Respiratory Risk Reduction</div>
                <div className="stage-result" style={{fontSize: 18}}>{sim.respiratoryRiskReduction}%</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{fontSize: 13, marginBottom: 10}}>Priority Actions</h3>
            <ul className="action-list">
              {sim.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>

          <div className="sim-summary-grid">
            <div className="card">
              <h3 style={{fontSize: 12, marginBottom: 8}}>Most Effective Action</h3>
              <div style={{fontSize: 14, marginBottom: 4}}>{sim.mostEffective}</div>
              <div className="evidence-meta">Est. reduction {sim.mostEffectiveImpact} AQI</div>
            </div>
            <div className="card">
              <h3 style={{fontSize: 12, marginBottom: 8}}>Feasibility</h3>
              <div className="feasibility-row"><span>Cost</span><span>{sim.cost}</span></div>
              <div className="feasibility-row"><span>Difficulty</span><span>{sim.difficulty}</span></div>
              <div className="feasibility-row"><span>Time to effect</span><span>{sim.timeToEffect}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}