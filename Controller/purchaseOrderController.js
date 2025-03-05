const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");

const calculatePrices = (items) => {
  // Group items by supplier
  const supplierGroups = items.reduce((acc, item) => {
    const supplier = item.supplierName;
    if (!acc[supplier]) {
      acc[supplier] = [];
    }
    acc[supplier].push(item);
    return acc;
  }, {});

  // Calculate totals for each supplier and overall
  let totalPOAmount = 0;
  const supplierTotals = {};

  Object.entries(supplierGroups).forEach(([supplier, items]) => {
    const supplierTotal = items.reduce((sum, item) => {
      const itemTotal = parseFloat(item.totalPrice);
      return sum + itemTotal;
    }, 0);
    supplierTotals[supplier] = supplierTotal;
    totalPOAmount += supplierTotal;
  });

  return {
    supplierGroups,
    supplierTotals,
    totalPOAmount,
  };
};

const createPurchaseOrderWithItems = async (req, res) => {
  const { purchaseOrderNumber, purchaseOrderNotes, supplierName, items } =
    req.body;
  const staffId = req.user.id;

  try {
    // Validate PO number doesn't exist
    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { purchaseOrderNumber },
    });

    if (existingPO) {
      return res.status(400).json({
        message: "Purchase order number already exists",
      });
    }

    // Validate supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { supplierName },
    });

    if (!supplier) {
      return res.status(400).json({
        message: `Supplier ${supplierName} not found`,
      });
    }

    // Get all request purchases referenced in items
    const requestCodes = [
      ...new Set(items.map((item) => item.requestPurchaseCode)),
    ];
    const purchaseRequests = await prisma.requestPurchase.findMany({
      where: {
        requestCode: { in: requestCodes },
        requestStatus: "APPROVED",
      },
      include: {
        itemRequests: {
          include: {
            purchaseOrderItems: true, 
          },
        },
      },
    });

    // Validate all referenced request purchases exist
    if (purchaseRequests.length !== requestCodes.length) {
      return res.status(400).json({
        message: "One or more MPR codes are invalid or not approved",
      });
    }

    // Process and validate each item
    const processedItems = await Promise.all(
      items.map(async (item) => {
        // Find the corresponding request purchase
        const requestPurchase = purchaseRequests.find(
          (pr) => pr.requestCode === item.requestPurchaseCode
        );

        // Find the matching item request by itemCode (no longer using itemRequestName)
        const itemRequest = requestPurchase.itemRequests.find(
          (ir) => ir.itemRequestName.toLowerCase() === item.itemName.toLowerCase()
        );

        if (!itemRequest) {
          throw new Error(
            `Item "${item.itemName}" not found in MPR ${item.requestPurchaseCode}`
          );
        }

        // Check if item is already assigned to another PO
        if (itemRequest.purchaseOrderItems.length > 0) {
          throw new Error(
            `Item "${item.itemName}" from MPR ${item.requestPurchaseCode} is already assigned to another purchase order`
          );
        }

        // Validate the item exists in the database
        const existingItem = await prisma.item.findFirst({
          where: {
            itemCode: item.itemCode,
            itemName: item.itemName,
          },
        });

        if (!existingItem) {
          throw new Error(
            `Item ${item.itemName} (${item.itemCode}) not found in the system`
          );
        }

        const totalPrice = (parseFloat(item.unitPrice) * item.quantity).toFixed(
          2
        );

        return {
          requestPurchaseId: requestPurchase.id,
          itemRequestId: itemRequest.id,
          itemName: item.itemName,
          itemCode: item.itemCode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
          consignTo: item.consignTo,
          itemRemarks: itemRequest.itemRemark || "", // Get item remarks from the itemRequest
          originalRequest: {
            code: item.requestPurchaseCode,
            itemPurpose: itemRequest.itemPurpose,
          },
        };
      })
    );

    // Calculate total amount
    const totalAmount = processedItems
      .reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)
      .toFixed(2);

    // Create purchase order with items in a transaction
    const purchaseOrder = await prisma.$transaction(async (prisma) => {
      // Create the main purchase order
      const po = await prisma.purchaseOrder.create({
        data: {
          purchaseOrderNumber,
          purchaseOrderNotes, // Changed from purchaseOrderRemark to purchaseOrderNotes
          createdById: staffId,
          status: "PENDING",
          totalAmount: totalAmount.toString(),
          requestPurchases: {
            connect: processedItems.map((item) => ({
              id: item.requestPurchaseId,
            })),
          },
          purchaseOrderItems: {
            create: processedItems.map((item) => ({
              itemRequestId: item.itemRequestId,
              itemName: item.itemName,
              itemCode: item.itemCode,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              supplierName: supplierName,
              supplierTotal: totalAmount.toString(),
              consignTo: item.consignTo,
              itemRemarks: item.itemRemarks, 
            })),
          },
        },
      });

      // Update request purchases to link them to the PO using nested updates
      const uniqueRequestIds = [
        ...new Set(processedItems.map((item) => item.requestPurchaseId)),
      ];
      await Promise.all(
        uniqueRequestIds.map((requestId) =>
          prisma.requestPurchase.update({
            where: { id: requestId },
            data: {
              purchaseOrders: {
                connect: { idPurchaseOrder: po.idPurchaseOrder },
              },
            },
          })
        )
      );

      return po;
    });

    // Fetch complete purchase order with all relations
    const completePO = await prisma.purchaseOrder.findUnique({
      where: { idPurchaseOrder: purchaseOrder.idPurchaseOrder },
      include: {
        purchaseOrderItems: {
          include: {
            itemRequest: true,
          },
        },
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    });

    // Format the response
    const response = {
      purchaseOrderNumber: completePO.purchaseOrderNumber,
      purchaseOrderNotes: completePO.purchaseOrderNotes,
      status: completePO.status,
      createdBy: completePO.createdBy.username,
      createdAt: completePO.createdAt,
      supplierName,
      items: processedItems.map((item) => ({
        requestPurchaseCode: item.originalRequest.code,
        itemName: item.itemName,
        itemCode: item.itemCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        consignTo: item.consignTo,
        itemRemarks: item.itemRemarks,
        itemPurpose: item.originalRequest.itemPurpose,
      })),
      totalAmount,
    };

    res.status(201).json({
      message: "Purchase order created successfully",
      purchaseOrder: response,
    });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    res.status(500).json({
      message: "Error creating purchase order",
      error: error.message,
    });
  }
};

