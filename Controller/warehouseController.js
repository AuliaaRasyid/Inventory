const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createWarehouse = async (req, res) => {
    try {
        const {
            warehouseName,
            warehouseAddress,
            warehouseContact
        } = req.body;

        const warehouse = await prisma.warehouse.create({
            data: {
                warehouseName,
                warehouseAddress,
                warehouseContact
            }
        });

        res.status(201).json({
            message: "Warehouse created successfully",
            warehouse
        });
    } catch (error) {
        console.error('Error creating warehouse:', error);

        // Handle unique constraint violation
        if (error.code === 'P2002') {
            return res.status(400).json({
                message: 'A warehouse with this name already exists'
            });
        }

        res.status(500).json({ message: 'Error creating warehouse' });
    }
};

const addItemToWarehouse = async (req, res) => {
    try {
        const { warehouseId } = req.params;
        const {
            itemName,      // Item name to search by
            itemCode,      // Item code to search by
            stockQuantity,
            itemShelfNumber,
            itemShelfBlock,
        } = req.body;

        // Check if the warehouse exists
        const warehouseExists = await prisma.warehouse.findUnique({
            where: { idWarehouse: warehouseId }
        });
        if (!warehouseExists) {
            return res.status(404).json({ message: "Warehouse not found" });
        }

        // Find the item by name or code
        let item;
        if (itemName) {
            item = await prisma.item.findFirst({
                where: { itemName }
            });
        } else if (itemCode) {
            item = await prisma.item.findFirst({
                where: { itemCode }
            });
        }

        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        // Check for duplicate item in the warehouse
        const duplicateItem = await prisma.warehouseInventory.findFirst({
            where: {
                warehouseId,
                itemId: item.idItem // Use item.idItem now
            }
        });
        if (duplicateItem) {
            return res.status(400).json({ message: "Item already exists in the warehouse" });
        }

        // Add the item to the warehouse inventory
        const warehouseInventory = await prisma.warehouseInventory.create({
            data: {
                warehouseId,
                itemId: item.idItem, // Use item.idItem now
                stockQuantity,
                itemShelfNumber,
                itemShelfBlock,
            },
            include: {
                item: true,
                warehouse: true
            }
        });

        res.status(201).json({
            message: "Item added to warehouse inventory successfully",
            warehouseInventory
        });
    } catch (error) {
        console.error('Error adding item to warehouse inventory:', error);
        res.status(500).json({ message: 'Error adding item to warehouse inventory' });
    }
};

const getAllWarehouses = async (req, res) => {
    try {
        const warehouses = await prisma.warehouse.findMany({
            select: {
                idWarehouse: true,
                warehouseName: true,
                warehouseAddress: true,
                warehouseContact: true
            }
        });
        res.status(200).json(warehouses);
    } catch (error) {
        console.error('Error getting warehouses:', error);
        res.status(500).json({ message: 'Error getting warehouses' });
    }
};

const getWarehouseById = async (req, res) => {
    try {
        const { id } = req.params;
        const warehouse = await prisma.warehouse.findUnique({
            where: { idWarehouse: id },
            select: {
                idWarehouse: true,
                warehouseName: true,
                warehouseAddress: true,
                warehouseContact: true
            }
        });

        if (!warehouse) {
            return res.status(404).json({ message: "Warehouse not found" });
        }

        res.status(200).json(warehouse);
    } catch (error) {
        console.error('Error getting warehouse:', error);
        res.status(500).json({ message: 'Error getting warehouse' });
    }
};

const getWarehouseItems = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify warehouse exists
        const warehouseExists = await prisma.warehouse.findUnique({
            where: { idWarehouse: id }
        });

        if (!warehouseExists) {
            return res.status(404).json({ message: "Warehouse not found" });
        }

        const warehouseInventory = await prisma.warehouseInventory.findMany({
            where: { warehouseId: id },
            include: {
                item: true,
                warehouse: true
            }
        });

        res.status(200).json(warehouseInventory);
    } catch (error) {
        console.error('Error getting warehouse items:', error);
        res.status(500).json({ message: 'Error getting warehouse items' });
    }
};

const updateWarehouse = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            warehouseName,
            warehouseAddress,
            warehouseContact
        } = req.body;

        const updatedWarehouse = await prisma.warehouse.update({
            where: { idWarehouse: id },
            data: {
                warehouseName,
                warehouseAddress,
                warehouseContact
            }
        });

        res.status(200).json({
            message: "Warehouse updated successfully",
            warehouse: updatedWarehouse
        });
    } catch (error) {
        console.error('Error updating warehouse:', error);

        // Handle unique constraint violation
        if (error.code === 'P2002') {
            return res.status(400).json({
                message: 'A warehouse with this name already exists'
            });
        }

        res.status(500).json({ message: 'Error updating warehouse' });
    }
};

const updateWarehouseItem = async (req, res) => {
    try {
        const {
            warehouseId,
            itemId,
            stockQuantity,
            itemShelfNumber,
            itemShelfBlock,
        } = req.body;

        const warehouseInventory = await prisma.warehouseInventory.update({
            where: {
                warehouseId_itemId: {
                    warehouseId,
                    itemId,
                },
            },
            data: {
                stockQuantity,
                itemShelfNumber,
                itemShelfBlock,
            },
            include: {
                item: true,
                warehouse: true
            }
        });
        res.status(200).json({
            message: "Item updated successfully",
            warehouseInventory
        });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ message: 'Error updating item' });
    }
}

const deleteWarehouse = async (req, res) => {
    try {
        const { id } = req.params;

        // Step 1: Delete all entries in warehouseInventory associated with this warehouse
        await prisma.warehouseInventory.deleteMany({
            where: { warehouseId: id }
        });

        // Step 2: Delete the warehouse itself
        const deletedWarehouse = await prisma.warehouse.delete({
            where: { idWarehouse: id }
        });

        res.status(200).json({
            message: "Warehouse and associated inventory deleted successfully",
            warehouse: deletedWarehouse
        });
    } catch (error) {
        console.error('Error deleting warehouse:', error);
        res.status(500).json({ message: 'Error deleting warehouse' });
    }
};

module.exports = {
    createWarehouse,
    addItemToWarehouse,
    getAllWarehouses,
    getWarehouseById,
    updateWarehouseItem,
    getWarehouseItems,
    updateWarehouse,
    deleteWarehouse
};