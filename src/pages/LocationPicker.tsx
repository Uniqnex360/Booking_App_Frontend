import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  defaultPos?: [number, number];
}

export function LocationPicker({ onLocationSelect, defaultPos = [12.9716, 77.5946] }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(null);

  function MapEvents() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      },
    });
    return position === null ? null : <Marker position={position} />;
  }

  return (
    <div className="h-[300px] w-full overflow-hidden rounded-xl border border-border">
      <MapContainer center={defaultPos} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents />
      </MapContainer>
      <p className="mt-1 text-[10px] text-muted-foreground text-center">
        Click on the map to pin the exact event location
      </p>
    </div>
  );
}