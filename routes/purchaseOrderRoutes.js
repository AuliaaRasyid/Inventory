const express = require("express");
const router = express.Router();
const {
    createPurchaseOrderWithItems,
    approvePurchaseOrder,
    getPurchaseOrderDetailById,
    getAllPurchaseOrders,
    getAllPurchaseOrdersWithDetails,
    updatePurchaseOrder,
    deletePurchaseOrder,
    rejectPurchaseOrder
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

router.post(
    "/reject",
    authenticateUser,
    authorizeRoles("Admin", "Staff"), 
    rejectPurchaseOrder
);

module.exports = router;