const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createItem = async (req, res) => {
  const { itemName, itemCode } = req.body;

  try {
    const item = await prisma.item.create({
      data: {
        itemName,
        itemCode,
      },
    });
    res.status(201).json({ message: "Item created successfully", item });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ message: "Error creating item" });
  }
};

const getAllItemsDetails = async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      include: {
        supplierItems: {
          include: { supplier: true },
        },
        warehouseInventories: {
          include: { warehouse: true },
        },
      },
    });
    res.status(200).json(items);
  } catch (error) {
    console.error("Error getting items:", error);
    res.status(500).json({ message: "Error getting items" });
  }
};

const getItemByIdDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({
      where: {
        idItem: id,
      },
      include: {
        supplierItems: {
          include: { supplier: true },
        },
        warehouseInventories: {
          include: { warehouse: true },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json(item);
  } catch (error) {
    console.error("Error getting item:", error);
    res.status(500).json({ message: "Error getting item" });
  }
};

const getAllItems = async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      select: {
        idItem: true,
        itemName: true,
        itemCode: true,
      },
    });
    res.status(200).json(items);
  } catch (error) {
    console.error("Error getting items:", error);
    res.status(500).json({ message: "Error getting items" });
  }
};

const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({
      where: {
        idItem: id,
      },
      select: {
        idItem: true,
        itemName: true,
        itemCode: true,
      },
    });
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.status(200).json(item);
  } catch (error) {
    console.error("Error getting item:", error);
    res.status(500).json({ message: "Error getting item" });
  }
};

const updateItem = async (req, res) => {
  const { id } = req.params;
  const {
    itemName,
    itemCode,
    suppliers,
    warehouseInventories,
  } = req.body;

  try {
    const updatedItem = await prisma.$transaction(async (prisma) => {
      // Update the item
      const item = await prisma.item.update({
        where: { idItem: id },
        data: {
          itemName,
          itemCode,
        },
      });

      // If new suppliers are provided, upsert or create new associations
      if (suppliers && suppliers.length > 0) {
        for (const supplier of suppliers) {
          await prisma.supplierItem.upsert({
            where: {
              supplierId_itemId: {
                supplierId: supplier.supplierId,
                itemId: id,
              },
            },
            update: {
              supplierItemPrice: supplier.supplierItemPrice,
            },
            create: {
              supplierId: supplier.supplierId,
              supplierItemPrice: supplier.supplierItemPrice,
            },
          });
        }
      }

      // If warehouse inventories are provided, upsert or create new associations
      if (warehouseInventories && warehouseInventories.length > 0) {
        for (const inventory of warehouseInventories) {
          await prisma.warehouseInventory.upsert({
            where: {
              warehouseId_itemId: {
                warehouseId: inventory.warehouseId,
                itemId: id,
              },
            },
            update: {
              stockQuantity: inventory.stockQuantity,
              itemShelfNumber: inventory.itemShelfNumber,
              itemShelfBlock: inventory.itemShelfBlock,
            },
            create: {
              warehouseId: inventory.warehouseId,
              stockQuantity: inventory.stockQuantity,
              itemShelfNumber: inventory.itemShelfNumber,
              itemShelfBlock: inventory.itemShelfBlock,
            },
          });
        }
      }

      // Fetch updated item with all relations
      return await prisma.item.findUnique({
        where: { idItem: id },
        include: {
          supplierItems: {
            include: { supplier: true },
          },
          warehouseInventories: {
            include: { warehouse: true },
          },
        },
      });
    });

    res.status(200).json({
      message: "Item updated successfully",
      item: updatedItem,
    });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ message: "Error updating item" });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Start a transaction to ensure all deletions are atomic
    const deletedItem = await prisma.$transaction(async (prisma) => {
      // First, delete all related warehouse inventory records
      await prisma.warehouseInventory.deleteMany({
        where: { itemId: id },
      });

      // Delete all related supplierItem records
      await prisma.supplierItem.deleteMany({
        where: { itemId: id },
      });

      // Then delete the item
      return await prisma.item.delete({
        where: { idItem: id },
      });
    });

    res.status(200).json({
      message: "Item deleted successfully",
      deletedItem,
    });
  } catch (error) {
    console.error("Error deleting item:", error);

    // Handle case where item doesn't exist
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(500).json({ message: "Error deleting item" });
  }
};

