import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RouteResponse, GeoLocation } from '../api/client';

interface Props {
  route: RouteResponse | null;
  userLocation?: GeoLocation;
}

export default function MapView({ route, userLocation }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !ref.current) return;
    const center: [number, number] = userLocation
      ? [userLocation.lng, userLocation.lat]
      : [77.209, 28.6139];

    map.current = new maplibregl.Map({
      container: ref.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center,
      zoom: 12,
      pitch: 45,
    });
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add user GPS marker
    if (userLocation) {
      const el = document.createElement('div');
      el.style.cssText =
        'width:18px;height:18px;background:#0ea5e9;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(14,165,233,0.3);';
      new maplibregl.Marker(el)
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new maplibregl.Popup().setHTML(`<b>📍 You are here</b><br>${userLocation.display_name}`))
        .addTo(map.current);
    }
  }, [userLocation]);

  // ... rest of the file stays the same (route drawing effect + return)
  useEffect(() => {
    const m = map.current;
    if (!m || !route?.recommended) return;
    const recommended = route.recommended;
    const draw = () => {
      if (m.getLayer('rec')) m.removeLayer('rec');
      if (m.getSource('rec')) m.removeSource('rec');
      m.addSource('rec', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: recommended.geometry },
      });
      m.addLayer({
        id: 'rec', type: 'line', source: 'rec',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#0ea5e9', 'line-width': 6 },
      });

      route.alternatives.forEach((alt, i) => {
        const id = 'alt-' + i;
        if (m.getLayer(id)) m.removeLayer(id);
        if (m.getSource(id)) m.removeSource(id);
        m.addSource(id, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: alt.geometry },
        });
        m.addLayer({
          id, type: 'line', source: id,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#94a3b8', 'line-width': 3, 'line-dasharray': [2, 2] },
        });
      });

      const coords = recommended.geometry.coordinates;
      const b = coords.reduce(
        (acc, c) => acc.extend(c as [number, number]),
        new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number])
      );
      m.fitBounds(b, { padding: 60 });
    };
    if (m.loaded()) draw();
    else m.once('load', draw);
  }, [route]);

  return <div ref={ref} className="map" />;
}