const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


// const approveIGR = async (req, res) => {
//     const { igrId } = req.params;
//     const { items, remark } = req.body;
//     const approverId = req.user.id;

//     if (!igrId) {
//         return res.status(400).json({
//             message: "IGR ID is required"
//         });
//     }

//     try {
//         const existingIGR = await prisma.incomingGoodReceipt.findUnique({
//             where: { id: igrId },
//             include: {
//                 items: true,
//                 purchaseOrder: {
//                     include: {
//                         purchaseOrderItems: true
//                     }
//                 }
//             }
//         });

//         if (!existingIGR) {
//             return res.status(404).json({ message: "IGR not found" });
//         }

//         // Check if the IGR is already approved
//         if (existingIGR.status === 'APPROVED') {
//             return res.status(400).json({
//                 message: "This IGR has already been approved and cannot be approved again.",
//                 igrNumber: existingIGR.igrNumber
//             });
//         }

//         // Validate the received items
//         const validatedItems = await Promise.all(items.map(async (item) => {
//             const igrItem = await prisma.iGRItem.findUnique({
//                 where: {
//                     id: item.igrItemId,
//                     igrId: existingIGR.id
//                 }
//             });

//             if (!igrItem) {
//                 throw new Error(`IGR Item with ID ${item.igrItemId} not found in this IGR`);
//             }

//             const warehouse = await prisma.warehouse.findUnique({
//                 where: { warehouseName: item.warehouseName }
//             });

//             if (!warehouse) {
//                 throw new Error(`Warehouse ${item.warehouseName} not found`);
//             }

//             const systemItem = await prisma.item.findFirst({
//                 where: { itemCode: item.itemCode }
//             });

//             // Check if the item exists in the warehouse inventory
//             const existingInventory = await prisma.warehouseInventory.findFirst({
//                 where: {
//                     warehouseId: warehouse.idWarehouse,
//                     itemId: systemItem.idItem
//                 }
//             });

//             if (!existingInventory && item.isReceived) {
//                 throw new Error(`Item ${item.itemCode} is not registered in warehouse ${item.warehouseName}`);
//             }

//             return {
//                 ...item,
//                 warehouseId: warehouse.idWarehouse,
//                 originalQuantity: igrItem.quantity,
//                 systemItemId: systemItem.idItem
//             };
//         }));

//         // Check if all items are being marked as received
//         const allItemsReceived = existingIGR.items.every(item => 
//             validatedItems.some(receivedItem => 
//                 receivedItem.igrItemId === item.id && receivedItem.isReceived === true
//             )
//         );

//         // Update IGR and warehouse inventory in a transaction
//         const result = await prisma.$transaction(async (prisma) => {
//             // Update IGR items
//             const updatedItems = await Promise.all(validatedItems.map(async (item) => {
//                 return await prisma.iGRItem.update({
//                     where: { id: item.igrItemId },
//                     data: { 
//                         isReceived: item.isReceived,
//                         warehouseId: item.warehouseId ? item.warehouseId : null
//                     }
//                 });
//             }));

//             // Only update inventory if ALL items are received
//             if (allItemsReceived) {
//                 for (const item of validatedItems) {
//                     if (item.isReceived) {
//                         const existingInventory = await prisma.warehouseInventory.findFirst({
//                             where: {
//                                 warehouseId: item.warehouseId,
//                                 itemId: item.systemItemId
//                             }
//                         });

//                         if (existingInventory) {
//                             // Update existing inventory
//                             await prisma.warehouseInventory.update({
//                                 where: { 
//                                     warehouseId_itemId: {
//                                         warehouseId: item.warehouseId,
//                                         itemId: item.systemItemId
//                                     }
//                                 },
//                                 data: {
//                                     stockQuantity: {
//                                         increment: item.originalQuantity
//                                     }
//                                 }
//                             });
//                         }
//                     }
//                 }
//             }

