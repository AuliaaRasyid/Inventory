const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createLocation = async (req, res) => {
  const staffId = req.user.id;

  try {
    const { locationName, locationCode, projectName, locationPeriod } =
      req.body;

    const existingProjectName = await prisma.location.findUnique({
      where: {
        locationCode: projectName,
      },
    });

    if (existingProjectName) {
      return res.status(400).json({ message: "Project name already exists" });
    }

    const location = await prisma.location.create({
      data: {
        locationName,
        locationCode,
        projectName,
        locationPeriod,
      },
    });

    res
      .status(201)
      .json({ message: "Location created successfully", location });
  } catch (error) {
    console.error("error creating location");
    res.status(500).json({ message: "Error creating location" });
  }
};

const getAllLocations = async (req, res) => {
  const staffId = req.user.id;

  try {
    const location = await prisma.location.findMany();
    res.status(200).json(location);
  } catch (error) {
    console.error("Error getting locations:", error);
    res.status(500).json({ message: "Error getting locations" });
  }
};

const getLocationById = async (req, res) => {
  const staffId = req.user.id;

  try {
    const { id } = req.params;
    const location = await prisma.location.findUnique({
      where: {
        idLocation: id,
      },
    });
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    res.status(200).json(location);
  } catch (error) {
    console.error("Error getting location:", error);
    res.status(500).json({ message: "Error getting location" });
  }
};

const updateLocation = async (req, res) => {
  const staffId = req.user.id;

  try {
    const { id } = req.params;
    const { locationName, locationCode, projectName, locationPeriod } =
      req.body;
    
      const existingProjectName = await prisma.location.findUnique({
      where: {
        locationCode: projectName,
      },
    });

    if (existingProjectName) {
      return res.status(400).json({ message: "Project name already exists" });
    }

    const updatedLocation = await prisma.location.update({
      where: {
        idLocation: id,
      },
      data: {
        locationName,
        locationCode,
        projectName,
        locationPeriod,
      },
    });
    res
      .status(200)
      .json({ message: "Location updated successfully", updatedLocation });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ message: "Error updating location" });
  }
};

const deleteLocation = async (req, res) => {
  const staffId = req.user.id;

  try {
    const { id } = req.params;
    const location = await prisma.location.delete({
      where: {
        idLocation: id,
      },
    });
    res
      .status(200)
      .json({ message: "Location deleted successfully", location });
  } catch (error) {
    console.error("Error deleting location:", error);
    res.status(500).json({ message: "Error deleting location" });
  }
};

module.exports = {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
};
