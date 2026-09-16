import { useState, useEffect } from 'react';
import { getCurrentPosition, reverseGeocode, type GeoLocation } from '../api/client';

interface Props {
  children: (loc: GeoLocation) => React.ReactNode;
}

export default function LocationGate({ children }: Props) {
  const [loc, setLoc] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const requestLocation = async () => {
    setLoading(true);
    setError('');
    try {
      const { lat, lng } = await getCurrentPosition();
      let display = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      let city = '', state = '', country = '';
      try {
        const rev = await reverseGeocode(lat, lng);
        display = rev.display_name;
        city = rev.city || '';
        state = rev.state || '';
        country = rev.country || '';
      } catch {
        /* fallback to coords */
      }
      setLoc({ lat, lng, display_name: display, city, state, country });
    } catch (e: any) {
      setError(e.message || 'Could not get your location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  if (loading) {
    return (
      <div className="location-gate">
        <div className="gate-card">
          <div className="gate-icon">📍</div>
          <h2>Getting your location…</h2>
          <p>Please allow location access when your browser asks.</p>
          <div className="gate-spinner" />
        </div>
      </div>
    );
  }

  if (!loc) {
    return (
      <div className="location-gate">
        <div className="gate-card">
          <div className="gate-icon">🚫</div>
          <h2>Location Required</h2>
          <p className="gate-error">{error}</p>
          <ul className="gate-tips">
            <li>Click the 🔒 lock icon in your browser's address bar</li>
            <li>Set <b>Location</b> to <b>Allow</b></li>
            <li>Make sure Windows location services are ON</li>
            <li>Reload the page</li>
          </ul>
          <button onClick={requestLocation}>Try Again</button>
        </div>
      </div>
    );
  }

  return <>{children(loc)}</>;
}