import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const BASE_URL = process.env.BASE_URL;
const API_KEY = process.env.API_KEY;

import { turbineDeviceIds, turbineDeviceMap } from "../deviceIds.js";

// ---------------- STRICT RISK RULES ----------------
const LAST_DEVIATION_THRESHOLD = -200;
const SLOPE_THRESHOLD = -5;
const VOLATILITY_THRESHOLD = 200;
const MIN_POINTS = 5;
const FORECAST_HOURS = 3; // predict next 3 hours
const STOPPED_THRESHOLD = 1; // if last measurements are ≤ this, turbine considered stopped
const STOPPED_CHECK_POINTS = 3; // last n points to check for stoppage

// ------------------ Retry helper -------------------
async function fetchWithRetry(fn, retries = 3, delayMs = 1000) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      console.log(`Fetch failed, retrying in ${delayMs}ms...`, err.message);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// ----------------------------------------------------
// Fetch actual + forecast and merge
// ----------------------------------------------------
async function fetchTurbineData(turbineId, start, end, resolution = "hourly") {
  const url =
    `${BASE_URL}/data?deviceIds=${turbineId}&dataSignalIds=838,5` +
    `&timestampStart=${encodeURIComponent(start)}` +
    `&timestampEnd=${encodeURIComponent(end)}` +
    `&useUtc=true&resolution=${resolution}&aggregate=site&aggregateLevel=0&calculation=sum`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": API_KEY,
    },
  });

  const rawData = await res.json();
  if (!rawData.length) return [];

  const forecastSignal = rawData.find((d) => d.dataSignal.dataSignalId === 838);
  const actualSignal = rawData.find((d) => d.dataSignal.dataSignalId === 5);
  if (!forecastSignal || !actualSignal) return [];

  const timestamps = Object.keys(forecastSignal.data);

  return timestamps
    .map((ts) => ({
      timestamp: ts,
      forecastNext10Min: forecastSignal.data[ts],
      measurement: actualSignal.data[ts],
    }))
    .filter((d) => d.measurement != null);
}

// ----------------------------------------------------
// Linear regression slope
// ----------------------------------------------------
function computeSlope(values) {
  const n = values.length;
  const x = [...Array(n).keys()];
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - meanX) * (values[i] - meanY);
    den += (x[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

// ----------------------------------------------------
// Standard deviation
// ----------------------------------------------------
function computeStdDev(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ----------------------------------------------------
// Forecast next points using linear regression
// ----------------------------------------------------
function forecastNext(values, hours = 3) {
  const slope = computeSlope(values);
  const last = values[values.length - 1];
  const predictions = [];
  for (let i = 1; i <= hours; i++) {
    predictions.push(last + slope * i);
  }
  return predictions;
}

// ----------------------------------------------------
// STRICT risk analysis + severity + reasoning
// ----------------------------------------------------
function analyzeRisk(data) {
  if (data.length < MIN_POINTS) {
    console.log("Not enough data — skipping.");
    return null;
  }

  const deviations = data.map((d) => d.measurement - d.forecastNext10Min);
  const negativeDevs = deviations.map((d) => Math.min(0, d));
  const lastDeviation = negativeDevs[negativeDevs.length - 1];

  if (lastDeviation >= 0) return null;

  const slope = computeSlope(negativeDevs);
  const volatility = computeStdDev(negativeDevs);

  const futureDevs = forecastNext(negativeDevs, FORECAST_HOURS);
  const futureRisk = futureDevs.some((d) => d < LAST_DEVIATION_THRESHOLD);

  const last3Neg = negativeDevs.slice(-3).every((d) => d < 0);

  const lastPoints = data.slice(-STOPPED_CHECK_POINTS);
  const stopped = lastPoints.every((d) => d.measurement <= STOPPED_THRESHOLD);

  const isRisk =
    futureRisk ||
    ((lastDeviation < LAST_DEVIATION_THRESHOLD && slope < SLOPE_THRESHOLD && last3Neg) ||
      (volatility > VOLATILITY_THRESHOLD && slope < 0) ||
      stopped);

  if (!isRisk) return null;

  let severity = "low";
  if (stopped) {
    severity = "stopped";
  } else if (
    lastDeviation < LAST_DEVIATION_THRESHOLD * 2 ||
    slope < SLOPE_THRESHOLD * 2 ||
    futureDevs.some((d) => d < LAST_DEVIATION_THRESHOLD * 1.5)
  ) {
    severity = "high";
  } else if (lastDeviation < LAST_DEVIATION_THRESHOLD * 1.5) {
    severity = "medium";
  }

  const reasoning = stopped
    ? "Turbine has stopped generating."
    : `Detected underperformance: last deviation ${lastDeviation.toFixed(
        1
      )}, slope ${slope.toFixed(2)}, volatility ${volatility.toFixed(
        1
      )}, forecasted deviations ${futureDevs.map((d) => d.toFixed(1)).join(", ")}. Severity: ${severity}.`;

  return {
    lastDeviation,
    slope,
    volatility,
    severity,
    reasoning,
    deviationTrend: deviations,
    forecastTrend: futureDevs,
    stopped,
  };
}

// ----------------------------------------------------
// Endpoint — sequential + retry + partial results
// ----------------------------------------------------
router.get("/turbines-risk", async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const end = now.toISOString();

    console.log("\nStarting STRICT risk analysis with forecasting…");

    const results = [];

    for (const turbineId of turbineDeviceIds) {
      console.log(`Checking turbine ${turbineId}...`);
      try {
        const data = await fetchWithRetry(() => fetchTurbineData(turbineId, start, end, "hourly"));
        if (!data.length) continue;

        const risk = analyzeRisk(data);
        if (!risk) continue;

        results.push({
          turbineId,
          name: turbineDeviceMap[turbineId] || `Turbine ${turbineId}`,
          ...risk,
        });
      } catch (err) {
        console.error(`Failed turbine ${turbineId}:`, err.message);
      }
    }

    console.log("\nFinal Strict Risk Results:", results);
    res.json({ turbinesAtRisk: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to analyze turbine threat levels" });
  }
});

export default router;
