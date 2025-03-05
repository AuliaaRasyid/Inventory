const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createSupplier = async (req, res) => {
    const staffId = req.user.id;

    try {
        const {
            supplierName,
            supplierPhone,
            supplierAddress 
        } = req.body

        const existingSupplier = await prisma.supplier.findUnique({
            where: {
                supplierName
            }
        })

        if (existingSupplier) {
            return res.status(400).json({ message: "Supplier already exists" });
        }

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


const getAllSuppliersDetails = async (req, res) => {
    const staffId = req.user.id;

    try {
        const suppliers = await prisma.supplier.findMany({
            
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

const updateSupplier = async (req, res) => {
    const staffId = req.user.id;

    try {
        const { id } = req.params;
        const { supplierName, supplierPhone, supplierAddress } = req.body;

        const existingSupplier = await prisma.supplier.findUnique({
            where: {
                supplierName
            }
        })

        if (existingSupplier) {
            return res.status(400).json({ message: "Supplier already exists" });
        }

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


module.exports = {
    createSupplier,
    getAllSuppliersDetails,
    getSupplierByIdDetails,
    getAllSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
}