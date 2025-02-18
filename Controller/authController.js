const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const prisma = new PrismaClient();

// Configure multer for signature image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/signatures/'); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'signature-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
});


const newUser = async (req, res) => {
    const { username, password, role } = req.body;

    try {
        // Check if the username already exists
        const existingUser = await prisma.user.findUnique({
            where: {
                username: username, // Prisma expects `username` to be unique now
            },
        });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the new user
        const user = await prisma.user.create({
            data: {
                username: username,
                password: hashedPassword,
                role: role,
            },
        });

        res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: {
                username: username,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                lastLogin: new Date(),
            },
        });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, 
            { expiresIn: '12h' }
        );

        res.status(200).json({ message: "Login successful", token, id: user.id, role: user.role });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.status(200).json(users);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ message: 'Error getting users' });
    }
};

const getUserById = async (req, res) => {
    const { id } = req.params;

    try{
        const user = await prisma.user.findUnique({
            where: {
                id: id,
            },
        });

        res.status(200).json(user);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ message: 'Error getting user' });
    }
};

//update user for admin
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, password, role } = req.body;

    try {
        const user = await prisma.user.update({
            where: {
                id: id,
            },
            data: {
                username: username,
                password: password,
                role: role,
            },
        });

        res.status(200).json({ message: "User updated successfully", user });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    }
};

//update user for user
const updateUserForUser = async (req, res) => {
    const { id } = req.params;
    const { username, password, currentPassword } = req.body;

    try {
        // First verify the user exists and check current password
        const user = await prisma.user.findUnique({
            where: { id }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // If changing password, verify current password first
        if (password && currentPassword) {
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: "Current password is incorrect" });
            }
        }

        // Prepare update data
        const updateData = {};

        // Only update username if provided and different
        if (username && username !== user.username) {
            // Check if new username is already taken
            const existingUser = await prisma.user.findUnique({
                where: { username }
            });
            if (existingUser && existingUser.id !== id) {
                return res.status(400).json({ message: "Username already taken" });
            }
            updateData.username = username;
        }

        // Update password if provided
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Handle signature image if provided
        if (req.file) {
            // Delete old signature file if it exists
            if (user.signature) {
                try {
                    await fs.unlink(user.signature);
                } catch (error) {
                    console.error('Error deleting old signature:', error);
                }
            }
            updateData.signature = req.file.path;
        }

        // Update user in database
        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                username: true,
                lastLogin: true,
                signature: true,
            }
        });

        res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user profile' });
    }
};

// Middleware for handling signature upload
const handleSignatureUpload = upload.single('signature');

// Wrapper function to handle both file upload and user update
const updateUserWithSignature = (req, res) => {
    handleSignatureUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `File upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        updateUserForUser(req, res);
    });
};

// Get user's signature
const getUserSignature = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                signature: true
            }
        });

        if (!user || !user.signature) {
            return res.status(404).json({ message: "Signature not found" });
        }

        res.sendFile(path.resolve(user.signature));
    } catch (error) {
        console.error('Error getting signature:', error);
        res.status(500).json({ message: 'Error retrieving signature' });
    }
};



const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await prisma.user.delete({
            where: {
                id: id,
            },
        });

        res.status(200).json( user && { message: "User deleted successfully" });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};


module.exports = {
    newUser,
    loginUser,
    getAllUsers,
    getUserById,
    updateUser,
    updateUserForUser,
    updateUserWithSignature,
    getUserSignature,
    deleteUser
}