const express = require("express");
const router = express.Router();
const {
  createRequestPurchase,
  approveRequestPurchase,
  getUserRequestPurchases,
  getAllRequestPurchase,
  getRequestPurchaseById,
  getEveryRequestPurchases,
  updateItemRequestInPurchase,
  deleteRequest,
  completeRequestPurchaseItems,
  rejectRequestPurchase
} = require("../Controller/requestPurchaseContoller");
const {
  authenticateUser,
  authorizeRoles,
} = require("../Middleware/authenticate");

router.post(
  "/create",
  authenticateUser,
  authorizeRoles("User", "Admin"),
  createRequestPurchase
);

//fetch for users table
router.get(
  "/get-user",
  authenticateUser,
  authorizeRoles("User"),
  getUserRequestPurchases
);

//fetch for admins and staffs table
router.get(
  "/get-all",
  authenticateUser,
  authorizeRoles("Staff", "Admin"),
  getAllRequestPurchase
);

//fetch for admins and staffs per MR
router.get(
  "/get-mr/:mrId",
  authenticateUser,
  authorizeRoles("User", "Staff", "Admin"),
  getRequestPurchaseById
);

//[testing] fetch everything for admin and staff [not used]
router.get(
  "/get-all-details",
  authenticateUser,
  authorizeRoles("Staff", "Admin"),
  getEveryRequestPurchases
);

router.put(
  "/update/:mrId",
  authenticateUser,
  authorizeRoles("User", "Staff", "Admin"),
  updateItemRequestInPurchase
);

router.delete(
  "/delete/:mrId",
  authenticateUser,
  authorizeRoles("User", "Staff", "Admin"),
  deleteRequest
);

router.post(
  "/approve",
  authenticateUser,
  authorizeRoles("Staff", "Admin"),
  approveRequestPurchase
);

router.post(
  "/complete",
  authenticateUser,
  authorizeRoles("Staff", "Admin"),
  completeRequestPurchaseItems
);

router.post(
  "/reject",
  authenticateUser,
  authorizeRoles("Staff", "Admin"),
  rejectRequestPurchase
);

module.exports = router;
