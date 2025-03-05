const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createDeliveryOrder = async (req, res) => {
  try {
    const {
      requestCode,
      doNumber, 
      notes,
      items, 
    } = req.body;

    // Validate user exists
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If requestCode provided, validate it exists and check for existing Delivery Order
    if (requestCode) {
      const existingDeliveryOrder = await prisma.deliveryOrder.findFirst({
        where: { requestCode },
      });

      if (existingDeliveryOrder) {
        return res.status(400).json({
          message: `A Delivery Order already exists for the provided Request Code: ${requestCode}.`
        });
      }

      const requestPurchase = await prisma.requestPurchase.findUnique({
        where: { requestCode },
      });

      if (!requestPurchase) {
        return res.status(404).json({ message: "Request Purchase not found" });
      }
    }

    // Validate delivery order number is unique
    const existingDO = await prisma.deliveryOrder.findUnique({
      where: { doNumber },
    });

    if (existingDO) {
      return res
        .status(400)
        .json({ message: "Delivery Order number already exists" });
    }

    // Validate warehouse and inventory existence for each item
    for (const item of items) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { warehouseName: item.warehouseName },
      });

      if (!warehouse) {
        return res.status(404).json({
          message: `Warehouse ${item.warehouseName} not found`,
        });
      }

      // Check if item exists in warehouse inventory
      const inventory = await prisma.warehouseInventory.findFirst({
        where: {
          warehouseId: warehouse.idWarehouse,
          item: {
            itemCode: item.itemCode,
          },
        },
        include: {
          item: true,
        },
      });

      if (!inventory) {
        return res.status(404).json({
          message: `Item ${item.itemCode} not found in warehouse ${item.warehouseName}`,
        });
      }

      // Check if requested quantity is available (but don't decrement yet)
      if (inventory.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for item ${item.itemCode} in warehouse ${item.warehouseName}. Available: ${inventory.stockQuantity}`,
        });
      }
    }

    // Create delivery order with items
    const deliveryOrder = await prisma.deliveryOrder.create({
      data: {
        doNumber,
        requestCode,
        notes,
        userId,
        items: {
          create: await Promise.all(
            items.map(async (item) => {
              const warehouse = await prisma.warehouse.findFirst({
                where: { warehouseName: item.warehouseName },
              });

              return {
                itemName: item.itemName,
                itemCode: item.itemCode,
                quantity: item.quantity,
                remarks: item.remarks,
                warehouseId: warehouse.idWarehouse,
              };
            })
          ),
        },
      },
      include: {
        items: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    res.status(201).json({
      message: "Delivery Order created successfully",
      deliveryOrder,
    });
  } catch (error) {
    console.error("Error creating delivery order:", error);
    res.status(500).json({ message: "Error creating delivery order" });
  }
};

const approveDeliveryOrder = async (req, res) => {
  const { deliveryOrderId } = req.params;
  const approverId = req.user.id;

  if (!deliveryOrderId) {
    return res.status(400).json({
      message: "Delivery order ID is required",
    });
  }

  try {
    // Check if approver exists and has signature
    const user = await prisma.user.findUnique({
      where: { id: approverId },
      select: {
        signature: true,
        role: true,
      },
    });

    if (!user.signature) {
      return res.status(400).json({
        message:
          "You need to have a signature registered to approve delivery orders",
      });
    }

    // Get delivery order with all related data
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: {
        id: deliveryOrderId,
      },
      include: {
        approvals: true,
        items: {
          include: {
            warehouse: true,
          },
        },
        requestPurchase: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!deliveryOrder) {
      return res.status(404).json({ message: "Delivery order not found" });
    }

    // Check if already completed
    if (deliveryOrder.status === "COMPLETED") {
      return res.status(400).json({
        message:
          "This delivery order is already completed and cannot be approved further",
      });
    }

    // Check if user has already approved
    const hasApproved = deliveryOrder.approvals.some(
      (approval) => approval.approvedById === approverId
    );

    if (hasApproved) {
      return res.status(400).json({
        message: "You have already approved this delivery order",
      });
    }

    // Process approval in transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create approval record
      const approval = await prisma.deliveryOrderApproval.create({
        data: {
          deliveryOrderId,
          approvedById: approverId,
          signature: user.signature,
        },
      });

      // Count total approvals
      const approvalCount = await prisma.deliveryOrderApproval.count({
        where: { deliveryOrderId },
      });

      let status = "PENDING";
      if (approvalCount >= 4) {
        status = "COMPLETED";
      }

      // Update delivery order status
      const updatedDO = await prisma.deliveryOrder.update({
        where: { id: deliveryOrderId },
        data: { status },
      });

      // If final approval, process inventory updates
      if (status === "COMPLETED") {
        // Final inventory check and update
        for (const item of deliveryOrder.items) {
          // Get the Item entity to get the item ID
          const systemItem = await prisma.item.findFirst({
            where: { itemCode: item.itemCode }
          });
          
          if (!systemItem) {
            throw new Error(`System item with code ${item.itemCode} not found`);
          }

          const inventory = await prisma.warehouseInventory.findFirst({
            where: {
              warehouseId: item.warehouseId,
              item: {
                itemCode: item.itemCode,
              },
            },
          });

          if (!inventory || inventory.stockQuantity < item.quantity) {
            throw new Error(
              `Insufficient stock for item ${item.itemCode} in warehouse ${item.warehouse.warehouseName}`
            );
          }

          // Now we decrement the inventory
          await prisma.warehouseInventory.updateMany({
            where: {
              warehouseId: item.warehouseId,
              item: {
                itemCode: item.itemCode,
              },
            },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
          
          // Record item history for outgoing goods
          await prisma.itemHistory.create({
            data: {
              itemId: systemItem.idItem,
              warehouseId: item.warehouseId,
              quantity: item.quantity,
              type: 'OUTGOING',
              mprNumber: deliveryOrder.requestCode,
              doNumber: deliveryOrder.doNumber,
              doId: deliveryOrder.id,
              locationId: deliveryOrder.requestPurchase?.locationId,
              notes: `Delivery Order completion - ${deliveryOrder.doNumber}`
            }
          });
        }
      }

      return { updatedDO, approval };
    });

    const message =
      result.updatedDO.status === "COMPLETED"
        ? "Delivery order fully approved and inventory updated"
        : `Delivery order approval added successfully (${
            deliveryOrder.approvals.length + 1
          }/4 approvals)`;

    res.status(200).json({
      message,
      data: result,
    });
  } catch (error) {
    console.error("Error in delivery order approval:", error);
    res.status(500).json({
      message: "Error processing delivery order approval",
      error: error.message,
    });
  }
};

// Get all delivery orders (basic info)
const getAllDeliveryOrders = async (req, res) => {
  try {
    const staffId = req.user.id;

    const deliveryOrders = await prisma.deliveryOrder.findMany({
      select: {
        id: true,
        doNumber: true,
        requestCode: true,
        status: true,
        createdBy: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(deliveryOrders);
  } catch (error) {
    console.error("Error getting delivery orders:", error);
    res.status(500).json({ message: "Error getting delivery orders" });
  }
};

// Get delivery order details by ID
const getDeliveryOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.user.id;

    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { id },
      select: {
        id: true,
        doNumber: true,
        requestCode: true,
        status: true,
        notes: true,
        createdBy: {
          select: {
            username: true,
          },
        },
        items: {
          select: {
            id: true,
            itemName: true,
            itemCode: true,
            quantity: true,
            remarks: true,
            warehouse: {
              select: {
                warehouseName: true,
              },
            },
          },
        },
      },
    });

    if (!deliveryOrder) {
      return res.status(404).json({ message: "Delivery order not found" });
    }

    // Transform the response to match the requested format
    const formattedResponse = {
      ...deliveryOrder,
      items: deliveryOrder.items.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        itemCode: item.itemCode,
        quantity: item.quantity,
        remarks: item.remarks,
        warehouseName: item.warehouse.warehouseName,
      })),
    };

    res.status(200).json(formattedResponse);
  } catch (error) {
    console.error("Error getting delivery order details:", error);
    res.status(500).json({ message: "Error getting delivery order details" });
  }
};

const editDeliveryOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { requestCode, doNumber, notes, items } = req.body;

    // Check if delivery order exists and get its current status
    const existingDO = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: {
        items: true,
        approvals: true,
      },
    });

    if (!existingDO) {
      return res.status(404).json({ message: "Delivery order not found" });
    }

    // Prevent editing if status is COMPLETED
    if (existingDO.status === "COMPLETED") {
      return res.status(400).json({
        message: "Cannot edit a completed delivery order",
      });
    }

    // Check if new DO number (if changed) is unique
    if (doNumber !== existingDO.doNumber) {
      const duplicateDO = await prisma.deliveryOrder.findUnique({
        where: { doNumber },
      });

      if (duplicateDO) {
        return res.status(400).json({
          message: "Delivery Order number already exists",
        });
      }
    }

    // Validate request purchase if provided
    if (requestCode) {
      const requestPurchase = await prisma.requestPurchase.findUnique({
        where: { requestCode },
      });

      if (!requestPurchase) {
        return res.status(404).json({
          message: "Request Purchase not found",
        });
      }
    }

    // Validate items and warehouses
    for (const item of items) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { warehouseName: item.warehouseName },
      });

      if (!warehouse) {
        return res.status(404).json({
          message: `Warehouse ${item.warehouseName} not found`,
        });
      }

      // Check if item exists in warehouse inventory
      const inventory = await prisma.warehouseInventory.findFirst({
        where: {
          warehouseId: warehouse.idWarehouse,
          item: {
            itemCode: item.itemCode,
          },
        },
        include: {
          item: true,
        },
      });

      if (!inventory) {
        return res.status(404).json({
          message: `Item ${item.itemCode} not found in warehouse ${item.warehouseName}`,
        });
      }

      // Validate item name matches the registered item code
      if (inventory.item.itemName !== item.itemName) {
        return res.status(400).json({
          message: `Item name '${item.itemName}' does not match item code '${item.itemCode}'. Expected: '${inventory.item.itemName}'`,
        });
      }

      // Check if requested quantity is available
      if (inventory.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for item ${item.itemCode} in warehouse ${item.warehouseName}. Available: ${inventory.stockQuantity}`,
        });
      }
    }

    // Update delivery order in a transaction
    const updatedDeliveryOrder = await prisma.$transaction(async (prisma) => {
      // Delete existing items
      await prisma.deliveryOrderItem.deleteMany({
        where: { deliveryOrderId: id },
      });

      // Update the delivery order and create new items
      const updated = await prisma.deliveryOrder.update({
        where: { id },
        data: {
          doNumber,
          requestCode,
          notes,
          items: {
            create: await Promise.all(
              items.map(async (item) => {
                const warehouse = await prisma.warehouse.findFirst({
                  where: { warehouseName: item.warehouseName },
                });

                return {
                  itemName: item.itemName,
                  itemCode: item.itemCode,
                  quantity: item.quantity,
                  remarks: item.remarks,
                  warehouseId: warehouse.idWarehouse,
                };
              })
            ),
          },
        },
        include: {
          items: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      return updated;
    });

    res.status(200).json({
      message: "Delivery Order updated successfully",
      deliveryOrder: updatedDeliveryOrder,
    });
  } catch (error) {
    console.error("Error updating delivery order:", error);
    res.status(500).json({
      message: "Error updating delivery order",
      error: error.message,
    });
  }
};

// Delete delivery order
const deleteDeliveryOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: staffId },
      select: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // First check if the delivery order exists
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: {
        approvals: true,
        items: true,
      },
    });

    if (!deliveryOrder) {
      return res.status(404).json({ message: "Delivery order not found" });
    }

    // Check if the delivery order can be deleted (only PENDING status) if its not admin
    if (user.role !== "Admin" && deliveryOrder.status !== "PENDING") {
      return res.status(400).json({
        message: "Cannot delete a delivery order that is not in PENDING status",
      });
    }

    // Delete everything in a transaction
    await prisma.$transaction(async (prisma) => {
      // Delete approvals
      await prisma.deliveryOrderApproval.deleteMany({
        where: { deliveryOrderId: id },
      });

      // Delete items
      await prisma.deliveryOrderItem.deleteMany({
        where: { deliveryOrderId: id },
      });

      // Delete the delivery order itself
      await prisma.deliveryOrder.delete({
        where: { id },
      });
    });

    res.status(200).json({
      message: "Delivery order and associated records deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting delivery order:", error);
    res.status(500).json({ message: "Error deleting delivery order" });
  }
};

module.exports = {
  createDeliveryOrder,
  approveDeliveryOrder,
  getAllDeliveryOrders,
  getDeliveryOrderDetails,
  editDeliveryOrder,
  deleteDeliveryOrder,
};
