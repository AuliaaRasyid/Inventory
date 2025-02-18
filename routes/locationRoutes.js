const express = require("express");
const router = express.Router();
const {
    createLocation,
    getAllLocations,
    getLocationById,
    updateLocation,
    deleteLocation
} = require("../Controller/locationController");

router.post("/create", createLocation);
router.get("/get-all", getAllLocations);
router.get("/get-location/:id", getLocationById);
router.put("/update/:id", updateLocation);
router.delete("/delete/:id", deleteLocation);

module.exports = router;