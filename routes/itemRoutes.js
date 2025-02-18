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
//   getItemHistory,
  getItemInventorySummary,
} = require("../Controller/itemController");
const {
  authenticateUser,
  authorizeRoles,
} = require("../Middleware/authenticate");

router.post("/create", createItem);

//get just needed
router.get("/get-all", getAllItems);

router.get("/get-item-inventory-summary/:itemCode",
       authenticateUser,
       authorizeRoles("Admin", "Staff"),
       getItemInventorySummary
);

router.get("/get-item-history/incoming",
       authenticateUser,
       authorizeRoles("Admin", "Staff"),
       getIncomingItemHistory
);

router.get("/get-item-history/outgoing",
       authenticateUser,
       authorizeRoles("Admin", "Staff"),
       getOutgoingItemHistory
);

router.put("/update/:id", updateItem);
router.delete("/delete/:id", deleteItem);

//[test] get everything (all relation) [not relly used]
router.get("/get-item/:id", getItemById);
router.get("/items-details", getAllItemsDetails);
router.get("/item-details/:id", getItemByIdDetails);

module.exports = router;