const getAllPurchaseOrders = async (req, res) => {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      select: {
        idPurchaseOrder: true,
        purchaseOrderNumber: true,
        purchaseOrderNotes: true, // Changed from purchaseOrderRemark
        requestPurchases: {
          select: {
            requestCode: true,
          },
        },
        createdBy: {
          select: {
            username: true,
          },
        },
        status: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedPurchaseOrders = purchaseOrders.map((po) => ({
      idPurchaseOrder: po.idPurchaseOrder,
      purchaseOrderNumber: po.purchaseOrderNumber,
      purchaseOrderNotes: po.purchaseOrderNotes, // Changed from purchaseOrderRemark
      requestCodes:
        po.requestPurchases.map((rp) => rp.requestCode).join(", ") || "-",
      createdBy: po.createdBy.username,
      status: po.status,
      totalAmount: po.totalAmount,
      createdAt: po.createdAt,
    }));

    res.status(200).json(formattedPurchaseOrders);
  } catch (error) {
    console.error("Error getting purchase orders:", error);
    res.status(500).json({ message: "Error getting purchase orders" });
  }
};

const getAllPurchaseOrdersWithDetails = async (req, res) => {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: {
        requestPurchases: {
          include: {
            itemRequests: true,
            user: {
              select: {
                username: true,
                role: true,
              },
            },
          },
        },
        purchaseOrderItems: {
          include: {
            itemRequest: {
              select: {
                id: true,
                itemRequestName: true,
                itemRequestAmount: true,
                itemPriorityLevel: true,
                itemRemark: true,
                itemPurpose: true,              
              },
            },
          },
          orderBy: {
            supplierName: "asc",
          },
        },
        createdBy: {
          select: {
            username: true,
            role: true,
          },
        },
        approvals: {
          include: {
            approvedBy: {
              select: {
                username: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedPurchaseOrders = purchaseOrders.map((po) => {
      const { supplierGroups, supplierTotals, totalPOAmount } = calculatePrices(
        po.purchaseOrderItems
      );

      // Gather all related request purchases
      const requestDetails = po.requestPurchases.map(rp => ({
        requestCode: rp.requestCode,
        requestedBy: rp.user?.username,
        requestedByRole: rp.user?.role,
        itemRequests: rp.itemRequests,
      }));

      return {
        purchaseOrderDetails: {
          idPurchaseOrder: po.idPurchaseOrder,
          purchaseOrderNumber: po.purchaseOrderNumber,
          purchaseOrderNotes: po.purchaseOrderNotes, // Changed from purchaseOrderRemark
          status: po.status,
          createdAt: po.createdAt,
          totalAmount: totalPOAmount.toString(),
        },
        requestDetails: requestDetails,
        processingDetails: {
          createdBy: po.createdBy.username,
          createdByRole: po.createdBy.role,
          approvals: po.approvals.map((approval) => ({
            approvedBy: approval.approvedBy.username,
            approvedByRole: approval.approvedBy.role,
            approvedAt: approval.approvedAt,
            signature: approval.signature,
          })),
        },
        supplierGroups: Object.entries(supplierGroups).map(
          ([supplierName, items]) => ({
            supplierName,
            totalAmount: supplierTotals[supplierName].toString(),
            items: items.map(item => ({
              ...item,
              itemRemarks: item.itemRemarks || "", // Include itemRemarks in the response
            })),
          })
        ),
      };
    });

    res.status(200).json({
      message: "All purchase orders with details fetched successfully",
      purchaseOrders: formattedPurchaseOrders,
    });
  } catch (error) {
    console.error("Error getting all purchase orders with details:", error);
    res
      .status(500)
      .json({ message: "Error getting purchase orders with details" });
  }
};

// Get detailed purchase order by ID (enhanced version)
const getPurchaseOrderDetailById = async (req, res) => {
  const { id } = req.params;

  try {
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: {
        idPurchaseOrder: id,
      },
      include: {
        purchaseOrderItems: {
          orderBy: {
            supplierName: "asc",
          },
        },
        createdBy: {
          select: {
            username: true,
          },
        },
        requestPurchases: true,
      },
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const formattedResponse = {
      purchaseOrderDetails: {
        idPurchaseOrder: purchaseOrder.idPurchaseOrder,
        purchaseOrderNumber: purchaseOrder.purchaseOrderNumber,
        purchaseOrderNotes: purchaseOrder.purchaseOrderNotes, // Changed from purchaseOrderRemark
        status: purchaseOrder.status,
        createdAt: purchaseOrder.createdAt,
        totalAmount: purchaseOrder.totalAmount,
        requestCodes: purchaseOrder.requestPurchases
          .map((rp) => rp.requestCode)
          .join(", "),
      },
      items: purchaseOrder.purchaseOrderItems.map((item) => ({
        itemId: item.idPurchaseOrderItem,
        itemName: item.itemName,
        itemCode: item.itemCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        consignTo: item.consignTo,
        itemRemarks: item.itemRemarks || "", // Include itemRemarks in the response
      })),
    };

    res.status(200).json(formattedResponse);
  } catch (error) {
    console.error("Error getting purchase order details:", error);
    res.status(500).json({ message: "Error getting purchase order details" });
  }
};

const updatePurchaseOrder = async (req, res) => {
  const { id } = req.params;
  const { purchaseOrderNotes, supplierName, items } = req.body; // Changed from purchaseOrderRemark
  const staffId = req.user.id;

  try {
    // Find existing purchase order
    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { idPurchaseOrder: id },
      include: {
        purchaseOrderItems: true,
        approvals: true,
        incomingGoodReceipt: true,
        requestPurchases: true,
      },
    });

    if (!existingPO) {
      return res.status(404).json({
        message: "Purchase order not found",
      });
    }

    // Validate PO can be updated (must be PENDING)
    if (existingPO.status !== "PENDING") {
      return res.status(400).json({
        message: "Cannot update purchase order that is not in PENDING status",
      });
    }

    if (existingPO.incomingGoodReceipt) {
      return res.status(400).json({
        message:
          "Cannot update purchase order with existing incoming good receipt",
      });
    }

    if (existingPO.approvals.length > 0) {
      return res.status(400).json({
        message: "Cannot update purchase order that has approvals",
      });
    }

    // Validate supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { supplierName },
    });

    if (!supplier) {
      return res.status(400).json({
        message: `Supplier ${supplierName} not found`,
      });
    }

    // Get all request purchases referenced in items
    const requestCodes = [
      ...new Set(items.map((item) => item.requestPurchaseCode)),
    ];
    const purchaseRequests = await prisma.requestPurchase.findMany({
      where: {
        requestCode: { in: requestCodes },
        requestStatus: "APPROVED",
      },
      include: {
        itemRequests: true,
      },
    });

    // Validate all referenced request purchases exist
    if (purchaseRequests.length !== requestCodes.length) {
      return res.status(400).json({
        message: "One or more MPR codes are invalid or not approved",
      });
    }

    // Process and validate each item
    const processedItems = await Promise.all(
      items.map(async (item) => {
        // Find the corresponding request purchase
        const requestPurchase = purchaseRequests.find(
          (pr) => pr.requestCode === item.requestPurchaseCode
        );

        // Find the matching item request by itemName
        const itemRequest = requestPurchase.itemRequests.find(
          (ir) => ir.itemRequestName.toLowerCase() === item.itemName.toLowerCase()
        );

        if (!itemRequest) {
          throw new Error(
            `Item "${item.itemName}" not found in MPR ${item.requestPurchaseCode}`
          );
        }

        // Validate the item exists in the database
        const existingItem = await prisma.item.findFirst({
          where: {
            itemCode: item.itemCode,
            itemName: item.itemName,
          },
        });

        if (!existingItem) {
          throw new Error(
            `Item ${item.itemName} (${item.itemCode}) not found in the system`
          );
        }

        const totalPrice = (parseFloat(item.unitPrice) * item.quantity).toFixed(
          2
        );

        return {
          requestPurchaseId: requestPurchase.id,
          itemRequestId: itemRequest.id,
          itemName: item.itemName,
          itemCode: item.itemCode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
          consignTo: item.consignTo,
          itemRemarks: itemRequest.itemRemark || "", // Get item remarks from the itemRequest
          originalRequest: {
            code: item.requestPurchaseCode,
            itemPurpose: itemRequest.itemPurpose,
          },
        };
      })
    );

    // Calculate total amount
    const totalAmount = processedItems
      .reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)
      .toFixed(2);

    // Update purchase order with items in a transaction
    const updatedPO = await prisma.$transaction(async (prisma) => {
      // Delete existing items
      await prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });

      // Get unique request purchase IDs
      const uniqueRequestIds = [
        ...new Set(processedItems.map((item) => item.requestPurchaseId)),
      ];

      // Update the main purchase order
      const po = await prisma.purchaseOrder.update({
        where: { idPurchaseOrder: id },
        data: {
          purchaseOrderNotes, // Changed from purchaseOrderRemark
          totalAmount: totalAmount.toString(),
          // Disconnect all existing request purchases and connect new ones
          requestPurchases: {
            set: [], // Disconnect all existing
            connect: uniqueRequestIds.map((requestId) => ({ id: requestId })),
          },
          purchaseOrderItems: {
            create: processedItems.map((item) => ({
              itemRequestId: item.itemRequestId,
              itemName: item.itemName,
              itemCode: item.itemCode,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              supplierName: supplierName,
              supplierTotal: totalAmount.toString(),
              consignTo: item.consignTo,
              itemRemarks: item.itemRemarks, // Added itemRemarks
            })),
          },
        },
      });

      return po;
    });

    // Fetch complete updated purchase order with all relations
    const completePO = await prisma.purchaseOrder.findUnique({
      where: { idPurchaseOrder: updatedPO.idPurchaseOrder },
      include: {
        purchaseOrderItems: {
          include: {
            itemRequest: true,
          },
        },
        createdBy: {
          select: {
            username: true,
          },
        },
        requestPurchases: true,
      },
    });

    // Format the response
    const response = {
      purchaseOrderNumber: completePO.purchaseOrderNumber,
      purchaseOrderNotes: completePO.purchaseOrderNotes, // Changed from purchaseOrderRemark
      status: completePO.status,
      createdBy: completePO.createdBy.username,
      createdAt: completePO.createdAt,
      supplierName,
      requestCodes: completePO.requestPurchases
        .map((rp) => rp.requestCode)
        .join(", "),
      items: processedItems.map((item) => ({
        requestPurchaseCode: item.originalRequest.code,
        itemName: item.itemName,
        itemCode: item.itemCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        consignTo: item.consignTo,
        itemRemarks: item.itemRemarks,
        itemPurpose: item.originalRequest.itemPurpose,
      })),
      totalAmount,
    };

    res.status(200).json({
      message: "Purchase order updated successfully",
      purchaseOrder: response,
    });
  } catch (error) {
    console.error("Error updating purchase order:", error);
    res.status(500).json({
      message: "Error updating purchase order",
      error: error.message,
    });
  }
};

