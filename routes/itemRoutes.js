const express = require("express");
const router = express.Router();
const {
  createItem,
  getAllItems,
  getItemById,
  getAllItemsDetails,
  getItemByIdDetails,
  updateItem,
  deleteItem,
  getIncomingItemHistory,
  getOutgoingItemHistory,
  getItemInventorySummary,
} = require("../Controller/itemController");
const {
  authenticateUser,
  authorizeRoles,
} = require("../Middleware/authenticate");

router.post("/create", authenticateUser, authorizeRoles("Admin"), createItem);

//get just needed
router.get(
  "/get-all",
  authenticateUser,
  authorizeRoles("Admin", "Staff"),
  getAllItems
);

router.get(
  "/get-item-inventory-summary/:itemCode",
  authenticateUser,
  authorizeRoles("Admin", "Staff"),
  getItemInventorySummary
);

router.get(
  "/get-item-history/incoming",
  authenticateUser,
  authorizeRoles("Admin", "Staff"),
  getIncomingItemHistory
);

router.get(
  "/get-item-history/outgoing",
  authenticateUser,
  authorizeRoles("Admin", "Staff"),
  getOutgoingItemHistory
);

router.put(
  "/update/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  updateItem
);
router.delete(
  "/delete/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  deleteItem
);

//[test] get everything (all relation) [not relly used]
router.get(
  "/get-item/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  getItemById
);

router.get(
  "/items-details",
  authenticateUser,
  authorizeRoles("Admin"),
  getAllItemsDetails
);

router.get(
  "/item-details/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  getItemByIdDetails
);

module.exports = router;
