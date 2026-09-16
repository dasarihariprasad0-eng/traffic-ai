import { useState } from 'react';
import { analyzeImage, submitReport, type GeoLocation } from '../api/client';

interface Props {
  userLocation: GeoLocation;
}

export default function ImageAnalyzer({ userLocation }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [provider, setProvider] = useState<'gemini' | 'groq'>('groq');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setSubmitted(null);
    setErr('');
    setLoading(true);
    try {
      const data = await analyzeImage(file, provider);
      setResult(data);
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!result?.parsed) return;
    setSubmitting(true);
    try {
      const resp = await submitReport({
        issue_type: result.parsed.type,
        severity: result.parsed.severity,
        description: result.parsed.description || '',
        lat: userLocation.lat,
        lng: userLocation.lng,
        provider: result.provider,
        confidence: result.parsed.confidence,
      });
      setSubmitted(resp.report_id);
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const sev = (s: string) => (s === 'High' ? 'high' : s === 'Medium' ? 'medium' : 'low');

  return (
    <div className="card">
      <h2>📷 Report Road Issue</h2>

      <div className="gps-tag">
        📍 This report will be tagged at <b>{userLocation.display_name}</b>
      </div>

      <label>AI Provider</label>
      <select value={provider} onChange={(e) => setProvider(e.target.value as any)}>
        <option value="gemini">Google Gemini</option>
        <option value="groq">Groq (Llama Vision)</option>
      </select>

      <label>Photo</label>
      <input type="file" accept="image/*" capture="environment" onChange={handle} />

      {preview && <img src={preview} alt="preview" className="preview" />}
      {loading && <p className="hint">✨ Analyzing…</p>}
      {err && <p className="error">{err}</p>}

      {result?.parsed && (
        <div className="result">
          <div>
            <strong>{result.parsed.type}</strong>{' '}
            <span className={`badge ${sev(result.parsed.severity)}`}>
              {result.parsed.severity}
            </span>
          </div>
          <p style={{ marginTop: 8 }}>{result.parsed.description}</p>
          <small style={{ color: '#94a3b8' }}>
            Confidence: {(result.parsed.confidence * 100).toFixed(0)}%
          </small>

          {!submitted ? (
            <button onClick={submit} disabled={submitting} style={{ marginTop: 12 }}>
              {submitting ? 'Submitting…' : '✅ Submit Report with GPS'}
            </button>
          ) : (
            <div className="success-box">
              ✅ Report <b>{submitted}</b> submitted with GPS coordinates
            </div>
          )}
        </div>
      )}
    </div>
  );
}