const deletePurchaseOrder = async (req, res) => {
  const { id } = req.params;
  const staffId = req.user.id;

  // Check if the user is an Admin
  const user = await prisma.user.findUnique({
    where: { id: staffId },
    select: { role: true },
  });

  try {
    // Find the purchase order
    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { idPurchaseOrder: id },
      include: {
        purchaseOrderItems: true,
        approvals: true,
        incomingGoodReceipt: true,
        requestPurchases: true,
      },
    });

    if (!existingPO) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    // Check if PO can be deleted (must be PENDING)
    if (user.role !== "Admin" && existingPO.status !== "PENDING") {
      return res.status(400).json({
        message: "Cannot delete purchase order that is not in PENDING status",
      });
    }

    if (existingPO.incomingGoodReceipt) {
      return res.status(400).json({
        message:
          "Cannot delete purchase order with existing incoming good receipt",
      });
    }

    // Check if there are any approvals
    if (existingPO.approvals.length > 0) {
      return res.status(400).json({
        message: "Cannot delete purchase order that has approvals",
      });
    }

    // Delete PO and related records in a transaction
    await prisma.$transaction(async (prisma) => {
      // Delete related records first
      await prisma.pOApproval.deleteMany({
        where: { purchaseOrderId: id },
      });

      await prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });

      // Disconnect all request purchases
      await prisma.purchaseOrder.update({
        where: { idPurchaseOrder: id },
        data: {
          requestPurchases: {
            set: [], // Disconnect all request purchases
          },
        },
      });

      // Finally delete the purchase order
      await prisma.purchaseOrder.delete({
        where: { idPurchaseOrder: id },
      });
    });

    res.status(200).json({
      message: "Purchase order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    res.status(500).json({
      message: "Error deleting purchase order",
      error: error.message,
    });
  }
};

