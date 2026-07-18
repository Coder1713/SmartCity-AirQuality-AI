import {
  FORECAST_EVIDENCE_FALLBACK,
  ATTRIBUTION_EVIDENCE_FALLBACK,
  VERIFICATION_CHECKLIST_FALLBACK,
  DATA_COMPLETENESS_FALLBACK,
  HISTORICAL_MATCH_FALLBACK
} from './explainData';

const IMPACT_COLOR = { High: '#e04545', Medium: '#e8a33d', Low: 'var(--text-dim)' };
const STRENGTH_COLOR = { Strong: '#4ade80', Moderate: '#e8a33d', Supporting: 'var(--text-dim)' };

function ForecastEvidence({ predictedAqi, modelR2 }) {
  return (
    <div className="card explain-panel">
      <h3 style={{fontSize: 14, color: 'var(--text)', textTransform: 'none', letterSpacing: 0, marginBottom: 4}}>
        Why is AQI expected to rise?
      </h3>
      <div className="explain-headline-row">
        <span className="explain-headline-value">{predictedAqi ?? '—'}</span>
        <span className="explain-headline-label">Predicted AQI · Model R2 {modelR2 ?? '—'}</span>
      </div>
      {FORECAST_EVIDENCE_FALLBACK.map((f, i) => (
        <div className="evidence-row" key={i}>
          <div className="evidence-row-top">
            <span className="evidence-factor">{f.factor}</span>
            <span className="impact-label" style={{color: IMPACT_COLOR[f.impact]}}>{f.impact} impact</span>
          </div>
          <div className="evidence-observation">{f.observation}</div>
          <div className="contribution-track" role="progressbar" aria-valuenow={f.contribution} aria-valuemin={0} aria-valuemax={100} aria-label={`${f.factor} contribution ${f.contribution}%`}>
            <div className="contribution-fill" style={{width: `${f.contribution}%`}}></div>
          </div>
          <div className="contribution-pct">{f.contribution}% contribution</div>
        </div>
      ))}
    </div>
  );
}

function AttributionEvidence({ primarySource }) {
  return (
    <div className="card explain-panel">
      <h3 style={{fontSize: 14, color: 'var(--text)', textTransform: 'none', letterSpacing: 0, marginBottom: 4}}>
        Why was this source identified?
      </h3>
      <div className="explain-headline-row">
        <span className="explain-headline-value" style={{fontSize: 20}}>{primarySource ?? 'No pipeline result yet'}</span>
      </div>
      {ATTRIBUTION_EVIDENCE_FALLBACK.map((e, i) => (
        <div className="attribution-evidence-row" key={i}>
          <span className="strength-dot" style={{background: STRENGTH_COLOR[e.strength]}}></span>
          <div style={{flex: 1}}>
            <div className="evidence-observation" style={{marginBottom: 2}}>{e.statement}</div>
            <div className="evidence-meta">{e.type} evidence, {e.strength}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfidenceBreakdown({ forecastConfidence, attributionConfidence }) {
  const items = [
    { label: 'Forecast confidence', value: forecastConfidence },
    { label: 'Source attribution confidence', value: attributionConfidence },
    { label: 'Data completeness', value: DATA_COMPLETENESS_FALLBACK },
    { label: 'Historical pattern match', value: HISTORICAL_MATCH_FALLBACK },
  ];
  return (
    <div className="card explain-panel">
      <h3 style={{fontSize: 14, color: 'var(--text)', textTransform: 'none', letterSpacing: 0, marginBottom: 12}}>
        Confidence breakdown
      </h3>
      {items.map((it, i) => (
        <div className="confidence-item" key={i}>
          <div className="confidence-item-top">
            <span>{it.label}</span>
            <span>{it.value ?? '—'}%</span>
          </div>
          <div className="contribution-track" role="progressbar" aria-valuenow={it.value} aria-valuemin={0} aria-valuemax={100} aria-label={`${it.label} ${it.value}%`}>
            <div className="contribution-fill" style={{width: `${it.value ?? 0}%`, background: 'var(--amber)'}}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VerificationChecklist() {
  return (
    <div className="card explain-panel">
      <h3 style={{fontSize: 14, color: 'var(--text)', textTransform: 'none', letterSpacing: 0, marginBottom: 10}}>
        Recommended field verification
      </h3>
      <ul className="action-list">
        {VERIFICATION_CHECKLIST_FALLBACK.map((v, i) => <li key={i}>{v}</li>)}
      </ul>
      <div className="verification-note">Human verification required before enforcement</div>
    </div>
  );
}

export default function ExplainableAI({ result }) {
  const predictedAqi = result?.forecast?.predicted_aqi;
  const modelR2 = result?.forecast?.model_r2;
  const primarySource = result?.attribution?.primary_source;
  const attributionConfidence = result?.attribution?.confidence ? parseInt(result.attribution.confidence) : null;
  const forecastConfidence = modelR2 ? Math.round(modelR2 * 100) : null;

  return (
    <div id="explainable-ai">
      <div className="page-title">Explainable AI</div>
      <div className="page-subtitle-row">
        <span className="page-subtitle">Evidence behind the current forecast and source attribution</span>
        <span className="explain-status-badge">Model explanation available</span>
      </div>

      <div className="explain-grid">
        <ForecastEvidence predictedAqi={predictedAqi} modelR2={modelR2} />
        <AttributionEvidence primarySource={primarySource} />
      </div>
      <div className="explain-grid">
        <ConfidenceBreakdown forecastConfidence={forecastConfidence} attributionConfidence={attributionConfidence} />
        <VerificationChecklist />
      </div>
    </div>
  );
}