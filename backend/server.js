import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { turbineDeviceIds } from "./deviceIds.js";
import { turbineCoordinates } from "./turbineCoordinates.js";
import deviceRoutes from "./routes/deviceRoutes.js";
import turbineDataRoutes from "./routes/turbineDataRoutes.js";
import turbineRiskRouter from "./routes/turbineRisk.js";
import locationRouter from "./routes/locationGroups.js";
import allRoute from "./routes/dashboardRoutes.js";


dotenv.config();
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Existing turbines endpoint (keep as is)
app.get("/api/greenbyte/turbines", async (req, res) => {
  try {
    const response = await fetch(
      `${process.env.BASE_URL}/realtimedata?deviceIds=${turbineDeviceIds.join(",")}&dataSignalIds=5&aggregate=device&aggregateLevel=0&calculation=sum`,
      {
        headers: {
          Accept: "application/json",
          "X-Api-Key": process.env.API_KEY,
        },
      }
    );
    const data = await response.json();

    const mappedData = data.map((item) => ({
      ...item,
      latitude: turbineCoordinates[item.aggregateId]?.latitude || 12.12,
      longitude: turbineCoordinates[item.aggregateId]?.longitude || -68.9,
    }));

    res.json(mappedData);
  } catch (error) {
    console.error("Error fetching Greenbyte data:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// Device map route
app.use("/api/greenbyte/turbines/devices", deviceRoutes);

// ✅ New route: per-turbine details (realtime + forecast)
app.use("/api/greenbyte/turbines", turbineDataRoutes);

app.use("/api", turbineRiskRouter);

app.use("/api/greenbyte/turbines/all", allRoute);

app.use("/api", locationRouter);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));