// Function to generate a unique IGR number
const generateUniqueIgrNumber = async () => {
  const year = new Date().getFullYear();
  let igrNumber;

  // Fetch all IGRs for the current year
  const igrs = await prisma.incomingGoodReceipt.findMany({
    where: {
      igrNumber: {
        endsWith: `-${year}`, // Correctly target IGRs ending with the current year
      },
    },
    select: {
      igrNumber: true,
    },
  });

  // Extract sequence numbers from existing IGRs
  const sequenceNumbers = igrs.map((igr) => {
    const parts = igr.igrNumber.split("-");
    if (
      parts.length === 3 &&
      parts[0] === "IGR" &&
      parts[2] === year.toString()
    ) {
      const sequence = parseInt(parts[1], 10);
      return isNaN(sequence) ? 0 : sequence;
    }
    return 0;
  });

  // Determine the next sequence number
  const maxSequence =
    sequenceNumbers.length > 0 ? Math.max(...sequenceNumbers) : 0;
  let nextSequence = maxSequence + 1;

  // Generate and check uniqueness with retry logic
  while (true) {
    igrNumber = `IGR-${nextSequence.toString().padStart(4, "0")}-${year}`;

    const existingIgr = await prisma.incomingGoodReceipt.findUnique({
      where: { igrNumber },
    });

    if (!existingIgr) {
      break;
    }

    nextSequence++;
  }

  return igrNumber;
};

