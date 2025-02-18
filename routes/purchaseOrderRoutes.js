const express = require("express");
const router = express.Router();
const {
    createPurchaseOrderWithItems,
    approvePurchaseOrder,
    getSupplierItems,
    getPurchaseOrderDetailById,
    getAllPurchaseOrders,
    getAllPurchaseOrdersWithDetails,
    updatePurchaseOrder,
    deletePurchaseOrder,
} = require("../Controller/purchaseOrderController");
const { authenticateUser, authorizeRoles } = require("../Middleware/authenticate");

router.post(
    "/create",
    authenticateUser,
    authorizeRoles("Staff", "Admin"),
    createPurchaseOrderWithItems
);

router.post(
    "/approve/:purchaseOrderId",
    authenticateUser,
    authorizeRoles("Admin", "Staff"),
    approvePurchaseOrder
);

//fetch for supplier and the items of suplier
router.get(
    "/item-suppliers",
    authenticateUser,
    authorizeRoles("Staff", "Admin"),
    getSupplierItems
);

router.get(
    "/get-all",
    authenticateUser,
    authorizeRoles("Admin", "Staff"),
    getAllPurchaseOrders
);

router.get(
    "/get-po/:id",
    authenticateUser,
    authorizeRoles("Staff", "Admin"),
    getPurchaseOrderDetailById
);

router.get(
    "/all-details",
    authenticateUser,
    authorizeRoles("Admin", "Staff"), 
    getAllPurchaseOrdersWithDetails
);

router.put(
    "/update/:id",
    authenticateUser,
    authorizeRoles("Admin", "Staff"), 
    updatePurchaseOrder
);

router.delete(
    "/delete/:id",
    authenticateUser,
    authorizeRoles("Admin", "Staff"), 
    deletePurchaseOrder
);

module.exports = router;