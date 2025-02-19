const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createSupplier = async (req, res) => {
    const staffId = req.user.id;

    try {
        const {
            supplierName,
            supplierPhone,
            supplierAddress } = req.body

        // Create supplier
        const supplier = await prisma.supplier.create({
            data: {
                supplierName,
                supplierPhone,
                supplierAddress,
            }
        })
        res.status(201).json({ message: "Supplier created successfully", supplier });
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ message: 'Error creating supplier' });
    }
}

const addSupplierItem = async (req, res) => {
    const staffId = req.user.id;

    try {
        const supplierId = req.params.supplierId;
        const { itemCode, itemName,  } = req.body;

        // Check if supplier exists
        const supplier = await prisma.supplier.findUnique({
            where: { idSupplier: supplierId },
        });
        if (!supplier) return res.status(404).json({ message: "Supplier not found" });

        // Find the existing item by itemCode or itemName
        const item = await prisma.item.findFirst({
            where: {
                OR: [
                    { itemCode: itemCode },
                    { itemName: itemName }
                ],
            },
        });

        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        // Check if the supplier already has this item
        const existingSupplierItem = await prisma.supplierItem.findUnique({
            where: {
                supplierId_itemId: {
                    supplierId: supplierId,
                    itemId: item.idItem
                }
            }
        });

        if (existingSupplierItem) {
            return res.status(400).json({
                message: "This item is already associated with this supplier"
            });
        }

        // If no existing item found, create new supplier-item association
        const supplierItem = await prisma.supplierItem.create({
            data: {
                supplierId: supplierId,
                itemId: item.idItem,
                
            },
        });

        // Fetch updated supplier with items
        const updatedSupplier = await prisma.supplier.findUnique({
            where: { idSupplier: supplierId },
            include: {
                supplierItems: {
                    include: {
                        item: {
                            select: {
                                itemName: true,
                                itemCode: true
                            }
                        }
                    }
                },
            },
        });

        res.status(200).json({
            message: "Item added successfully",
            supplier: updatedSupplier
        });
    } catch (error) {
        console.error("Error adding item to supplier:", error);
        res.status(500).json({ message: "Error adding item to supplier" });
    }
};


const getAllSuppliersDetails = async (req, res) => {
    const staffId = req.user.id;

    try {
        const suppliers = await prisma.supplier.findMany({
            include: {
                supplierItems: {
                    include: { item: true }
                }
            }
        })
        res.status(200).json(suppliers);
    } catch (error) {
        console.error('Error getting suppliers:', error);
        res.status(500).json({ message: 'Error getting suppliers' });
    }
}

const getSupplierByIdDetails = async (req, res) => {
    const staffId = req.user.id;

    try {
        const { id } = req.params;
        const supplier = await prisma.supplier.findUnique({
            where: {
                idSupplier: id
            },
            include: {
                supplierItems: {
                    include: { item: true }
                }
            }
        })

        if (!supplier) {
            return res.status(404).json({ message: "Supplier not found" });
        }

        res.status(200).json(supplier);
    } catch (error) {
        console.error('Error getting supplier:', error);
        res.status(500).json({ message: 'Error getting supplier' });
    }
}

const getAllSuppliers = async (req, res) => {
    const staffId = req.user.id;

    try {
        const suppliers = await prisma.supplier.findMany(
            {
                select: {
                    idSupplier: true,
                    supplierName: true,
                    supplierPhone: true,
                    supplierAddress: true
                }
            }
        );
        res.status(200).json(suppliers);
    } catch (error) {
        console.error('Error getting suppliers:', error);
        res.status(500).json({ message: 'Error getting suppliers' });
    }
}

const getSupplierById = async (req, res) => {
    const staffId = req.user.id;

    try {
        const { id } = req.params;
        const supplier = await prisma.supplier.findUnique({
            where: {
                idSupplier: id
            },
            select: {
                idSupplier: true,
                supplierName: true,
                supplierPhone: true,
                supplierAddress: true
            }
        });

        if (!supplier) {
            return res.status(404).json({ message: "Supplier not found" });
        }

        res.status(200).json(supplier);
    } catch (error) {
        console.error('Error getting supplier:', error);
        res.status(500).json({ message: 'Error getting supplier' });
    }
}

const getSupplierItems = async (req, res) => {
    const staffId = req.user.id;

    try {
        const { id } = req.params;

        // First check if supplier exists
        const supplier = await prisma.supplier.findUnique({
            where: { idSupplier: id },
        });

        if (!supplier) {
            return res.status(404).json({ message: "Supplier not found" });
        }

        const supplierItems = await prisma.supplierItem.findMany({
            where: {
                supplierId: id
            },
            select: {
                idSupplierItem: true,
                item: {
                    select: {
                        idItem: true,
                        itemCode: true,
                        itemName: true,
                    }
                },
                supplier: {
                    select: {
                        supplierName: true,
                        supplierPhone: true,
                        supplierAddress: true
                    }
                }
            }
        });

        // Transform the data for better frontend consumption
        const formattedItems = supplierItems.map(item => ({
            supplierItemId: item.idSupplierItem,
            itemId: item.item.idItem,
            itemCode: item.item.itemCode,
            itemName: item.item.itemName,
            supplier: item.supplier.supplierName,
        }));

        res.status(200).json({
            message: "Supplier items retrieved successfully",
            supplierName: supplier.supplierName,
            items: formattedItems
        });
    } catch (error) {
        console.error('Error getting supplier items:', error);
        res.status(500).json({ message: 'Error getting supplier items' });
    }
};

const updateSupplier = async (req, res) => {
    const staffId = req.user.id;

    try {
        const { id } = req.params;
        const { supplierName, supplierPhone, supplierAddress } = req.body;

        const updatedSupplier = await prisma.supplier.update({
            where: { idSupplier: id },
            data: {
                supplierName,
                supplierPhone,
                supplierAddress,
            },
        });

        res.status(200).json({ message: "Supplier updated successfully", updatedSupplier });
    } catch (error) {
        console.error("Error updating supplier:", error);
        res.status(500).json({ message: "Error updating supplier" });
    }
};


const deleteSupplier = async (req, res) => {
    const staffId = req.user.id;

    try {
        const { id } = req.params;

        // First, delete all related supplierItem records
        await prisma.supplierItem.deleteMany({
            where: { supplierId: id }
        })

        // Then delete the supplier
        const deletedSupplier = await prisma.supplier.delete({
            where: { idSupplier: id }
        })

        res.status(200).json({ message: "Supplier deleted successfully", deletedSupplier });
    } catch (error) {
        console.error('Error deleting supplier:', error);

        // Handle case where supplier doesn't exist
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "Supplier not found" });
        }

        res.status(500).json({ message: 'Error deleting supplier' });
    }
}

const deleteSupplierItem = async (req, res) => {
    const staffId = req.user.id;

    try {
        const { id } = req.params;

        const deletedSupplierItem = await prisma.supplierItem.delete({
            where: { idSupplierItem: id }
        })

        res.status(200).json({ message: "Supplier item deleted successfully", deletedSupplierItem });
    } catch (error) {
        console.error('Error deleting supplier item:', error);
        res.status(500).json({ message: 'Error deleting supplier item' });
    }
}

module.exports = {
    createSupplier,
    addSupplierItem,
    getAllSuppliersDetails,
    getSupplierByIdDetails,
    getAllSuppliers,
    getSupplierById,
    getSupplierItems,
    updateSupplier,
    deleteSupplier,
    deleteSupplierItem
}