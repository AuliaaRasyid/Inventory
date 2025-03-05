const express = require("express");
const router = express.Router();
const {
  createSupplier,
  getAllSuppliersDetails,
  getSupplierByIdDetails,
  getSupplierById,
  getAllSuppliers,
  updateSupplier,
  deleteSupplier,
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

//use these routes
router.get(
  "/get-all",
  authenticateUser,
  authorizeRoles("Admin", "Staff"),
  getAllSuppliers
); //for getting tables

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

//for testing too see everything
router.get(
  "/get-all-details",
  authenticateUser,
  authorizeRoles("Admin"),
  getAllSuppliersDetails
);

router.get(
  "/get-all-details/:id",
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
