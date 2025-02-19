const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const generateRequestCode = async (locationCode) => {
    // Get the latest request with the same location code
    const latestRequest = await prisma.requestPurchase.findFirst({
        where: {
            requestCode: {
                endsWith: locationCode
            }
        },
        orderBy: {
            requestCode: 'desc'
        }
    });

    let nextNumber = 1;
    if (latestRequest) {
        // Extract the numeric part from the latest request code
        const numericPart = latestRequest.requestCode.match(/\d+/)[0];
        nextNumber = parseInt(numericPart) + 1;
    }

    // Format the number to have leading zeros (4 digits)
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `MPR-${formattedNumber}${locationCode}`;
};

const createRequestPurchase = async (req, res) => {
    const {
        locationName,
        remarks,
        itemRequests
    } = req.body;
    const userId = req.user.id;

    try {
        // Validate user
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Get location based on location name
        const location = await prisma.location.findFirst({
            where: { locationName: locationName },
        });

        if (!location) {
            return res.status(404).json({ message: "Location not found" });
        }

        // Generate request code with location code
        const requestCode = await generateRequestCode(location.locationCode);

        // Create the main request purchase with remarks
        const requestPurchase = await prisma.requestPurchase.create({
            data: {
                requestCode,
                userId,
                createdBy: user.username,
                locationId: location.idLocation,
                requestStatus: 'PENDING',
                remarks, 
                itemRequests: {
                    create: itemRequests.map(item => ({
                        itemRequestName: item.itemRequestName,
                        itemRequestAmount: item.itemRequestAmount,
                        itemRequestUseDuration: item.itemRequestUseDuration,
                        userId,
                    })),
                },
            },
            include: {
                itemRequests: true,
                location: true,
            },
        });

        res.status(201).json({
            message: "Request purchase created successfully",
            requestPurchase,
        });
    } catch (error) {
        console.error('Error creating request purchase:', error);
        res.status(500).json({ message: 'Error creating request purchase' });
    }
};

const approveRequestPurchase = async (req, res) => {
    const { requestPurchaseId } = req.body;
    const staffId = req.user.id;

    try {
        // Check if request exists and isn't already approved
        const existingRequest = await prisma.requestPurchase.findFirst({
            where: {
                id: requestPurchaseId,
                requestStatus: 'PENDING'
            }
        });

        if (!existingRequest) {
            return res.status(404).json({
                message: "Request purchase not found or already approved"
            });
        }

        // Only update request purchase status to APPROVED
        const updatedRequest = await prisma.requestPurchase.update({
            where: { id: requestPurchaseId },
            data: {
                requestStatus: 'APPROVED'
            }
        });

        res.status(200).json({
            message: "Request purchase approved successfully",
            updatedRequest
        });

    } catch (error) {
        console.error('Error approving request purchase:', error);
        res.status(500).json({ message: 'Error approving request purchase' });
    }
};

const getUserRequestPurchases = async (req, res) => {
    const userId = req.user.id;
    try {
        const requests = await prisma.requestPurchase.findMany({
            where: { userId },
            include: {
                user: {
                    select: {
                        username: true
                    }
                }
            }
        });

        // Modify the response to include remarks
        const formattedRequests = requests.map(request => ({
            id: request.id,
            requestCode: request.requestCode,
            status: request.requestStatus,
            remarks: request.remarks, // Now includes remarks
            createdAt: request.createdAt,
            requestedBy: request.user.username
        }));

        res.status(200).json(formattedRequests);
    } catch (error) {
        console.error('Error getting user item requests:', error);
        res.status(500).json({ message: 'Error getting item requests' });
    }
};

const getEveryRequestPurchases = async (req, res) => {
    try {
        // Fetch request purchases with related item requests
        const requests = await prisma.requestPurchase.findMany({
            include: {
                user: {
                    select: {
                        username: true
                    }
                },
                itemRequests: { // Only include items related to each specific request purchase
                    select: {
                        id: true,
                        itemRequestName: true,
                        itemRequestAmount: true,
                        itemRequestUseDuration: true,
                        itemRequestStatus: true
                    }
                }
            }
        });

        // Format the response to include user and item requests related to each purchase request
        const formattedRequests = requests.map(request => ({
            id: request.id,
            requestCode: request.requestCode,
            status: request.requestStatus,
            remarks: request.remarks,
            createdAt: request.createdAt,
            requestedBy: request.user.username,
            items: request.itemRequests.map(item => ({
                id: item.id,
                name: item.itemRequestName,
                amount: item.itemRequestAmount,
                useDuration: item.itemRequestUseDuration,
                status: item.itemRequestStatus
            }))
        }));

        res.status(200).json(formattedRequests);
    } catch (error) {
        console.error('Error getting all item requests:', error);
        res.status(500).json({ message: 'Error getting item requests' });
    }
};

const getAllRequestPurchase = async (req, res) => {
    try {
        const requests = await prisma.requestPurchase.findMany({
            include: {
                user: {
                    select: {
                        username: true
                    }
                }
            }
        });

        // Modify the response to include remarks
        const formattedRequests = requests.map(request => ({
            id: request.id,
            requestCode: request.requestCode,
            status: request.requestStatus,
            remarks: request.remarks, // Now includes remarks
            createdAt: request.createdAt,
            requestedBy: request.user.username
        }));

        res.status(200).json(formattedRequests);
    } catch (error) {
        console.error('Error getting all request purchases:', error);
        res.status(500).json({ message: 'Error getting request purchases' });
    }
};

