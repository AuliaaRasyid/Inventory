const express = require("express");
const router = express.Router();
const {
  newUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserWithSignature,
  getUserSignature,
  deleteUser,
} = require("../Controller/authController");
const {
  authenticateUser,
  authorizeRoles,
} = require("../Middleware/authenticate");

router.post("/register-admin", newUser);
router.post("/login", loginUser);
router.get(
"/users", 
    authenticateUser, 
    authorizeRoles("Admin"), 
    getAllUsers
);
router.get(
  "/user/:id",
  authenticateUser,
  authorizeRoles("Admin", "Staff", "User"),
  getUserById
);
router.get(
  "/user-signature/:id",
  authenticateUser,
  authorizeRoles("Admin", "Staff", "User"),
  getUserSignature
);
router.put(
  "/update-user/:id",
  authenticateUser,
  authorizeRoles("Admin", "Staff", "User"),
  updateUserWithSignature
);
router.put(
  "/update-admin/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  updateUser
);
router.delete(
  "/delete/:id",
  authenticateUser,
  authorizeRoles("Admin"),
  deleteUser
);

module.exports = router;
