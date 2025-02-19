const express = require("express");
const router = express.Router();
const {
  createSupplier,
  addSupplierItem,
  getAllSuppliersDetails,
  getSupplierByIdDetails,
  getSupplierItems,
  getSupplierById,
  getAllSuppliers,
  updateSupplier,
  deleteSupplier,
  deleteSupplierItem,
} = require("../Controller/supplierController");
const {
  authenticateUser,
  authorizeRoles,
} = require("../Middleware/authenticate");

router.post(
  "/create",
  authenticateUser,
  authorizeRoles("Admin"),
  createSupplier
);

router.post(
  "/add-supplier-item/:supplierId",
  authenticateUser,
  authorizeRoles("Admin"),
  addSupplierItem
);

//use these routes
router.get(
  "/get-all",
  authenticateUser,
  authorizeRoles("Admin", "Staff"),
  getAllSuppliers
); //for getting tables

router.get(
  "/supplier-items/:id",
  authenticateUser,
  authorizeRoles("Admin", "Staff"),
  getSupplierItems
); //for getting supplier items

router.put(
  "/update/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  updateSupplier
);

router.delete(
  "/delete/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  deleteSupplier
);

router.delete(
  "/delete-supplier-items/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  deleteSupplierItem
);

//for testing too see everything
router.get(
  "/get-all-details",
  authenticateUser,
  authorizeRoles("Admin"),
  getAllSuppliersDetails
);

router.get(
  "/get-all-details/:idF",
  authenticateUser,
  authorizeRoles("Admin"),
  getSupplierByIdDetails
);

router.get(
  "/get-supplier/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  getSupplierById
);

module.exports = router;
