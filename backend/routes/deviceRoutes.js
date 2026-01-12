import express from "express";
import { turbineDeviceMap } from "../deviceIds.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(turbineDeviceMap);
});

export default router;
