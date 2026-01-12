import React, { useEffect, useState, useRef } from "react"; 
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import MapHeader from "./MapHeader";
import customPin from "../../assets/wind-power.png";

// Fix default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;

const customIcon = new L.Icon({
  iconUrl: customPin,
  iconRetinaUrl: customPin,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  shadowUrl: null,
});

// Smoothly fly to a position
function MapFlyTo({ position, zoom }) {
  const map = useMap();
  const prevPos = useRef(null);

  useEffect(() => {
    if (position && (prevPos.current === null || prevPos.current.toString() !== position.toString())) {
      map.flyTo(position, zoom, { duration: 0.5 });
      prevPos.current = position;
    }
  }, [position, zoom, map]);

  return null;
}

export default function MapPage() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const [turbines, setTurbines] = useState([]);
  const [deviceMap, setDeviceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // debounce typing
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  // fetch turbine data
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

  // filter turbines based on debounced search
  const filteredTurbines = turbines.filter((t) => {
    const nameMatch = (deviceMap[t.id] || "")
      .toLowerCase()
      .includes(debouncedSearch.toLowerCase());
    const idMatch = t.id.toString().toLowerCase().includes(debouncedSearch.toLowerCase());
    return nameMatch || idMatch;
  });

  // only snap to first match if debounced search is not empty
  const firstMatchPos =
    debouncedSearch && filteredTurbines.length > 0
      ? [filteredTurbines[0].latitude, filteredTurbines[0].longitude]
      : null;

  // default center
  const defaultCenter =
    turbines.length > 0
      ? [
          turbines.reduce((sum, t) => sum + t.latitude, 0) / turbines.length,
          turbines.reduce((sum, t) => sum + t.longitude, 0) / turbines.length,
        ]
      : [12.122, -68.905];

  const handleMarkerClick = (turbineId) => {
    if (window.innerWidth >= 768) navigate(`/turbinedetails/${turbineId}`);
  };

  const handleViewDetailsClick = (turbineId) => {
    navigate(`/turbinedetails/${turbineId}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MapHeader search={search} setSearch={setSearch} />

      <main className="flex-grow h-[calc(100vh-64px)]">
        <MapContainer center={defaultCenter} zoom={12} scrollWheelZoom className="w-full h-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {firstMatchPos && <MapFlyTo position={firstMatchPos} zoom={16} />}

          {loading && <div>Loading turbines...</div>}
          {error && <div className="text-red-500">{error}</div>}

          {!loading &&
            !error &&
            filteredTurbines.map((turbine) => (
              <Marker
                key={turbine.id}
                position={[turbine.latitude, turbine.longitude]}
                icon={customIcon}
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