//             // Update IGR status
//             const updatedIGR = await prisma.incomingGoodReceipt.update({
//                 where: { id: igrId },
//                 data: {
//                     status: allItemsReceived ? 'APPROVED' : 'PENDING',
//                     remarks: remark || existingIGR.remarks,
//                     approvedBy: allItemsReceived ? approverId : null,
//                     approvedAt: allItemsReceived ? new Date() : null
//                 },
//                 include: {
//                     purchaseOrder: true,
//                     items: true
//                 }
//             });

//             return { updatedIGR, updatedItems };
//         });

//         // If not all items are received, return a specific message
//         if (!allItemsReceived) {
//             return res.status(400).json({
//                 message: "Cannot fully approve IGR. Not all items are marked as received.",
//                 data: {
//                     igrNumber: result.updatedIGR.igrNumber,
//                     purchaseOrderNumber: result.updatedIGR.purchaseOrder.purchaseOrderNumber,
//                     igrStatus: result.updatedIGR.status,
//                     items: result.updatedIGR.items.map(item => ({
//                         itemName: item.itemName,
//                         itemCode: item.itemCode,
//                         quantity: item.quantity,
//                         isReceived: item.isReceived
//                     }))
//                 }
//             });
//         }

//         res.status(200).json({
//             message: "IGR fully received and approved",
//             data: {
//                 igrNumber: result.updatedIGR.igrNumber,
//                 purchaseOrderNumber: result.updatedIGR.purchaseOrder.purchaseOrderNumber,
//                 igrStatus: result.updatedIGR.status,
//                 remark: result.updatedIGR.remarks,
//                 approvedBy: req.user.username,
//                 approvedAt: result.updatedIGR.approvedAt,
//                 items: result.updatedIGR.items.map(item => ({
//                     itemName: item.itemName,
//                     itemCode: item.itemCode,
//                     quantity: item.quantity,
//                     isReceived: item.isReceived
//                 }))
//             }
//         });

//     } catch (error) {
//         console.error('Error in IGR approval:', error);
//         res.status(500).json({
//             message: 'Error processing IGR approval',
//             error: error.message
//         });
//     }
// };

