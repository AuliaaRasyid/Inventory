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
    deleteSupplierItem
} = require("../Controller/supplierController");

router.post("/create", createSupplier);
router.post("/add-supplier-item/:supplierId", addSupplierItem);

//use these routes
router.get("/get-all", getAllSuppliers); //for getting tables
router.get("/supplier-items/:id", getSupplierItems); //for getting supplier items


router.put("/update/:id", updateSupplier);
router.delete("/delete/:id", deleteSupplier);
router.delete("/delete-supplier-items/:id", deleteSupplierItem);


//for testing too see everything
router.get("/get-all-details", getAllSuppliersDetails);
router.get("/get-all-details/:id", getSupplierByIdDetails);
router.get("/get-supplier/:id", getSupplierById);

module.exports = router;