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
  changePackingStatus,
} = require("../controllers/tripController");

const authMiddleware = require("../middleware/auth");

router.post("/generate", authMiddleware, generateTrip);

router.get("/", authMiddleware, getTrips);

router.get("/:id", authMiddleware, getTripById);

// router.delete("/:id", authMiddleware, (req, res) => console.log("DELETE HIT"))

router.delete("/:id", authMiddleware, deleteTrip);

router.post("/:tripId/days/:dayNumber/activities", authMiddleware, addActivity);

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

router.patch("/:tripId/packing/:itemId", authMiddleware, changePackingStatus);

module.exports = router;
