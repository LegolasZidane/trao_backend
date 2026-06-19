const express = require("express");
const router = express.Router();

const {
  generateTrip,
  getTrips,
  getTripById,
  deleteTrip,
} = require("../controllers/tripController");

const authMiddleware = require("../middleware/auth");

router.post("/generate", authMiddleware, generateTrip);

router.get("/", authMiddleware, getTrips);

router.get("/:id", authMiddleware, getTripById);

router.delete("/:id", authMiddleware, deleteTrip);

module.exports = router;
