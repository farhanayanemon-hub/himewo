import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Known places with coordinates — Bangladesh cities + nearby / popular
// countries (capital used as the anchor point). Clicking a dot on the map
// toggles that place in the targeting locations list.
export const MAP_PLACES: {
  name: string;
  lat: number;
  lng: number;
  country?: boolean;
}[] = [
  { name: "Dhaka", lat: 23.8103, lng: 90.4125 },
  { name: "Chittagong", lat: 22.3569, lng: 91.7832 },
  { name: "Sylhet", lat: 24.8949, lng: 91.8687 },
  { name: "Khulna", lat: 22.8456, lng: 89.5403 },
  { name: "Rajshahi", lat: 24.3745, lng: 88.6042 },
  { name: "Barishal", lat: 22.701, lng: 90.3535 },
  { name: "Rangpur", lat: 25.7439, lng: 89.2752 },
  { name: "Mymensingh", lat: 24.7471, lng: 90.4203 },
  { name: "Comilla", lat: 23.4607, lng: 91.1809 },
  { name: "Narayanganj", lat: 23.6238, lng: 90.5 },
  { name: "Gazipur", lat: 23.9999, lng: 90.4203 },
  { name: "Cox's Bazar", lat: 21.4272, lng: 92.0058 },
  { name: "Bangladesh", lat: 23.685, lng: 90.3563, country: true },
  { name: "India", lat: 28.6139, lng: 77.209, country: true },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Nepal", lat: 27.7172, lng: 85.324, country: true },
  { name: "Pakistan", lat: 33.6844, lng: 73.0479, country: true },
  { name: "Sri Lanka", lat: 6.9271, lng: 79.8612, country: true },
  { name: "Malaysia", lat: 3.139, lng: 101.6869, country: true },
  { name: "Singapore", lat: 1.3521, lng: 103.8198, country: true },
  { name: "Saudi Arabia", lat: 24.7136, lng: 46.6753, country: true },
  { name: "United Arab Emirates", lat: 25.2048, lng: 55.2708, country: true },
  { name: "Qatar", lat: 25.2854, lng: 51.531, country: true },
  { name: "Kuwait", lat: 29.3759, lng: 47.9774, country: true },
  { name: "Oman", lat: 23.588, lng: 58.3829, country: true },
];

// Clicking anywhere on the map (not just a dot) selects the nearest known
// place within ~250 km — gives a Facebook-like "pick an area" feel.
function NearestPlaceClick({ onToggle }: { onToggle: (name: string) => void }) {
  useMapEvents({
    click(e) {
      let best: { name: string; d: number } | null = null;
      for (const p of MAP_PLACES) {
        if (p.country) continue; // countries anchor at capitals — dots only
        const d = Math.hypot(e.latlng.lat - p.lat, e.latlng.lng - p.lng);
        if (!best || d < best.d) best = { name: p.name, d };
      }
      if (best && best.d < 2.5) onToggle(best.name);
    },
  });
  return null;
}

export function LocationMap({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (name: string) => void;
}) {
  const lower = selected.map((s) => s.toLowerCase());

  return (
    <div className="overflow-hidden rounded-lg border">
      <MapContainer
        center={[23.7, 90.4]}
        zoom={6}
        style={{ height: 260, width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <NearestPlaceClick onToggle={onToggle} />
        {MAP_PLACES.map((p) => {
          const isSelected = lower.includes(p.name.toLowerCase());
          return (
            <CircleMarker
              key={p.name}
              center={[p.lat, p.lng]}
              radius={isSelected ? (p.country ? 14 : 11) : p.country ? 9 : 7}
              pathOptions={{
                bubblingMouseEvents: false,
                color: isSelected ? "#2563eb" : "#64748b",
                fillColor: isSelected ? "#3b82f6" : "#94a3b8",
                fillOpacity: isSelected ? 0.7 : 0.45,
                weight: isSelected ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => onToggle(p.name) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {p.name}
                {isSelected ? " ✓ (click to remove)" : " — click to add"}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <p className="border-t bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
        Click a dot to target that area. Blue = selected.
      </p>
    </div>
  );
}