const getRequestPurchaseById = async (req, res) => {
    const { mrId } = req.params;

    try {
        const request = await prisma.requestPurchase.findUnique({
            where: { id: mrId },
            include: {
                user: {
                    select: {
                        username: true,
                        role: true
                    }
                },
                itemRequests: {
                    select: {
                        id: true,
                        itemRequestName: true,
                        itemRequestAmount: true,
                        itemRequestUseDuration: true,
                        itemRequestStatus: true 
                    }
                },
                purchaseOrder: {
                    select: {
                        purchaseOrderNumber: true,
                        status: true,
                        createdAt: true,
                        createdBy: {
                            select: {
                                username: true,
                            }
                        }
                    }
                }
            }
        });

        if (!request) {
            return res.status(404).json({
                message: "Request purchase not found"
            });
        }

        // Format the response with status included
        const formattedResponse = {
            requestDetails: {
                id: request.id,
                requestCode: request.requestCode,
                status: request.requestStatus,
                remarks: request.remarks, // Now includes remarks at the request level
                createdAt: request.createdAt
            },
            requestedBy: {
                username: request.user.username,
                role: request.user.role
            },
            items: request.itemRequests.map(item => ({
                id: item.id,
                name: item.itemRequestName,
                amount: item.itemRequestAmount,
                useDuration: item.itemRequestUseDuration,
                status: item.itemRequestStatus
            })),
        };

        res.status(200).json(formattedResponse);
    } catch (error) {
        console.error('Error getting request purchase:', error);
        res.status(500).json({
            message: 'Error getting request purchase',
            error: error.message
        });
    }
};

const updateItemRequestInPurchase = async (req, res) => {
    const { mrId } = req.params;
    const { itemRequests, remarks } = req.body; // Get the item requests from the body
    const userId = req.user.id;

    if (!mrId) {
        return res.status(400).json({ message: "Invalid purchaseId" });
    }

    try {
        // Find the existing request purchase
        const requestPurchase = await prisma.requestPurchase.findUnique({
            where: { id: mrId },
            include: { itemRequests: true },
        });

        if (!requestPurchase) {
            return res.status(404).json({ message: "Request purchase not found" });
        }

        // Check if the user owns the request purchase
        if (requestPurchase.userId !== userId) {
            return res.status(403).json({ message: "You do not have permission to update this request purchase" });
        }

        // check if the request purchase is approve
        if (requestPurchase.requestStatus === 'APPROVED') {
            return res.status(400).json({ message: "Cannot update the request once it is approved" });
        }

        // Loop through each item request in the update payload
        const updatedItemRequests = [];
        for (const itemRequest of itemRequests) {
            if (itemRequest.id) {
                // Update existing item request
                const updatedItemRequest = await prisma.itemRequest.update({
                    where: { id: itemRequest.id },
                    data: {
                        itemRequestName: itemRequest.itemRequestName,
                        itemRequestAmount: itemRequest.itemRequestAmount,
                        itemRequestUseDuration: itemRequest.itemRequestUseDuration,
                    },
                });
                updatedItemRequests.push(updatedItemRequest);
            } else {
                // Add new item request (itemRequest doesn't have an id)
                const newItemRequest = await prisma.itemRequest.create({
                    data: {
                        itemRequestName: itemRequest.itemRequestName,
                        itemRequestAmount: itemRequest.itemRequestAmount,
                        itemRequestUseDuration: itemRequest.itemRequestUseDuration,
                        requestPurchaseId: mrId, 
                        userId: userId, 
                    },
                });
                updatedItemRequests.push(newItemRequest);
            }
        }

        // Optionally update remarks if provided
        if (remarks) {
            await prisma.requestPurchase.update({
                where: { id: mrId },
                data: { remarks },
            });
        }

        res.status(200).json({
            message: "Request purchase updated successfully",
            updatedItemRequests,
        });
    } catch (error) {
        console.error("Error updating item requests in purchase:", error);
        res.status(500).json({ message: "Error updating item requests in purchase" });
    }
};

const deleteRequest = async (req, res) => {
    const { mrId } = req.params;
    const userId = req.user.id;

    try {
        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!user || user.role !== 'Admin' && user.role !== 'Staff') {
            return res.status(403).json({ message: "Only Admin and Staff can delete requests" });
        }

        // Check if request exists and has no associated purchase order
        const request = await prisma.requestPurchase.findUnique({
            where: { id: mrId },
            include: { purchaseOrder: true }
        });

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if(request.requestStatus === 'APPROVED') {
            return res.status(400).json({
                message: "Cannot delete approved request"
            })
        }

        if (request.purchaseOrder) {
            return res.status(400).json({
                message: "Cannot delete request with associated purchase order"
            });
        }

        // Delete all associated item requests first
        await prisma.itemRequest.deleteMany({
            where: { requestPurchaseId: mrId }
        });

        // Delete the request purchase
        await prisma.requestPurchase.delete({
            where: { id: mrId }
        });

        res.status(200).json({ message: "Request deleted successfully" });

    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({ message: 'Error deleting request' });
    }
};

module.exports = {
    createRequestPurchase,
    approveRequestPurchase,
    getUserRequestPurchases,
    getAllRequestPurchase,
    getEveryRequestPurchases,
    getRequestPurchaseById,
    updateItemRequestInPurchase,
    deleteRequest
};