// Item History
const getIncomingItemHistory = async (req, res) => {
  try {
    const {
      itemCode,
      itemName,
      warehouseName,
      startDate,
      endDate,
      poNumber,
      igrNumber,
    } = req.query;

    // Build the where condition
    let whereCondition = {
      type: "INCOMING", // Force type to be INCOMING
    };

    // Item filters
    if (itemCode || itemName) {
      whereCondition.item = {
        ...(itemCode && { itemCode }),
        ...(itemName && {
          itemName: { contains: itemName, mode: "insensitive" },
        }),
      };
    }

    // Warehouse filter
    if (warehouseName) {
      whereCondition.warehouse = {
        warehouseName: { contains: warehouseName, mode: "insensitive" },
      };
    }

    // Date range filter
    if (startDate || endDate) {
      whereCondition.timestamp = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    // Document number filters
    if (poNumber) whereCondition.poNumber = { contains: poNumber };
    if (igrNumber) whereCondition.igrNumber = { contains: igrNumber };

    const incomingHistory = await prisma.itemHistory.findMany({
      where: whereCondition,
      include: {
        item: true,
        warehouse: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // Format the response specific to incoming history
    const formattedHistory = incomingHistory.map((record) => ({
      itemName: record.item.itemName,
      itemCode: record.item.itemCode,
      poNumber: record.poNumber,
      igrNumber: record.igrNumber,
      warehouseName: record.warehouse.warehouseName,
      quantity: record.quantity,
      timestamp: record.timestamp,
      remarks: record.remarks,
    }));

    res.status(200).json({
      message: "Incoming item history retrieved successfully",
      data: formattedHistory,
    });
  } catch (error) {
    console.error("Error retrieving incoming item history:", error);
    res.status(500).json({
      message: "Error retrieving incoming item history",
      error: error.message,
    });
  }
};

const getOutgoingItemHistory = async (req, res) => {
  try {
    const {
      itemCode,
      itemName,
      warehouseName,
      startDate,
      endDate,
      mprNumber,
      doNumber,
      locationName,
    } = req.query;

    // Build the where condition
    let whereCondition = {
      type: "OUTGOING", // Force type to be OUTGOING
    };

    // Item filters
    if (itemCode || itemName) {
      whereCondition.item = {
        ...(itemCode && { itemCode }),
        ...(itemName && {
          itemName: { contains: itemName, mode: "insensitive" },
        }),
      };
    }

    // Warehouse filter
    if (warehouseName) {
      whereCondition.warehouse = {
        warehouseName: { contains: warehouseName, mode: "insensitive" },
      };
    }

    // Location filter
    if (locationName) {
      whereCondition.location = {
        locationName: { contains: locationName, mode: "insensitive" },
      };
    }

    // Date range filter
    if (startDate || endDate) {
      whereCondition.timestamp = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    // Document number filters
    if (mprNumber) whereCondition.mprNumber = { contains: mprNumber };
    if (doNumber) whereCondition.doNumber = { contains: doNumber };

    const outgoingHistory = await prisma.itemHistory.findMany({
      where: whereCondition,
      include: {
        item: true,
        warehouse: true,
        location: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // Format the response specific to outgoing history
    const formattedHistory = outgoingHistory.map((record) => ({
      itemName: record.item.itemName,
      itemCode: record.item.itemCode,
      mprNumber: record.mprNumber,
      doNumber: record.doNumber,
      warehouseName: record.warehouse.warehouseName,
      siteLocation: record.location?.locationName,
      quantity: record.quantity,
      timestamp: record.timestamp,
      remarks: record.remarks,
    }));

    res.status(200).json({
      message: "Outgoing item history retrieved successfully",
      data: formattedHistory,
    });
  } catch (error) {
    console.error("Error retrieving outgoing item history:", error);
    res.status(500).json({
      message: "Error retrieving outgoing item history",
      error: error.message,
    });
  }
};

const getItemInventorySummary = async (req, res) => {
  try {
    const { itemCode } = req.params;

    if (!itemCode) {
      return res.status(400).json({
        message: "Item code is required",
      });
    }

    // Find the item
    const item = await prisma.item.findFirst({
      where: { itemCode },
      include: {
        warehouseInventories: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        message: `Item with code ${itemCode} not found`,
      });
    }

    // Get incoming history
    const incomingHistory = await prisma.itemHistory.findMany({
      where: {
        itemId: item.idItem,
        type: "INCOMING",
      },
      include: {
        warehouse: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // Get outgoing history
    const outgoingHistory = await prisma.itemHistory.findMany({
      where: {
        itemId: item.idItem,
        type: "OUTGOING",
      },
      include: {
        warehouse: true,
        location: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    res.status(200).json({
      message: "Item inventory summary retrieved successfully",
      data: {
        item: {
          id: item.idItem,
          name: item.itemName,
          code: item.itemCode,
        },
        currentInventory: item.warehouseInventories.map((inv) => ({
          warehouseName: inv.warehouse.warehouseName,
          currentStock: inv.stockQuantity,
          shelfNumber: inv.itemShelfNumber,
          shelfBlock: inv.itemShelfBlock,
        })),
        incomingHistory: incomingHistory.map((record) => ({
          id: record.id,
          warehouseName: record.warehouse.warehouseName,
          quantity: record.quantity,
          poNumber: record.poNumber,
          igrNumber: record.igrNumber,
          timestamp: record.timestamp,
          remarks: record.remarks,
        })),
        outgoingHistory: outgoingHistory.map((record) => ({
          id: record.id,
          warehouseName: record.warehouse.warehouseName,
          quantity: record.quantity,
          mprNumber: record.mprNumber,
          doNumber: record.doNumber,
          locationName: record.location?.locationName,
          timestamp: record.timestamp,
          remarks: record.remarks,
        })),
      },
    });
  } catch (error) {
    console.error("Error retrieving item inventory summary:", error);
    res.status(500).json({
      message: "Error retrieving item inventory summary",
      error: error.message,
    });
  }
};

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  getAllItemsDetails,
  getItemByIdDetails,
  updateItem,
  deleteItem,
  getIncomingItemHistory,
  getOutgoingItemHistory,
  getItemInventorySummary,
};
