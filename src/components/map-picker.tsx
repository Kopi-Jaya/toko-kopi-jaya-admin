"use client";

import { useEffect, useRef, useState } from "react";

interface MapPickerProps {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string, address?: string) => void;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

// Use window-level flags so state survives Next.js Fast Refresh module re-evaluation
type W = Window & {
  __gmLoaded?: boolean;
  __gmLoading?: boolean;
  __gmCallbacks?: (() => void)[];
};

function loadMapsApi(key: string): Promise<void> {
  return new Promise((resolve) => {
    const w = window as W;
    if (w.__gmLoaded) { resolve(); return; }
    if (!w.__gmCallbacks) w.__gmCallbacks = [];
    w.__gmCallbacks.push(resolve);
    if (w.__gmLoading) return;
    w.__gmLoading = true;
    window.initGoogleMaps = () => {
      w.__gmLoaded = true;
      w.__gmLoading = false;
      (w.__gmCallbacks ?? []).forEach((cb) => cb());
      w.__gmCallbacks = [];
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

const DEFAULT_CENTER = { lat: -7.9797, lng: 112.6304 }; // Malang, East Java

export function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(() => typeof window !== "undefined" && !!(window as W).__gmLoaded);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

  useEffect(() => {
    if (!apiKey) return;
    loadMapsApi(apiKey).then(() => setReady(true));
  }, [apiKey]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const initialCenter = lat && lng
      ? { lat: Number(lat), lng: Number(lng) }
      : DEFAULT_CENTER;

    const map = new window.google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom: lat && lng ? 15 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapInstanceRef.current = map;

    const marker = new window.google.maps.Marker({
      map,
      draggable: true,
      position: lat && lng ? initialCenter : undefined,
    });
    markerRef.current = marker;

    const geocoder = new window.google.maps.Geocoder();

    const placeMarker = (position: google.maps.LatLng) => {
      marker.setPosition(position);
      map.panTo(position);
      const latStr = position.lat().toFixed(7);
      const lngStr = position.lng().toFixed(7);
      geocoder.geocode({ location: position }, (results, status) => {
        const address = status === "OK" && results?.[0] ? results[0].formatted_address : undefined;
        onChange(latStr, lngStr, address);
      });
    };

    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) placeMarker(e.latLng);
    });

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) placeMarker(pos);
    });

    // Search box
    if (searchRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(searchRef.current, {
        fields: ["geometry", "formatted_address", "name"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          map.setCenter(place.geometry.location);
          map.setZoom(16);
          placeMarker(place.geometry.location);
        }
      });
    }

    return () => {
      window.google.maps.event.clearInstanceListeners(map);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!apiKey) return <p className="text-sm text-muted-foreground">Google Maps key not configured.</p>;

  return (
    <div className="space-y-2">
      <input
        ref={searchRef}
        type="text"
        placeholder="Search location…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div ref={mapRef} className="h-56 w-full rounded-md border bg-muted" />
      {!ready && <p className="text-xs text-muted-foreground">Loading map…</p>}
      {lat && lng && (
        <p className="text-xs text-muted-foreground">
          {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
        </p>
      )}
    </div>
  );
}
