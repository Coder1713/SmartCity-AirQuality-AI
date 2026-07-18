import { VERIFICATION_CHECKLIST_FALLBACK, DATA_COMPLETENESS_FALLBACK, HISTORICAL_MATCH_FALLBACK } from './explainData';

const IMPACT_COLOR = { high: '#e04545', medium: '#e8a33d', low: 'var(--text-dim)' };
const STRENGTH_COLOR = { strong: '#4ade80', moderate: '#e8a33d', supporting: 'var(--text-dim)' };

function EmptyState({ text }) {
  return <div className="card explain-panel"><div className="evidence-observation">{text}</div></div>;
}

function ForecastEvidence({ result }) {
  const drivers = result?.explanation?.forecast_drivers || [];
  if (!result) return <EmptyState text="Analysis not generated. Run the Intelligence Pipeline to generate forecast drivers and source evidence." />;
  if (drivers.length === 0) return <EmptyState text="Explanation unavailable for this run." />;

  return (
    <div className="card explain-panel">
      <h3 style={{fontSize: 14, marginBottom: 4}}>Why is AQI expected to rise?</h3>
      <div className="explain-headline-row">
        <span className="explain-headline-value">{result.forecast.predicted_aqi}</span>
        <span className="explain-headline-label">Predicted AQI, Model R2 {result.forecast.model_r2}</span>
      </div>
      {drivers.map((f, i) => (
        <div className="evidence-row" key={i}>
          <div className="evidence-row-top">
            <span className="evidence-factor">{f.label}</span>
            <span className="impact-label" style={{color: IMPACT_COLOR[f.impact]}}>{f.impact} impact</span>
          </div>
          <div className="evidence-observation">{f.observation}</div>
          <div className="contribution-track" role="progressbar" aria-valuenow={Math.round(f.importance*100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="contribution-fill" style={{width: `${Math.round(f.importance*100)}%`}}></div>
          </div>
          <div className="contribution-pct">{Math.round(f.importance*100)}% model importance</div>
        </div>
      ))}
      <div className="evidence-meta" style={{marginTop: 10}}>Drivers are based on model feature importance and current input conditions.</div>
    </div>
  );
}

function AttributionEvidence({ result }) {
  if (!result) return <EmptyState text="Analysis not generated. Run the Intelligence Pipeline to generate forecast drivers and source evidence." />;
  const evidence = result.attribution?.evidence || [];

  return (
    <div className="card explain-panel">
      <h3 style={{fontSize: 14, marginBottom: 4}}>Why was this source identified?</h3>
      <div className="explain-headline-row">
        <span className="explain-headline-value" style={{fontSize: 20}}>{result.attribution.primary_source}</span>
      </div>
      {evidence.length === 0 ? (
        <div className="evidence-observation">Explanation unavailable for this run.</div>
      ) : evidence.map((e, i) => (
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

function ConfidenceBreakdown({ result }) {
  const forecastConfidence = result ? Math.round(result.forecast.model_r2 * 100) : null;
  const attributionConfidence = result ? parseInt(result.attribution.confidence) : null;
  const items = [
    { label: 'Forecast confidence', value: forecastConfidence },
    { label: 'Source attribution confidence', value: attributionConfidence },
    { label: 'Data completeness', value: result ? DATA_COMPLETENESS_FALLBACK : null },
    { label: 'Historical pattern match', value: result ? HISTORICAL_MATCH_FALLBACK : null },
  ];
  return (
    <div className="card explain-panel">
      <h3 style={{fontSize: 14, marginBottom: 12}}>Confidence breakdown</h3>
      {items.map((it, i) => (
        <div className="confidence-item" key={i}>
          <div className="confidence-item-top"><span>{it.label}</span><span>{it.value ?? '—'}%</span></div>
          <div className="contribution-track" role="progressbar" aria-valuenow={it.value || 0} aria-valuemin={0} aria-valuemax={100}>
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
      <h3 style={{fontSize: 14, marginBottom: 10}}>Recommended field verification</h3>
      <ul className="action-list">{VERIFICATION_CHECKLIST_FALLBACK.map((v, i) => <li key={i}>{v}</li>)}</ul>
      <div className="verification-note">Human verification required before enforcement</div>
    </div>
  );
}

export default function ExplainableAI({ result }) {
  return (
    <div id="explainable-ai">
      <div className="page-title">Explainable AI</div>
      <div className="page-subtitle-row">
        <span className="page-subtitle">Evidence behind the current forecast and source attribution</span>
        <span className="explain-status-badge">{result ? 'Model explanation available' : 'Awaiting pipeline run'}</span>
      </div>
      <div className="explain-grid">
        <ForecastEvidence result={result} />
        <AttributionEvidence result={result} />
      </div>
      <div className="explain-grid">
        <ConfidenceBreakdown result={result} />
        <VerificationChecklist />
      </div>
    </div>
  );
}