// Update the approveIGR function to add history recording
const approveIGR = async (req, res) => {
    const { igrId } = req.params;
    const { items, remark } = req.body;
    const approverId = req.user.id;

    if (!igrId) {
        return res.status(400).json({
            message: "IGR ID is required"
        });
    }

    try {
        const existingIGR = await prisma.incomingGoodReceipt.findUnique({
            where: { id: igrId },
            include: {
                items: true,
                purchaseOrder: {
                    include: {
                        purchaseOrderItems: true
                    }
                }
            }
        });

        if (!existingIGR) {
            return res.status(404).json({ message: "IGR not found" });
        }

        // Check if the IGR is already approved
        if (existingIGR.status === 'APPROVED') {
            return res.status(400).json({
                message: "This IGR has already been approved and cannot be approved again.",
                igrNumber: existingIGR.igrNumber
            });
        }

        // Validate the received items
        const validatedItems = await Promise.all(items.map(async (item) => {
            const igrItem = await prisma.iGRItem.findUnique({
                where: {
                    id: item.igrItemId,
                    igrId: existingIGR.id
                }
            });

            if (!igrItem) {
                throw new Error(`IGR Item with ID ${item.igrItemId} not found in this IGR`);
            }

            const warehouse = await prisma.warehouse.findUnique({
                where: { warehouseName: item.warehouseName }
            });

            if (!warehouse) {
                throw new Error(`Warehouse ${item.warehouseName} not found`);
            }

            const systemItem = await prisma.item.findFirst({
                where: { itemCode: item.itemCode }
            });

            // Check if the item exists in the warehouse inventory
            const existingInventory = await prisma.warehouseInventory.findFirst({
                where: {
                    warehouseId: warehouse.idWarehouse,
                    itemId: systemItem.idItem
                }
            });

            if (!existingInventory && item.isReceived) {
                throw new Error(`Item ${item.itemCode} is not registered in warehouse ${item.warehouseName}`);
            }

            return {
                ...item,
                warehouseId: warehouse.idWarehouse,
                originalQuantity: igrItem.quantity,
                systemItemId: systemItem.idItem
            };
        }));

        // Check if all items are being marked as received
        const allItemsReceived = existingIGR.items.every(item => 
            validatedItems.some(receivedItem => 
                receivedItem.igrItemId === item.id && receivedItem.isReceived === true
            )
        );

        // Update IGR and warehouse inventory in a transaction
        const result = await prisma.$transaction(async (prisma) => {
            // Update IGR items
            const updatedItems = await Promise.all(validatedItems.map(async (item) => {
                return await prisma.iGRItem.update({
                    where: { id: item.igrItemId },
                    data: { 
                        isReceived: item.isReceived,
                        warehouseId: item.warehouseId ? item.warehouseId : null
                    }
                });
            }));

            // Only update inventory if ALL items are received
            if (allItemsReceived) {
                for (const item of validatedItems) {
                    if (item.isReceived) {
                        const existingInventory = await prisma.warehouseInventory.findFirst({
                            where: {
                                warehouseId: item.warehouseId,
                                itemId: item.systemItemId
                            }
                        });

                        if (existingInventory) {
                            // Update existing inventory
                            await prisma.warehouseInventory.update({
                                where: { 
                                    warehouseId_itemId: {
                                        warehouseId: item.warehouseId,
                                        itemId: item.systemItemId
                                    }
                                },
                                data: {
                                    stockQuantity: {
                                        increment: item.originalQuantity
                                    }
                                }
                            });
                            
                            // Record item history for incoming goods
                            await prisma.itemHistory.create({
                                data: {
                                    itemId: item.systemItemId,
                                    warehouseId: item.warehouseId,
                                    quantity: item.originalQuantity,
                                    type: 'INCOMING',
                                    poNumber: existingIGR.purchaseOrder.purchaseOrderNumber,
                                    igrNumber: existingIGR.igrNumber,
                                    igrId: existingIGR.id,
                                    remarks: remark || `IGR approval - ${existingIGR.igrNumber}`
                                }
                            });
                        }
                    }
                }
            }

            // Update IGR status
            const updatedIGR = await prisma.incomingGoodReceipt.update({
                where: { id: igrId },
                data: {
                    status: allItemsReceived ? 'APPROVED' : 'PENDING',
                    remarks: remark || existingIGR.remarks,
                    approvedBy: allItemsReceived ? approverId : null,
                    approvedAt: allItemsReceived ? new Date() : null
                },
                include: {
                    purchaseOrder: true,
                    items: true
                }
            });

            return { updatedIGR, updatedItems };
        });

        // If not all items are received, return a specific message
        if (!allItemsReceived) {
            return res.status(400).json({
                message: "Cannot fully approve IGR. Not all items are marked as received.",
                data: {
                    igrNumber: result.updatedIGR.igrNumber,
                    purchaseOrderNumber: result.updatedIGR.purchaseOrder.purchaseOrderNumber,
                    igrStatus: result.updatedIGR.status,
                    items: result.updatedIGR.items.map(item => ({
                        itemName: item.itemName,
                        itemCode: item.itemCode,
                        quantity: item.quantity,
                        isReceived: item.isReceived
                    }))
                }
            });
        }

        res.status(200).json({
            message: "IGR fully received and approved",
            data: {
                igrNumber: result.updatedIGR.igrNumber,
                purchaseOrderNumber: result.updatedIGR.purchaseOrder.purchaseOrderNumber,
                igrStatus: result.updatedIGR.status,
                remark: result.updatedIGR.remarks,
                approvedBy: req.user.username,
                approvedAt: result.updatedIGR.approvedAt,
                items: result.updatedIGR.items.map(item => ({
                    itemName: item.itemName,
                    itemCode: item.itemCode,
                    quantity: item.quantity,
                    isReceived: item.isReceived
                }))
            }
        });

    } catch (error) {
        console.error('Error in IGR approval:', error);
        res.status(500).json({
            message: 'Error processing IGR approval',
            error: error.message
        });
    }
};

