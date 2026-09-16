import { useState } from 'react';
import { geocode, getRoute, type RouteResponse, type GeoLocation } from '../api/client';

interface Props {
  onResult: (r: RouteResponse, from: [number, number], to: [number, number]) => void;
  userLocation: GeoLocation;
}

export default function RoutePlanner({ onResult, userLocation }: Props) {
  const [from, setFrom] = useState(userLocation.display_name || 'Delhi');
  const [to, setTo] = useState('Mumbai');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const useMyLocation = () => {
    setFrom(userLocation.display_name || `${userLocation.lat}, ${userLocation.lng}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      // Use real GPS coords if the From field matches current location
      const fromCoords =
        from === userLocation.display_name ||
        from === `${userLocation.lat}, ${userLocation.lng}`
          ? { lat: userLocation.lat, lng: userLocation.lng }
          : await geocode(from);

      const toCoords = await geocode(to);
      const route = await getRoute(
        [fromCoords.lat, fromCoords.lng],
        [toCoords.lat, toCoords.lng]
      );
      onResult(route, [fromCoords.lat, fromCoords.lng], [toCoords.lat, toCoords.lng]);
    } catch (e: any) {
      setErr(e.response?.data?.detail || e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>🗺️ Plan a Route</h2>
      <form onSubmit={submit}>
        <label>From</label>
        <input value={from} onChange={(e) => setFrom(e.target.value)} required />
        <button type="button" className="btn-secondary" onClick={useMyLocation}>
          📍 Use my current location
        </button>

        <label>To</label>
        <input value={to} onChange={(e) => setTo(e.target.value)} required />

        <button type="submit" disabled={loading}>
          {loading ? 'Calculating…' : '🚦 Get Route'}
        </button>
        {err && <p className="error">{err}</p>}
      </form>
    </div>
  );
}