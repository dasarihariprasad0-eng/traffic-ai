import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

const API = axios.create({
  baseURL: configuredApiUrl || `http://${apiHost}:8000/api/v1`,
  timeout: 45000,
});

export interface RouteResult {
  id: string;
  name: string;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  distance_km: number;
  duration_min: number;
}

export interface RouteResponse {
  recommended: RouteResult | null;
  alternatives: RouteResult[];
  travel_options: TravelOption[];
  estimate_basis: string;
}

export interface TravelOption {
  mode: 'car' | 'bike' | 'train' | 'plane';
  label: string;
  duration_min: number;
  distance_km: number;
  description: string;
  recommended: boolean;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  display_name: string;
  city?: string;
  state?: string;
  country?: string;
}

export const geocode = (query: string) =>
  API.get<GeoLocation>(`/geocode?q=${encodeURIComponent(query)}`).then((r) => r.data);

export const reverseGeocode = (lat: number, lng: number) =>
  API.get<GeoLocation>(`/geocode/reverse`, { params: { lat, lng } }).then((r) => r.data);

export const getRoute = (a: [number, number], b: [number, number]) =>
  API.post<RouteResponse>('/route', {
    start_lat: a[0],
    start_lng: a[1],
    end_lat: b[0],
    end_lng: b[1],
  }).then((r) => r.data);

export const analyzeImage = (file: File, provider: 'gemini' | 'groq') => {
  const form = new FormData();
  form.append('file', file);
  return API.post(`/analyze/${provider}`, form).then((r) => r.data);
};

export const submitReport = (payload: {
  issue_type: string;
  severity: string;
  description: string;
  lat: number;
  lng: number;
  provider?: string;
  confidence?: number;
}) => API.post('/report', payload).then((r) => r.data);

// Browser Geolocation helper — returns a Promise
export const getCurrentPosition = (): Promise<{ lat: number; lng: number }> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const msgs: Record<number, string> = {
          1: 'Location permission denied. Please enable GPS.',
          2: 'Location unavailable. Try again.',
          3: 'Location request timed out.',
        };
        reject(new Error(msgs[err.code] || 'Unknown location error'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });