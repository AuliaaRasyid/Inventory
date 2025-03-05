const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createWarehouse = async (req, res) => {
    const staffId = req.user.id;

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
    const staffId = req.user.id;

    try {
        const { warehouseId } = req.params;
        const {
            itemName,      
            itemCode,    
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
                itemId: item.idItem
            }
        });
        if (duplicateItem) {
            return res.status(400).json({ message: "Item already exists in the warehouse" });
        }

        // Add the item to the warehouse inventory
        const warehouseInventory = await prisma.warehouseInventory.create({
            data: {
                warehouseId,
                itemId: item.idItem,
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
            message: "Item added to warehouse inventory successfully",
            warehouseInventory
        });
    } catch (error) {
        console.error('Error adding item to warehouse inventory:', error);
        res.status(500).json({ message: 'Error adding item to warehouse inventory' });
    }
};

const getAllWarehouses = async (req, res) => {
    const staffId = req.user.id;

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
    const staffId = req.user.id;

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
    const staffId = req.user.id;

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

        res.status(200).json({
            message: "Warehouse items retrieved successfully",
            warehouseName : warehouseExists.warehouseName, 
            warehouseInventory
        });
    } catch (error) {
        console.error('Error getting warehouse items:', error);
        res.status(500).json({ message: 'Error getting warehouse items' });
    }
};

const updateWarehouse = async (req, res) => {
    const staffId = req.user.id;

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
            message: "Warehouse updated successfully", updatedWarehouse
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

// Update the updateWarehouseItem function as well to use inventory id
const updateWarehouseItem = async (req, res) => {
    const staffId = req.user.id;

    try {
        const { id } = req.params; 
        const {
            stockQuantity,
            itemShelfNumber,
            itemShelfBlock,
        } = req.body;

        const warehouseInventory = await prisma.warehouseInventory.update({
            where: { id },
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
        
        if (error.code === 'P2025') {
            return res.status(404).json({ 
                message: 'Warehouse inventory item not found' 
            });
        }
        
        res.status(500).json({ message: 'Error updating item' });
    }
};


const deleteWarehouseItem = async (req, res) => {
    const staffId = req.user.id;

    try {
        const { id } = req.params;  // Using the warehouse inventory id

        // Check if the warehouse inventory entry exists
        const inventoryItem = await prisma.warehouseInventory.findUnique({
            where: { id }
        });

        if (!inventoryItem) {
            return res.status(404).json({ 
                message: "Warehouse inventory item not found" 
            });
        }

        // Delete the warehouse inventory entry
        const deletedItem = await prisma.warehouseInventory.delete({
            where: { id },
            include: {
                item: true,
                warehouse: true
            }
        });

        res.status(200).json({
            message: "Item removed from warehouse inventory successfully",
            deletedItem
        });
    } catch (error) {
        console.error('Error deleting item from warehouse inventory:', error);
        res.status(500).json({ 
            message: 'Error deleting item from warehouse inventory',
            error: error.message 
        });
    }
};
const deleteWarehouse = async (req, res) => {
    const staffId = req.user.id;

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
    deleteWarehouseItem,
    deleteWarehouse
};