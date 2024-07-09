import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import { LatLngExpression } from "leaflet";

interface MapViewProps {
  route: { lat: number; lng: number }[];
}
//
const MapView: React.FC<MapViewProps> = ({ route }) => {
  const center: LatLngExpression = [route[0].lat, route[0].lng];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Polyline
        positions={route.map((loc) => [loc.lat, loc.lng] as LatLngExpression)}
      />
      {route.map((loc, idx) => (
        <Marker key={idx} position={[loc.lat, loc.lng] as LatLngExpression} />
      ))}
    </MapContainer>
  );
};

export default MapView;
