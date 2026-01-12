import express from "express";
import fetch from "node-fetch";
import { turbineCoordinates } from "../turbineCoordinates.js";

const router = express.Router();

const getDayNight = (timestamp) => {
  const hour = new Date(timestamp).getHours();
  return hour >= 6 && hour < 18 ? "Day" : "Night";
};

const isTodayLocal = (selectedDateStr) => {
  if (!selectedDateStr) return true;
  const localNow = new Date(); // Server is already in local time
  const [y, m, d] = selectedDateStr.split("-").map(Number);
  const localSelected = new Date(y, m - 1, d);

  const result = localNow.toDateString() === localSelected.toDateString();
  console.log(`🟢 isTodayLocal check: selectedDate=${selectedDateStr}, localNow=${localNow.toDateString()}, result=${result}`);
  return result;
};

const buildForecastRangeUTC = (dateStr) => {
  const baseDate = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const startUTC = new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 4, 0, 0));
  const endUTC = new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1, 3, 59, 59));
  return { start: startUTC.toISOString(), end: endUTC.toISOString() };
};

// Fetch with retries
async function fetchWithRetry(url, options = {}, retries = 2, delay = 500) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      if (i < retries) await new Promise(r => setTimeout(r, delay));
      else throw err;
    }
  }
}

router.get("/:id/details", async (req, res) => {
  const deviceId = req.params.id;
  const selectedDate = req.query.date;
  const frontendTimestamp = req.query.timestamp; // log timestamp from frontend
  console.log(`📨 Frontend timestamp received: ${frontendTimestamp}`);

  try {
    const { start, end } = buildForecastRangeUTC(selectedDate);
    console.log(`⏱ Backend considers start=${start}, end=${end} for selectedDate=${selectedDate}`);

    const headers = { Accept: "application/json", "X-Api-Key": process.env.API_KEY };

    // Forecast
    let forecast = [];
    try {
      const forecastUrl = `${process.env.BASE_URL}/data?deviceIds=${deviceId}&dataSignalIds=838&timestampStart=${start}&timestampEnd=${end}&useUtc=true&resolution=10minute&aggregate=site&aggregateLevel=0&calculation=sum`;
      const forecastRaw = await fetchWithRetry(forecastUrl, { headers });
      forecastRaw.forEach(item => {
        if (item.data) {
          Object.entries(item.data).forEach(([ts, val]) => {
            forecast.push({
              timestamp: new Date(ts),
              measurement: val ?? null,
              unit: "kW",
              dayNight: getDayNight(ts)
            });
          });
        }
      });
    } catch (err) {
      console.warn("⚠️ Forecast fetch failed:", err.message);
    }

    // Realtime
    let realtime = [];
    const urls = [];
    const todayLocal = isTodayLocal(selectedDate);

    if (todayLocal) {
      urls.push(`${process.env.BASE_URL}/data?deviceIds=${deviceId}&dataSignalIds=5&timestampStart=${start}&timestampEnd=${end}&useUtc=true&resolution=10minute&aggregate=site&aggregateLevel=0&calculation=sum`);
      urls.push(`${process.env.BASE_URL}/realtimedata?deviceIds=${deviceId}&dataSignalIds=5&aggregate=device&aggregateLevel=0&calculation=sum`);
    } else {
      urls.push(`${process.env.BASE_URL}/data?deviceIds=${deviceId}&dataSignalIds=5&timestampStart=${start}&timestampEnd=${end}&useUtc=true&resolution=10minute&aggregate=site&aggregateLevel=0&calculation=sum`);
    }

    for (const url of urls) {
      try {
        const data = await fetchWithRetry(url, { headers });
        data.forEach(d => {
          if (d.data) Object.entries(d.data).forEach(([ts, val]) => {
            realtime.push({ timestamp: new Date(ts), measurement: val ?? null, unit: "kW" });
          });
        });
      } catch (err) {
        console.warn("⚠️ Realtime fetch failed:", err.message);
      }
    }

    // Filter future if today
    if (todayLocal) {
      const now = new Date();
      realtime = realtime.filter(entry => new Date(entry.timestamp) <= now);
    }

    res.json({
      deviceId,
      forecast,
      realtime,
      latitude: turbineCoordinates[deviceId]?.latitude ?? 0,
      longitude: turbineCoordinates[deviceId]?.longitude ?? 0,
      isTodayLocal: todayLocal,
      frontendTimestamp: frontendTimestamp,
      startUTC: start,
      endUTC: end
    });
  } catch (err) {
    console.error("🚨 Unexpected error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
