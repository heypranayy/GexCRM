import { useState, useEffect } from "react";

export interface GeoLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isWithinGeofence: boolean;
  distance: number | null;
  isMocked: boolean;
  error: string | null;
  loading: boolean;
}

// Default fallback — overridden by company branch settings from server
const DEFAULT_OFFICE_LAT = 19.076;
const DEFAULT_OFFICE_LNG = 72.8777;
const DEFAULT_ALLOWED_RADIUS_METERS = 200;

function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeofence(
  officeLat = DEFAULT_OFFICE_LAT,
  officeLng = DEFAULT_OFFICE_LNG,
  allowedRadius = DEFAULT_ALLOWED_RADIUS_METERS
) {
  const [state, setState] = useState<GeoLocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    isWithinGeofence: false,
    distance: null,
    isMocked: false,
    error: null,
    loading: true,
  });

  const getPosition = () => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser.",
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Basic fake GPS detection heuristic (e.g., exact 0 accuracy or mock provider flags in browser)
        const isMocked =
          accuracy === 0 ||
          (position as any).mocked === true ||
          (position.coords as any).isFromMockProvider === true;

        const distance = calculateHaversineDistance(
          latitude,
          longitude,
          officeLat,
          officeLng
        );
        const isWithinGeofence = distance <= allowedRadius;

        setState({
          latitude,
          longitude,
          accuracy,
          isWithinGeofence,
          distance,
          isMocked,
          error: null,
          loading: false,
        });
      },
      (error) => {
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Please enable location access.";
        }
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          loading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    getPosition();
  }, [officeLat, officeLng, allowedRadius]);

  return { ...state, refetch: getPosition };
}
