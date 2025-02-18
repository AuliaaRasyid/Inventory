const express = require("express");
const router = express.Router();
const {newUser, loginUser, getAllUsers, getUserById, updateUser,
    updateUserWithSignature, getUserSignature, deleteUser} = require("../Controller/authController");

router.post("/register", newUser);
router.post("/login", loginUser);
router.get("/users", getAllUsers);
router.get("/user/:id", getUserById);
router.get("/user-signature/:id", getUserSignature);
router.put("/update-user/:id", updateUserWithSignature);
router.put("/update-admin/:id", updateUser);
router.delete("/delete/:id", deleteUser);

module.exports = router