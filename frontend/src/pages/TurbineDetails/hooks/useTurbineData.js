import { useEffect, useState, useRef } from "react";
import { getLocalDateString } from "../../../utils/turbineUtils";

export default function useTurbineData(id, selectedDate) {
  const [details, setDetails] = useState(null);
  const [deviceMap, setDeviceMap] = useState({});
  const [turbineList, setTurbineList] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Keep a ref to track interval so we can clear it properly
  const intervalRef = useRef(null);

  // Determine which date to fetch: parent selectedDate or today if null
  const todayStr = getLocalDateString(new Date());
  const fetchDate = selectedDate ? getLocalDateString(selectedDate) : todayStr;

  // Fetch turbines & device map once
  useEffect(() => {
    (async () => {
      try {
        const [devRes, turRes] = await Promise.all([
          fetch("http://localhost:5000/api/greenbyte/turbines/devices"),
          fetch("http://localhost:5000/api/greenbyte/turbines"),
        ]);
        setDeviceMap(await devRes.json());
        setTurbineList(await turRes.json());
      } catch (err) {
        console.error("Failed to load turbine lists", err);
      }
    })();
  }, []);

  // Fetch turbine details with optional auto-refresh if fetching today
  useEffect(() => {
    if (!id || !fetchDate) return;

    const fetchDetails = async () => {
      try {
        const timestamp = new Date().toISOString(); // frontend timestamp
        const url = `http://localhost:5000/api/greenbyte/turbines/${id}/details?date=${fetchDate}&timestamp=${timestamp}`;

        console.log("🌐 Fetching turbine details from:", url);

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch details");

        const data = await res.json();
        console.log("📥 JSON received (keys):", data ? Object.keys(data) : "empty");

        setDetails(data);
        setError(null);

        const latestRealtime = data.realtime?.[data.realtime.length - 1]?.timestamp;
        setLastUpdated(latestRealtime ? new Date(latestRealtime) : null);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch latest data. Showing last available data.");
      }
    };

    // Clear any previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    fetchDetails();

    // Only auto-refresh if fetching today
    if (fetchDate === todayStr) {
      intervalRef.current = setInterval(fetchDetails, 5000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id, fetchDate, todayStr]);

  return { details, deviceMap, turbineList, lastUpdated, error };
}
