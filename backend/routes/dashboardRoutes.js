import express from "express";
import fetch from "node-fetch";
import { turbineDeviceIds } from "../deviceIds.js";
import { turbineCoordinates } from "../turbineCoordinates.js";
import { locationGroups } from "../locationGroups.js";

const router = express.Router();

// ---------------- Helpers ----------------
const TEN_MINUTES_MS = 1000 * 60 * 10;
const INTERVAL_HOURS = 10 / 60;

function next10MinuteInterval(date = new Date()) {
  return new Date(Math.ceil(date.getTime() / TEN_MINUTES_MS) * TEN_MINUTES_MS);
}

function current10MinuteIntervalUTC(date = new Date()) {
  const utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  );
  return new Date(Math.floor(utc / TEN_MINUTES_MS) * TEN_MINUTES_MS);
}

async function fetchWithRetry(url, options = {}, retries = 2, delay = 500) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i < retries) await new Promise((r) => setTimeout(r, delay));
      else throw err;
    }
  }
}

const cache = new Map();
const getCache = (key) => cache.get(key);
const setCache = (key, value) => cache.set(key, value);

function rangeIncludesToday(start, end) {
  const today = new Date();
  return today >= start && today <= end;
}

function getLocationNameForId(aggregateId) {
  const idNum = Number(aggregateId);
  for (const [loc, ids] of Object.entries(locationGroups || {})) {
    if (Array.isArray(ids) && ids.includes(idNum)) return loc;
  }
  return "";
}

// ---------------- Determine resolution based on date range ----------------
function getResolution(startDate, endDate) {
  const diffMs = endDate - startDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 7) return "hourly";
  if (diffDays <= 30) return "daily";
  if (diffDays <= 180) return "weekly"; // 1–6 months
  if (diffDays <= 730) return "monthly"; // 6–24 months
  return "yearly"; // >2 years
}

