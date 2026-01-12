import React, { useEffect, useState } from "react"; 
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import MapHeader from "./MapHeader";
import customPin from "../../assets/wind-power.png"; // <-- your pin

// Fix default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;

const customIcon = new L.Icon({
  iconUrl: customPin,
  iconRetinaUrl: customPin,
  iconSize: [32, 32], // adjust to desired size
  iconAnchor: [16, 32], // anchor point (middle bottom)
  popupAnchor: [0, -32], // popup relative to icon
  shadowUrl: null,
});

export default function MapPage() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const [turbines, setTurbines] = useState([]);
  const [deviceMap, setDeviceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resTurbines = await fetch(`${API_BASE_URL}/api/greenbyte/turbines`);
        if (!resTurbines.ok) throw new Error("Failed to fetch turbine data");
        const dataTurbines = await resTurbines.json();

        const mappedData = dataTurbines.map((item) => ({
          id: item.aggregateId,
          power: Object.values(item.data)[0],
          latitude: item.latitude,
          longitude: item.longitude,
        }));

        setTurbines(mappedData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    const fetchDeviceMap = async () => {
      try {
        const resMap = await fetch(`${API_BASE_URL}/api/greenbyte/turbines/devices`);
        const map = await resMap.json();
        setDeviceMap(map);
      } catch (err) {
        console.error("Failed to fetch device mapping:", err);
      }
    };

    fetchData();
    fetchDeviceMap();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredTurbines = turbines.filter((t) => {
    const nameMatch = (deviceMap[t.id] || "").toLowerCase().includes(search.toLowerCase());
    const idMatch = t.id.toString().toLowerCase().includes(search.toLowerCase());
    return nameMatch || idMatch;
  });

  const mapCenter =
    filteredTurbines.length > 0
      ? [
          filteredTurbines.reduce((sum, t) => sum + t.latitude, 0) / filteredTurbines.length,
          filteredTurbines.reduce((sum, t) => sum + t.longitude, 0) / filteredTurbines.length,
        ]
      : [12.122, -68.905];

  const handleMarkerClick = (turbineId) => {
    if (window.innerWidth >= 768) {
      navigate(`/turbinedetails/${turbineId}`);
    }
  };

  const handleViewDetailsClick = (turbineId) => {
    navigate(`/turbinedetails/${turbineId}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MapHeader search={search} setSearch={setSearch} />

      <main className="flex-grow h-[calc(100vh-64px)]">
        <MapContainer center={mapCenter} zoom={12} scrollWheelZoom={true} className="w-full h-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {loading && <div>Loading turbines...</div>}
          {error && <div className="text-red-500">{error}</div>}

          {!loading &&
            !error &&
            filteredTurbines.map((turbine) => (
              <Marker
                key={turbine.id}
                position={[turbine.latitude, turbine.longitude]}
                icon={customIcon} // <-- use custom pin here
                eventHandlers={{
                  click: () => handleMarkerClick(turbine.id),
                  mouseover: (e) => e.target.openPopup(),
                  mouseout: (e) => e.target.closePopup(),
                }}
              >
                <Popup>
                  <h3>{deviceMap[turbine.id] || `Turbine ${turbine.id}`}</h3>
                  <p>Power: {turbine.power?.toFixed(2) || "N/A"} kW</p>
                  <p
                    className="text-blue-600 cursor-pointer underline mt-1 block md:hidden"
                    onClick={() => handleViewDetailsClick(turbine.id)}
                  >
                    View Details
                  </p>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </main>
    </div>
  );
}
