/*
  Warnings:

  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Staff', 'User');

-- CreateEnum
CREATE TYPE "RequestPurchaseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('PENDING', 'PARTIALLY_APPROVED', 'FULLY_APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ItemRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'ON_DELIVERY', 'COMPLETED');

-- CreateEnum
CREATE TYPE "IGRStatus" AS ENUM ('PENDING', 'ITEMS_RECEIVED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signature" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'User';

-- CreateTable
CREATE TABLE "RequestPurchase" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "requestStatus" "RequestPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "RequestPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemRequest" (
    "id" TEXT NOT NULL,
    "itemRequestName" TEXT NOT NULL,
    "itemRequestAmount" INTEGER NOT NULL,
    "itemRequestUseDuration" TEXT NOT NULL,
    "itemRequestStatus" "ItemRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestPurchaseId" TEXT NOT NULL,
    "itemRemarks" TEXT,
    "userId" TEXT,

    CONSTRAINT "ItemRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "idPurchaseOrder" TEXT NOT NULL,
    "purchaseOrderNumber" TEXT NOT NULL,
    "purchaseOrderRemark" TEXT,
    "createdById" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" TEXT NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("idPurchaseOrder")
);

-- CreateTable
CREATE TABLE "POApproval" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signature" TEXT NOT NULL,

    CONSTRAINT "POApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "idPurchaseOrderItem" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "itemRequestId" TEXT,
    "itemName" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" TEXT NOT NULL,
    "totalPrice" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierTotal" TEXT NOT NULL,
    "consignTo" TEXT,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("idPurchaseOrderItem")
);

-- CreateTable
CREATE TABLE "IncomingGoodReceipt" (
    "id" TEXT NOT NULL,
    "igrNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "IGRStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "IncomingGoodReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IGRItem" (
    "id" TEXT NOT NULL,
    "igrId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isReceived" BOOLEAN NOT NULL DEFAULT false,
    "warehouseId" TEXT,

    CONSTRAINT "IGRItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryOrder" (
    "id" TEXT NOT NULL,
    "doNumber" TEXT NOT NULL,
    "requestCode" TEXT,
    "remarks" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "DeliveryOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryOrderItem" (
    "id" TEXT NOT NULL,
    "deliveryOrderId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "warehouseId" TEXT NOT NULL,

    CONSTRAINT "DeliveryOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryOrderApproval" (
    "id" TEXT NOT NULL,
    "deliveryOrderId" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signature" TEXT NOT NULL,

    CONSTRAINT "DeliveryOrderApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "idSupplier" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierPhone" TEXT,
    "supplierAddress" TEXT,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("idSupplier")
);

-- CreateTable
CREATE TABLE "SupplierItem" (
    "idSupplierItem" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "SupplierItem_pkey" PRIMARY KEY ("idSupplierItem")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "idWarehouse" TEXT NOT NULL,
    "warehouseName" TEXT NOT NULL,
    "warehouseAddress" TEXT NOT NULL,
    "warehouseContact" TEXT NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("idWarehouse")
);

-- CreateTable
CREATE TABLE "Item" (
    "idItem" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemCategory" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("idItem")
);

-- CreateTable
CREATE TABLE "WarehouseInventory" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "itemShelfNumber" TEXT,
    "itemShelfBlock" TEXT,

    CONSTRAINT "WarehouseInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "idLocation" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "projectName" TEXT,
    "locationPeriod" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("idLocation")
);

-- CreateTable
CREATE TABLE "ItemHistory" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" "MovementType" NOT NULL,
    "poNumber" TEXT,
    "igrNumber" TEXT,
    "igrId" TEXT,
    "mprNumber" TEXT,
    "doNumber" TEXT,
    "doId" TEXT,
    "locationId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "ItemHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PurchaseOrderToRequestPurchase" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PurchaseOrderToRequestPurchase_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestPurchase_requestCode_key" ON "RequestPurchase"("requestCode");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_purchaseOrderNumber_key" ON "PurchaseOrder"("purchaseOrderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "POApproval_purchaseOrderId_approvedById_key" ON "POApproval"("purchaseOrderId", "approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderItem_itemRequestId_key" ON "PurchaseOrderItem"("itemRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingGoodReceipt_igrNumber_key" ON "IncomingGoodReceipt"("igrNumber");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingGoodReceipt_purchaseOrderId_key" ON "IncomingGoodReceipt"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryOrder_doNumber_key" ON "DeliveryOrder"("doNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryOrderItem_deliveryOrderId_itemCode_warehouseId_key" ON "DeliveryOrderItem"("deliveryOrderId", "itemCode", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryOrderApproval_deliveryOrderId_approvedById_key" ON "DeliveryOrderApproval"("deliveryOrderId", "approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_supplierName_key" ON "Supplier"("supplierName");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierItem_supplierId_itemId_key" ON "SupplierItem"("supplierId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_warehouseName_key" ON "Warehouse"("warehouseName");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseInventory_warehouseId_itemId_key" ON "WarehouseInventory"("warehouseId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_locationPeriod_key" ON "Location"("locationPeriod");

-- CreateIndex
CREATE INDEX "_PurchaseOrderToRequestPurchase_B_index" ON "_PurchaseOrderToRequestPurchase"("B");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "RequestPurchase" ADD CONSTRAINT "RequestPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPurchase" ADD CONSTRAINT "RequestPurchase_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("idLocation") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemRequest" ADD CONSTRAINT "ItemRequest_requestPurchaseId_fkey" FOREIGN KEY ("requestPurchaseId") REFERENCES "RequestPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemRequest" ADD CONSTRAINT "ItemRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POApproval" ADD CONSTRAINT "POApproval_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("idPurchaseOrder") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POApproval" ADD CONSTRAINT "POApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("idPurchaseOrder") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_itemRequestId_fkey" FOREIGN KEY ("itemRequestId") REFERENCES "ItemRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingGoodReceipt" ADD CONSTRAINT "IncomingGoodReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("idPurchaseOrder") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IGRItem" ADD CONSTRAINT "IGRItem_igrId_fkey" FOREIGN KEY ("igrId") REFERENCES "IncomingGoodReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IGRItem" ADD CONSTRAINT "IGRItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("idWarehouse") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_requestCode_fkey" FOREIGN KEY ("requestCode") REFERENCES "RequestPurchase"("requestCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrderItem" ADD CONSTRAINT "DeliveryOrderItem_deliveryOrderId_fkey" FOREIGN KEY ("deliveryOrderId") REFERENCES "DeliveryOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrderItem" ADD CONSTRAINT "DeliveryOrderItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("idWarehouse") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrderApproval" ADD CONSTRAINT "DeliveryOrderApproval_deliveryOrderId_fkey" FOREIGN KEY ("deliveryOrderId") REFERENCES "DeliveryOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrderApproval" ADD CONSTRAINT "DeliveryOrderApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("idSupplier") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("idItem") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseInventory" ADD CONSTRAINT "WarehouseInventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("idWarehouse") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseInventory" ADD CONSTRAINT "WarehouseInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("idItem") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemHistory" ADD CONSTRAINT "ItemHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("idItem") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemHistory" ADD CONSTRAINT "ItemHistory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("idWarehouse") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemHistory" ADD CONSTRAINT "ItemHistory_igrId_fkey" FOREIGN KEY ("igrId") REFERENCES "IncomingGoodReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemHistory" ADD CONSTRAINT "ItemHistory_doId_fkey" FOREIGN KEY ("doId") REFERENCES "DeliveryOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemHistory" ADD CONSTRAINT "ItemHistory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("idLocation") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PurchaseOrderToRequestPurchase" ADD CONSTRAINT "_PurchaseOrderToRequestPurchase_A_fkey" FOREIGN KEY ("A") REFERENCES "PurchaseOrder"("idPurchaseOrder") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PurchaseOrderToRequestPurchase" ADD CONSTRAINT "_PurchaseOrderToRequestPurchase_B_fkey" FOREIGN KEY ("B") REFERENCES "RequestPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
