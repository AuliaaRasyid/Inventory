const express = require("express");
const router = express.Router();
const {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
} = require("../Controller/locationController");

const {
  authenticateUser,
  authorizeRoles,
} = require("../Middleware/authenticate");

router.post(
  "/create",
  authenticateUser,
  authorizeRoles("Admin"),
  createLocation
);
router.get(
  "/get-all",
  authenticateUser,
  authorizeRoles("Admin", "Staff"),
  getAllLocations
);
router.get(
  "/get-location/:id",
  authenticateUser,
  authorizeRoles("Admin", "Staff"),
  getLocationById
);
router.put(
  "/update/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  updateLocation
);
router.delete(
  "/delete/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  deleteLocation
);

module.exports = router;