const approvePurchaseOrder = async (req, res) => {
  const { purchaseOrderId } = req.params;
  const approverId = req.user.id;

  if (!purchaseOrderId) {
    return res.status(400).json({
      message: "Purchase order ID is required",
    });
  }

  try {
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
          "You need to have a signature registered to approve purchase orders",
      });
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: {
        idPurchaseOrder: purchaseOrderId,
      },
      include: {
        approvals: true,
        purchaseOrderItems: {
          include: {
            itemRequest: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    // Check if the purchase order is already fully approved
    if (purchaseOrder.status === "FULLY_APPROVED") {
      return res.status(400).json({
        message:
          "This purchase order is already fully approved and cannot be approved further",
      });
    }

    const hasApproved = purchaseOrder.approvals.some(
      (approval) => approval.approvedById === approverId
    );

    if (hasApproved) {
      return res.status(400).json({
        message: "You have already approved this purchase order",
      });
    }

    const result = await prisma.$transaction(async (prisma) => {
      const approval = await prisma.pOApproval.create({
        data: {
          purchaseOrderId,
          approvedById: approverId,
          signature: user.signature,
        },
      });

      const approvalCount = await prisma.pOApproval.count({
        where: { purchaseOrderId },
      });

      let status = "PENDING";
      let updatedPO = null;
      if (approvalCount >= 3) {
        status = "FULLY_APPROVED";

        await prisma.itemRequest.updateMany({
          where: {
            id: {
              in: purchaseOrder.purchaseOrderItems
                .map((poItem) => poItem.itemRequestId)
                .filter(Boolean),
            },
          },
          data: { itemRequestStatus: "IN_PROGRESS" },
        });

        const igrNumber = await generateUniqueIgrNumber();

        igr = await prisma.incomingGoodReceipt.create({
          data: {
            igrNumber,
            purchaseOrderId,
            notes: purchaseOrder.purchaseOrderNotes || "",
            items: {
              create: purchaseOrder.purchaseOrderItems.map((item) => ({
                itemName: item.itemName,
                itemCode: item.itemCode,
                quantity: item.quantity,
              })),
            },
          },
        });

        updatedPO = await prisma.purchaseOrder.update({
          where: { idPurchaseOrder: purchaseOrderId },
          data: { status },
        });
      } else if (approvalCount > 0) {
        status = "PARTIALLY_APPROVED";
        updatedPO = await prisma.purchaseOrder.update({
          where: { idPurchaseOrder: purchaseOrderId },
          data: { status },
        });
      }

      return { updatedPO, approval };
    });

    const message = result.igr
      ? "Purchase order fully approved, IGR created, and item requests updated to IN_PROGRESS"
      : `Purchase order approval added successfully (${
          purchaseOrder.approvals.length + 1
        }/3 approvals)`;

    res.status(200).json({
      message,
      data: result,
    });
  } catch (error) {
    console.error("Error in purchase order approval:", error);
    res.status(500).json({
      message: "Error processing purchase order approval",
      error: error.message,
    });
  }
};

module.exports = {
  createPurchaseOrderWithItems,
  getAllPurchaseOrders,
  getAllPurchaseOrdersWithDetails,
  getPurchaseOrderDetailById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  approvePurchaseOrder,
};
