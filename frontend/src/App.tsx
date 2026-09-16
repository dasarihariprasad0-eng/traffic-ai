import { useState } from 'react';
import RoutePlanner from './components/RoutePlanner';
import ImageAnalyzer from './components/ImageAnalyzer';
import MapView from './components/MapView';
import LocationGate from './components/LocationGate';
import type { RouteResponse, RouteResult, GeoLocation } from './api/client';

function getTrafficTips(route: RouteResult, hasAlternatives: boolean) {
  const hour = new Date().getHours();
  const peak = (hour >= 7 && hour <= 10) || (hour >= 16 && hour <= 20);
  return [
    peak ? 'Peak travel window: allow extra time and avoid starting during the next hour.' : 'Traffic is typically lighter outside the morning and evening commute windows.',
    hasAlternatives ? 'Compare alternate routes before departure; the fastest route is selected by default.' : 'No alternate road paths were returned for this journey.',
    `Plan for approximately ${route.duration_min} minutes, then recheck conditions before leaving.`,
  ];
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes} min`;
}

function AppContent({ location }: { location: GeoLocation }) {
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [journey, setJourney] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState('A');
  const routes = route
    ? [route.recommended, ...route.alternatives].filter((item): item is RouteResult => Boolean(item))
    : [];
  const selectedRoute = routes.find((item) => item.id === selectedRouteId) || route?.recommended;
  const mapRoute = route && selectedRoute
    ? { ...route, recommended: selectedRoute, alternatives: routes.filter((item) => item.id !== selectedRoute.id) }
    : route;

  const handleRouteResult = (nextRoute: RouteResponse, from: [number, number], to: [number, number]) => {
    setRoute(nextRoute);
    setSelectedRouteId(nextRoute.recommended?.id || '');
    setJourney({ from, to });
  };

  const googleMapsUrl = journey && selectedRoute
    ? `https://www.google.com/maps/dir/?api=1&origin=${journey.from[0]},${journey.from[1]}&destination=${journey.to[0]},${journey.to[1]}&travelmode=driving`
    : '';

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <div className="brand-lockup"><img src="/direct-mark.svg" alt="Direct logo" /><span>DIRECT</span></div>
          <p className="eyebrow">SMART JOURNEY PLANNING</p>
          <h1>Go further, directly.</h1>
          <p className="subtitle">Route planning and road condition intelligence</p>
        </div>
        <div className="system-status"><span className="status-dot" /> System operational</div>
      </header>

      <div className="location-bar">
        <span className="location-label">CURRENT POSITION</span>
        <b>{location.display_name}</b>
        <span className="location-coords">
          ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
        </span>
      </div>

      <div className="section-heading">
        <div><p className="eyebrow">CONTROL CENTRE</p><h2>Plan and assess</h2></div>
        <span className="section-note">Live location services enabled</span>
      </div>

      <div className="grid">
        <RoutePlanner onResult={handleRouteResult} userLocation={location} />
        <ImageAnalyzer userLocation={location} />
      </div>

      <section className="map-section">
        <div className="section-heading">
          <div><p className="eyebrow">NETWORK VIEW</p><h2>Route visualisation</h2></div>
          <span className="section-note">Open map data</span>
        </div>
        <MapView route={mapRoute} userLocation={location} />
      </section>

      {route && (
        <section className="travel-modes">
          <div className="results-header">
            <div><p className="eyebrow">JOURNEY PLANNER</p><h2>Choose the right vehicle</h2></div>
            <span className="estimate-pill">PLANNING ESTIMATES</span>
          </div>
          <div className="travel-mode-grid">
            {route.travel_options.map((option) => (
              <div key={option.mode} className={`travel-mode ${option.recommended ? 'recommended' : ''}`}>
                <div className="travel-mode-heading"><strong>{option.label}</strong>{option.recommended && <span>Best choice</span>}</div>
                <b className="travel-duration">{formatDuration(option.duration_min)}</b>
                <span className="travel-distance">{option.distance_km.toLocaleString()} km estimated</span>
                <p>{option.description}</p>
              </div>
            ))}
          </div>
          <p className="estimate-note">{route.estimate_basis}</p>
        </section>
      )}

      {selectedRoute && (
        <section className="route-results">
          <div className="results-header">
            <div><p className="eyebrow">ROUTE OPTIONS</p><h2>Choose your journey</h2></div>
            <span className="estimate-pill">ESTIMATED CONDITIONS</span>
          </div>
          <div className="route-options">
            {routes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`route-option ${item.id === selectedRoute.id ? 'selected' : ''}`}
                onClick={() => setSelectedRouteId(item.id)}
              >
                <span className="route-option-top"><strong>{item.name}</strong><span>{item.id === selectedRoute.id ? 'Selected' : 'View route'}</span></span>
                <span className="route-metrics"><b>{item.duration_min} min</b><span>{item.distance_km} km</span></span>
              </button>
            ))}
          </div>
          <div className="traffic-advisory">
            <div className="advisory-icon">!</div>
            <div>
              <strong>Traffic guidance</strong>
              <ul>{getTrafficTips(selectedRoute, routes.length > 1).map((tip) => <li key={tip}>{tip}</li>)}</ul>
              <small>Live congestion data is not connected yet. Advice is based on route comparison and local travel time.</small>
            </div>
          </div>
          <div className="maps-handoff">
            <div>
              <strong>Continue with live navigation</strong>
              <p>Open this journey in Google Maps to see current traffic, incidents, and turn-by-turn directions.</p>
            </div>
            <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="maps-button">Open in Google Maps</a>
          </div>
          <div className="info-bar">
            <div><span>Time</span><strong>{selectedRoute.duration_min} min</strong></div>
            <div><span>Distance</span><strong>{selectedRoute.distance_km} km</strong></div>
            <div><span>Selected</span><strong>{selectedRoute.name}</strong></div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function App() {
  return <LocationGate>{(loc) => <AppContent location={loc} />}</LocationGate>;
}