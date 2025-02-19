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
  deleteWarehouseItem,
  deleteWarehouse,
} = require("../Controller/warehouseController");

const {
  authenticateUser,
  authorizeRoles,
} = require("../Middleware/authenticate");

// Warehouse Routes
router.post(
  "/create",
  authenticateUser,
  authorizeRoles("Admin"),
  createWarehouse
);

router.get(
  "/get-all",
  authenticateUser,
  authorizeRoles("Admin", "Staff"),
  getAllWarehouses
); //for table

router.put(
  "/update/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  updateWarehouse
);

router.delete(
  "/delete/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  deleteWarehouse
);

// Warehouse Inventory Routes
router.get(
  "/warehouse-items/:id",
  authenticateUser,
  authorizeRoles("Admin", "Staff"),
  getWarehouseItems
);

router.post(
  "/add-item/:warehouseId",
  authenticateUser,
  authorizeRoles("Admin"),
  addItemToWarehouse
);

router.put(
  "/warehouse-item/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  updateWarehouseItem
);

router.delete(
  "/warehouse-item/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  deleteWarehouseItem
)
// for testing
router.get(
  "/get-warehouse/:id",
  authenticateUser,
  authorizeRoles("Admin", "Staff"),
  getWarehouseById
);

module.exports = router;
