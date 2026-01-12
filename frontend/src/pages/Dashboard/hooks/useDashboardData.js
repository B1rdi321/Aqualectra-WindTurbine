import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Expects filters.startDate and filters.endDate to be Date objects representing
 * local-day-aligned boundaries:
 *  - startDate: local 00:00:00 of the start day
 *  - endDate: local 23:59:59.999 of the end day
 *
 * fetchData will send ISO strings (UTC offsets included) to the backend,
 * but day logic / isLive checks are based on local Date objects.
 */

export default function useDashboardData(filters) {
  const [turbines, setTurbines] = useState([]);
  const lastTurbinesRef = useRef([]);

  const [deviceMap, setDeviceMap] = useState({});
  const lastDeviceMapRef = useRef({});

  const [locationGroups, setLocationGroups] = useState({});
  const lastLocationGroupsRef = useRef({});

  const [forecastDayMWh, setForecastDayMWh] = useState(null);
  const [forecastNightMWh, setForecastNightMWh] = useState(null);
  const lastForecastDayRef = useRef(null);
  const lastForecastNightRef = useRef(null);

  const [lineChart, setLineChart] = useState({ labels: [], live: [], forecast: [], realtime: null });
  const lastLineChartRef = useRef({ labels: [], live: [], forecast: [], realtime: null });

  const [totalMWh, setTotalMWh] = useState(null);
  const lastTotalRef = useRef(null);

  const [lowestTurbine, setLowestTurbine] = useState(null);
  const [allTimeLowestTurbine, setAllTimeLowestTurbine] = useState(null);
  const lastLowestRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const abortControllerRef = useRef(null);
  const latestFetchIdRef = useRef(0);

  // Retry helper
  const fetchWithRetry = async (url, retries = 2, delay = 500, signal) => {
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        if (err.name === "AbortError") throw err;
        if (i < retries) await new Promise((r) => setTimeout(r, delay));
        else throw err;
      }
    }
  };

  const fetchData = useCallback(
    async (currentFilters, { background = false } = {}) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!background) setLoading(true);
      else setIsFetching(true);

      latestFetchIdRef.current += 1;
      const fetchId = latestFetchIdRef.current;

      try {
        const activeFilters = currentFilters ?? filters;

        const params = new URLSearchParams();
        if (activeFilters?.startDate instanceof Date && !isNaN(activeFilters.startDate)) {
          params.append("start", activeFilters.startDate.toISOString());
        }
        if (activeFilters?.endDate instanceof Date && !isNaN(activeFilters.endDate)) {
          params.append("end", activeFilters.endDate.toISOString());
        }
        if (activeFilters?.location) params.append("location", activeFilters.location);
        if (activeFilters?.devices?.length > 0) params.append("devices", activeFilters.devices.join(","));

        const url = `http://localhost:5000/api/greenbyte/turbines/all?${params.toString()}`;
        console.log(`🌐 Fetching JSON from: %c${url}`, "color: blue; font-weight: bold");

        const data = await fetchWithRetry(url, 2, 500, controller.signal);

        if (fetchId !== latestFetchIdRef.current) return;

        const parsedTurbines = data.mappedData.map((t) => ({
          ...t,
          timestamp: t.timestamp ? new Date(t.timestamp) : null,
          forecastTimestamp: t.forecastTimestamp ? new Date(t.forecastTimestamp) : null,
        }));

        setTurbines(parsedTurbines);
        lastTurbinesRef.current = parsedTurbines;

        setForecastDayMWh(data.forecastDayMWh ?? null);
        lastForecastDayRef.current = data.forecastDayMWh ?? null;

        setForecastNightMWh(data.forecastNightMWh ?? null);
        lastForecastNightRef.current = data.forecastNightMWh ?? null;

        const timestamps = parsedTurbines
          .map((t) => t.timestamp)
          .filter((ts) => ts instanceof Date && !isNaN(ts));
        setLastUpdated(timestamps.length ? new Date(Math.max(...timestamps.map((ts) => ts.getTime()))) : null);

        // Fetch devices and location groups in parallel if not already loaded
        if (!Object.keys(deviceMap).length || !Object.keys(locationGroups).length) {
          const [devices, locs] = await Promise.all([
            !Object.keys(deviceMap).length
              ? fetchWithRetry("http://localhost:5000/api/greenbyte/turbines/devices", 2, 500, controller.signal)
              : Promise.resolve(deviceMap),
            !Object.keys(locationGroups).length
              ? fetchWithRetry("http://localhost:5000/api/location-groups", 2, 500, controller.signal)
              : Promise.resolve(locationGroups),
          ]);
          if (!Object.keys(deviceMap).length) {
            setDeviceMap(devices);
            lastDeviceMapRef.current = devices;
          }
          if (!Object.keys(locationGroups).length) {
            setLocationGroups(locs);
            lastLocationGroupsRef.current = locs;
          }
        }

        const lineChartData = {
          labels: data.lineChart.labels.map((ts) => (ts ? new Date(ts) : null)),
          live: data.lineChart.live,
          forecast: data.lineChart.forecast,
          realtime: data.realtime ? { timestamp: new Date(data.realtime.timestamp), value: data.realtime.value } : null,
        };
        setLineChart(lineChartData);
        lastLineChartRef.current = lineChartData;

        setTotalMWh(data.totalMWh);
        lastTotalRef.current = data.totalMWh;

        setLowestTurbine(data.lowestTurbine ?? null);
        setAllTimeLowestTurbine(data.allTimeLowestTurbine ?? null);
        lastLowestRef.current = data.lowestTurbine ?? null;

        setError(null);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("❌ Dashboard data fetch failed:", err);
          setError("Failed to fetch data. Showing last available values.");
        }
      } finally {
        if (!background) setLoading(false);
        else setIsFetching(false);
      }
    },
    [filters, deviceMap, locationGroups]
  );

  useEffect(() => {
    const isInitialLoad = turbines.length === 0;
    fetchData(filters, { background: !isInitialLoad });

    const now = new Date();
    const isLive = filters?.endDate && filters.endDate.getTime() >= now.getTime();
    if (isLive) {
      const interval = setInterval(() => fetchData(filters, { background: true }), 5000);
      return () => clearInterval(interval);
    }
  }, [filters, fetchData]);

  return {
    turbines,
    deviceMap,
    locationGroups,
    forecastDayMWh,
    forecastNightMWh,
    lineChart,
    totalMWh,
    lowestTurbine,
    allTimeLowestTurbine,
    loading,
    isFetching,
    error,
    lastUpdated,
  };
}