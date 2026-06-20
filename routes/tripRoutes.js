const express = require("express");
const router = express.Router();

const {
  generateTrip,
  getTrips,
  getTripById,
  deleteTrip,
  addActivity,
  removeActivity,
  regenerateDay,
} = require("../controllers/tripController");

const authMiddleware = require("../middleware/auth");

router.post("/generate", authMiddleware, generateTrip);

router.get("/", authMiddleware, getTrips);

router.get("/:id", authMiddleware, getTripById);

router.delete("/:id", authMiddleware, deleteTrip);

router.post("/:tripId/days/:dayIndex/activities", authMiddleware, addActivity);

router.delete(
  "/:tripId/days/:dayNumber/activities/:activityId",
  authMiddleware,
  removeActivity,
);

router.patch(
  "/:tripId/days/:dayNumber/regenerate",
  authMiddleware,
  regenerateDay,
);

module.exports = router;
