import express from "express";
import { locationGroups } from "../locationGroups.js";

const router = express.Router();

router.get("/location-groups", (req, res) => {
  res.json(locationGroups);
});

export default router;
