const express = require("express");
const router = express.Router();
const {
    createWarehouse,
    addItemToWarehouse,
    getAllWarehouses,
    getWarehouseById,
    updateWarehouseItem,
    getWarehouseItems,
    updateWarehouse,
    deleteWarehouse
} = require("../Controller/warehouseController");

// Warehouse Routes
router.post('/create', createWarehouse);
router.get('/get-all', getAllWarehouses); //for table
router.put('/update/:id', updateWarehouse);
router.delete('/delete/:id', deleteWarehouse);

// Warehouse Inventory Routes
router.get('/warehouse-items/:id/items', getWarehouseItems);
router.post('/:warehouseId/add-item', addItemToWarehouse);
router.put('/warehouses/update', updateWarehouseItem);

// for testing
router.get('/get-warehouse/:id', getWarehouseById);

module.exports = router;