// ---------------- Backend Route ----------------
router.get("/", async (req, res) => {
  try {
    const headers = { Accept: "application/json", "X-Api-Key": process.env.API_KEY };

    // --- Parse filters ---
    let startDate = req.query.start ? new Date(req.query.start) : new Date();
    let endDate = req.query.end ? new Date(req.query.end) : new Date();
    const locationFilter = typeof req.query.location === "string" ? req.query.location : "";
    const devicesFilter = req.query.devices ? req.query.devices.split(",") : [];

    if (startDate > endDate) [startDate, endDate] = [endDate, startDate];

    const startOfDay = new Date(startDate);
    startOfDay.setUTCHours(4, 0, 0, 0);

    let endOfDay = new Date(endDate);
    endOfDay.setUTCHours(3, 59, 59, 999);
    if (endOfDay < startOfDay)
      endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const cacheKey = `${startOfDay.toISOString()}-${endOfDay.toISOString()}-${locationFilter}-${devicesFilter.join(",")}`;
    const includesToday = rangeIncludesToday(startOfDay, endOfDay);

    if (!includesToday && getCache(cacheKey)) return res.json(getCache(cacheKey));

    // ---------------- Determine turbine lists ----------------
    let sidebarTurbines = Array.isArray(turbineDeviceIds) ? [...turbineDeviceIds] : [];
    if (locationFilter && locationGroups[locationFilter]) sidebarTurbines = [...locationGroups[locationFilter]];

    let activeIdsForData = sidebarTurbines;
    if (devicesFilter.length > 0) {
      activeIdsForData = sidebarTurbines.filter((id) =>
        devicesFilter.includes(String(id))
      );
    }

    if (!activeIdsForData.length) {
      return res.json({
        mappedData: [],
        forecastDayMWh: 0,
        forecastNightMWh: 0,
        lineChart: { labels: [], live: [], forecast: [] },
        lineChartPerTurbine: { labels: [], turbines: {} },
        realtime: { timestamp: null, value: 0 },
        totalMWh: 0,
        lowestTurbine: null,
        timestampStart: startOfDay.toISOString(),
        timestampEnd: endOfDay.toISOString(),
      });
    }

    // ---------------- Compute resolution and useUtc ----------------
    const resolution = getResolution(startOfDay, endOfDay);
    const useUtc = resolution === "hourly"; // only hourly supports UTC

    const deviceQuery = activeIdsForData.join(",");

    // ---------------- Build URLs ----------------
    const liveUrl = `${process.env.BASE_URL}/realtimedata?deviceIds=${deviceQuery}&dataSignalIds=5&aggregate=device&aggregateLevel=0&calculation=sum`;
    const forecastUrlBase = `${process.env.BASE_URL}/data?deviceIds=${deviceQuery}&dataSignalIds=838`;
    const realtimeUrl = `${process.env.BASE_URL}/realtimedata?deviceIds=${deviceQuery}&dataSignalIds=5&aggregate=site&aggregateLevel=0&calculation=sum`;

    // ---------------- Get REAL realtime timestamp ----------------
    let realtimeTS = null;
    try {
      const tmpRealtime = await fetchWithRetry(realtimeUrl, { headers }).catch(() => []);
      if (Array.isArray(tmpRealtime) && tmpRealtime.length > 0) {
        const entries = Object.entries(tmpRealtime[0].data || {});
        if (entries.length > 0) realtimeTS = new Date(entries[0][0]);
      }
    } catch {}

    // ---------------- Use realtime timestamp for next 10min ----------------
    const timestampStart = realtimeTS
      ? next10MinuteInterval(realtimeTS)
      : current10MinuteIntervalUTC();
    const timestampEnd = new Date(timestampStart.getTime() + TEN_MINUTES_MS);

    const forecastUrl =
      `${forecastUrlBase}&timestampStart=${timestampStart.toISOString()}` +
      `&timestampEnd=${timestampEnd.toISOString()}&useUtc=true&aggregate=device&aggregateLevel=0&calculation=sum`;

    const fullForecastUrl =
      `${forecastUrlBase}&timestampStart=${startOfDay.toISOString()}` +
      `&timestampEnd=${endOfDay.toISOString()}` +
      `&useUtc=true&aggregate=device&aggregateLevel=0&calculation=sum&resolution=hourly`;

    const lineChartUrl =
      `${process.env.BASE_URL}/data?deviceIds=${deviceQuery}&dataSignalIds=5,838` +
      `&timestampStart=${startOfDay.toISOString()}&timestampEnd=${endOfDay.toISOString()}` +
      `&aggregate=site&aggregateLevel=0&calculation=sum&resolution=${resolution}` +
      (useUtc ? "&useUtc=true" : ""); // only append if hourly

    const perTurbineLineChartUrl =
      `${process.env.BASE_URL}/data?deviceIds=${deviceQuery}&dataSignalIds=5,838` +
      `&timestampStart=${startOfDay.toISOString()}&timestampEnd=${endOfDay.toISOString()}` +
      `&aggregate=device&aggregateLevel=0&calculation=sum&resolution=${resolution}` +
      (useUtc ? "&useUtc=true" : "");

    const totalMWhUrl =
      `${process.env.BASE_URL}/data?deviceIds=${deviceQuery}&dataSignalIds=5` +
      `&timestampStart=${startOfDay.toISOString()}&timestampEnd=${endOfDay.toISOString()}` +
      `&useUtc=${useUtc}&aggregate=device&aggregateLevel=0&calculation=sum&resolution=0`;

    // ---------------- Fetch data ----------------
    const [liveDataRaw, rawForecast, fullForecast, rawLineData, rawPerTurbineLineData, realtimeData, totalRaw] =
      await Promise.all([
        fetchWithRetry(liveUrl, { headers }).catch(() => []),
        fetchWithRetry(forecastUrl, { headers }).catch(() => []),
        fetchWithRetry(fullForecastUrl, { headers }).catch(() => []),
        fetchWithRetry(lineChartUrl, { headers }).catch(() => []),
        fetchWithRetry(perTurbineLineChartUrl, { headers }).catch(() => []),
        fetchWithRetry(realtimeUrl, { headers }).catch(() => []),
        fetchWithRetry(totalMWhUrl, { headers }).catch(() => []),
      ]);

    const liveData = Array.isArray(liveDataRaw) ? liveDataRaw : [];

    // ---------------- Next 10-min forecast ----------------
    const forecastData = (Array.isArray(rawForecast) ? rawForecast : [])
      .filter((t) => t?.data)
      .map((t) => {
        const timestampRaw = Object.keys(t.data).sort()[0];
        return {
          aggregateId: t.aggregateId,
          forecastNext10Min: t.data[timestampRaw] || 0,
          timestamp: timestampRaw,
        };
      });

    // ---------------- FIXED mappedData ----------------
    const selectedIdSet = new Set(activeIdsForData);

    const mappedData = sidebarTurbines.map((id) => {
      const isSelected = selectedIdSet.has(id);

      const live = isSelected
        ? liveData.find((t) => t.aggregateId === id)
        : null;

      const forecast = isSelected
        ? forecastData.find((f) => f.aggregateId === id)
        : null;

      const coord = turbineCoordinates[id] ?? {};
      const locationName = getLocationNameForId(id);

      const liveTimestamp =
        live?.data && Object.keys(live.data).length
          ? Object.keys(live.data)[0]
          : null;

      const online = isSelected && !!liveTimestamp;

      return {
        aggregateId: id,
        measurement: online ? Object.values(live?.data || {})[0] : 0,
        timestamp: liveTimestamp ? new Date(liveTimestamp).toISOString() : null,
        online,
        excluded: !isSelected,
        latitude: coord.latitude ?? 0,
        longitude: coord.longitude ?? 0,
        location: locationName,
        forecastNext10Min: isSelected ? forecast?.forecastNext10Min ?? null : null,
        forecastTimestamp:
          isSelected && forecast?.timestamp
            ? new Date(forecast.timestamp).toISOString()
            : null,
      };
    });

    // ---------------- Full-day forecast (hourly) ----------------
    let forecastDayKWh = 0,
      forecastNightKWh = 0;

    (Array.isArray(fullForecast) ? fullForecast : []).forEach((turbine) => {
      if (!turbine.data) return;
      Object.entries(turbine.data).forEach(([ts, val]) => {
        const kWh = val || 0;
        const hour = new Date(ts).getUTCHours();
        if (hour >= 10 && hour < 22) forecastDayKWh += kWh;
        else forecastNightKWh += kWh;
      });
    });

    const forecastDayMWh = forecastDayKWh / 1000;
    const forecastNightMWh = forecastNightKWh / 1000;

    // ---------------- Line chart (aggregated) ----------------
    let labels = [];
    let liveDataArray = [];
    let forecastDataArray = [];

    // --- FIX: Use API returned timestamps directly for non-hourly ---
    if (["weekly", "monthly", "yearly"].includes(resolution) && Array.isArray(rawLineData) && rawLineData.length > 0) {
      const tsSet = new Set();
      rawLineData.forEach((device) => {
        if (!device?.data) return;
        Object.keys(device.data).forEach((ts) => tsSet.add(ts));
      });
      labels = Array.from(tsSet).sort((a,b)=> new Date(a)-new Date(b));

      liveDataArray = labels.map(lbl => {
        let sum = 0;
        rawLineData.forEach(device => {
          if (device.dataSignal.dataSignalId === 5) sum += device.data[lbl] || 0;
        });
        return sum || null;
      });

      forecastDataArray = labels.map(lbl => {
        let sum = 0;
        rawLineData.forEach(device => {
          if (device.dataSignal.dataSignalId === 838) sum += device.data[lbl] || 0;
        });
        return sum;
      });
    } else {
      // hourly/daily: old incremental approach
      let current = new Date(startOfDay);
      while (current <= endOfDay) {
        labels.push(new Date(current).toISOString());
        liveDataArray.push(null);
        forecastDataArray.push(0);

        switch (resolution) {
          case "hourly":
            current.setHours(current.getHours() + 1);
            break;
          case "daily":
            current.setDate(current.getDate() + 1);
            break;
        }
      }

      (Array.isArray(rawLineData) ? rawLineData : []).forEach((device) => {
        if (!device.data || !device.dataSignal) return;
        const isLive = device.dataSignal.dataSignalId === 5;
        const isForecast = device.dataSignal.dataSignalId === 838;

        Object.entries(device.data).forEach(([ts, val]) => {
          if (val == null) return;
          const index = labels.findIndex(lbl => new Date(lbl).getTime() === new Date(ts).getTime());
          if (index === -1) return;
          if (isLive) liveDataArray[index] = (liveDataArray[index] || 0) + val;
          if (isForecast) forecastDataArray[index] += val;
        });
      });
    }

    // ---------------- Per-turbine line chart ----------------
    const perTurbineSeries = {};
    activeIdsForData.forEach((id) => {
      perTurbineSeries[id] = {
        live: Array(labels.length).fill(null),
        forecast: Array(labels.length).fill(0),
      };
    });

    (Array.isArray(rawPerTurbineLineData) ? rawPerTurbineLineData : []).forEach((device) => {
      if (!device?.data || !device?.dataSignal) return;
      const turbineId = device.aggregateId;
      if (!perTurbineSeries[turbineId]) return;

      const isLive = device.dataSignal.dataSignalId === 5;
      const isForecast = device.dataSignal.dataSignalId === 838;

      Object.entries(device.data).forEach(([ts, val]) => {
        if (val == null) return;
        const index = labels.findIndex((lbl) => new Date(lbl).getTime() === new Date(ts).getTime());
        if (index === -1) return;

        if (isLive) perTurbineSeries[turbineId].live[index] = val;
        if (isForecast) perTurbineSeries[turbineId].forecast[index] += val;
      });
    });

    // ---------------- Realtime ----------------
    let realtimeValue = 0,
      realtimeTimestamp = null;
    (Array.isArray(realtimeData) ? realtimeData : []).forEach((item) => {
      if (!item?.data) return;
      const entries = Object.entries(item.data);
      if (!entries.length) return;
      const [ts, val] = entries[0];
      realtimeValue += val ?? 0;
      if (!realtimeTimestamp || new Date(ts) > new Date(realtimeTimestamp))
        realtimeTimestamp = ts;
    });

    // ---------------- Total MWh ----------------
    const totalKWh = (Array.isArray(totalRaw) ? totalRaw : []).reduce(
      (sum, t) =>
        sum +
        (t.data
          ? Object.values(t.data).reduce((a, v) => a + (v || 0) * INTERVAL_HOURS, 0)
          : 0),
      0
    );
    const totalMWh = totalKWh / 1000;

    // ---------------- Lowest turbine ----------------
    let lowestTurbine = null;
    const isExactToday =
      startOfDay.toDateString() === new Date().toDateString() &&
      endOfDay.toDateString() === new Date().toDateString();

    if (mappedData.length > 0) {
      const turbinesToEvaluate = isExactToday
        ? mappedData.filter((t) => t.online)
        : mappedData;

      if (turbinesToEvaluate.length > 0) {
        if (isExactToday) {
          const turbinesWithPerformance = turbinesToEvaluate
            .map((t) => {
              const forecastVal = t.forecastNext10Min ?? 0;
              const measurement = t.measurement ?? 0;
              const performanceRatio = forecastVal > 0 ? measurement / forecastVal : 0;
              return { ...t, performanceRatio };
            })
            .sort((a, b) => a.performanceRatio - b.performanceRatio);

          lowestTurbine = turbinesWithPerformance[0] ?? null;
          if (lowestTurbine) {
            lowestTurbine.start = startOfDay.toISOString();
            lowestTurbine.end = endOfDay.toISOString();
          }
        } else {
          const turbineMWhMap = {};
          (Array.isArray(totalRaw) ? totalRaw : []).forEach((t) => {
            if (t?.data) {
              const turbineId = t.aggregateId;
              const totalKWhForTurbine = Object.values(t.data).reduce(
                (sum, val) => sum + (val || 0) * INTERVAL_HOURS,
                0
              );
              turbineMWhMap[turbineId] = totalKWhForTurbine / 1000;
            }
          });

          const turbinesWithPerformance = turbinesToEvaluate
            .map((t) => ({
              ...t,
              totalMWh: turbineMWhMap[t.aggregateId] ?? 0,
            }))
            .sort((a, b) => a.totalMWh - b.totalMWh);

          lowestTurbine = turbinesWithPerformance[0] ?? null;
          if (lowestTurbine) {
            lowestTurbine.start = startOfDay.toISOString();
            lowestTurbine.end = endOfDay.toISOString();
          }
        }
      }
    }

    // ---------------- Final response ----------------
    const response = {
      mappedData,
      forecastDayMWh,
      forecastNightMWh,
      lineChart: {
        labels,
        live: liveDataArray,
        forecast: forecastDataArray,
      },
      lineChartPerTurbine: {
        labels,
        turbines: perTurbineSeries,
      },
      realtime: { timestamp: realtimeTimestamp, value: realtimeValue },
      totalMWh,
      lowestTurbine,
      timestampStart: startOfDay.toISOString(),
      timestampEnd: endOfDay.toISOString(),
    };

    if (!includesToday) setCache(cacheKey, response);
    return res.json(response);

  } catch (err) {
    console.error("🚨 Unified fetch failed:", err?.message ?? err);
    res.status(500).json({ error: "Failed to fetch unified turbine data." });
  }
});

export default router;