const getIGRList = async (req, res) => {
    try {
        const { status, search } = req.query;
        
        const whereCondition = {
            ...(status && { status }),
            ...(search && {
                OR: [
                    { igrNumber: { contains: search } },
                    { purchaseOrder: { purchaseOrderNumber: { contains: search } } }
                ]
            })
        };

        const igrList = await prisma.incomingGoodReceipt.findMany({
            where: whereCondition,
            include: {
                purchaseOrder: {
                    include: {
                        approvals: {
                            include: {
                                approvedBy: {
                                    select: {
                                        username: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formattedIGRList = igrList.map(igr => ({
            id: igr.id,
            igrNumber: igr.igrNumber,
            status: igr.status,
            purchaseOrderNumber: igr.purchaseOrder.purchaseOrderNumber,
            approvedBy: igr.purchaseOrder.approvals.map(approval => 
                approval.approvedBy.username
            )
        }));

        res.status(200).json({
            message: "IGR list retrieved successfully",
            data: formattedIGRList
        });
    } catch (error) {
        console.error('Error retrieving IGR list:', error);
        res.status(500).json({
            message: 'Error retrieving IGR list',
            error: error.message
        });
    }
};

const getIGRDetails = async (req, res) => {
    const { igrId } = req.params;

    if (!igrId) {
        return res.status(400).json({
            message: "IGR ID is required"
        });
    }

    try {
        const igr = await prisma.incomingGoodReceipt.findUnique({
            where: { id: igrId },
            include: {
                purchaseOrder: {
                    include: {
                        approvals: {
                            include: {
                                approvedBy: {
                                    select: {
                                        username: true
                                    }
                                }
                            }
                        }
                    }
                },
                items: {
                    include: {
                        warehouse: true
                    }
                },
            }
        });

        if (!igr) {
            return res.status(404).json({ message: "IGR not found" });
        }

        const details = {
            id: igr.id,
            igrNumber: igr.igrNumber,
            status: igr.status,
            remark: igr.remarks,
            purchaseOrderNumber: igr.purchaseOrder.purchaseOrderNumber,
            approvedBy: igr.purchaseOrder.approvals.map(approval => 
                approval.approvedBy.username
            ),
            items: igr.items.map(item => ({
                id: item.id,
                itemName: item.itemName,
                itemCode: item.itemCode,
                quantity: item.quantity,
                isReceived: item.isReceived,
                warehouseName: item.warehouse?.warehouseName || null
            }))
        };

        res.status(200).json({
            message: "IGR details retrieved successfully",
            data: details
        });
    } catch (error) {
        console.error('Error retrieving IGR details:', error);
        res.status(500).json({
            message: 'Error retrieving IGR details',
            error: error.message
        });
    }
};

const deleteIGR = async (req, res) => {
    const { igrId } = req.params;
    const staffId = req.user.id;

    // Check if the user is an Admin
    const user = await prisma.user.findUnique({
      where: { id: staffId },
      select: { role: true },
    });

    if (!igrId) {
        return res.status(400).json({
            message: "IGR ID is required"
        });
    }

    try {
        // Check if IGR exists and is in a state that allows deletion
        const existingIGR = await prisma.incomingGoodReceipt.findUnique({
            where: { id: igrId }
        });

        if (!existingIGR) {
            return res.status(404).json({ message: "IGR not found" });
        }

        // Prevent deletion of approved IGRs
        if (user.role !== 'Admin' && existingIGR.status !== 'PENDING') {
            return res.status(400).json({
                message: "Only pending IGRs can be deleted"
            });
        }

        // Delete the IGR in a transaction to ensure referential integrity
        await prisma.$transaction([
            // Delete IGR items first
            prisma.iGRItem.deleteMany({
                where: { igrId }
            }),
            // Then delete the IGR
            prisma.incomingGoodReceipt.delete({
                where: { id: igrId }
            })
        ]);

        res.status(200).json({
            message: "IGR deleted successfully"
        });
    } catch (error) {
        console.error('Error deleting IGR:', error);
        res.status(500).json({
            message: 'Error deleting IGR',
            error: error.message
        });
    }
};


module.exports = {
    approveIGR,
    getIGRList,
    getIGRDetails,
    deleteIGR
};
