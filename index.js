const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");
const warehouseRoutes = require("./routes/warehouseRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const requestPurchaseRoutes = require("./routes/requestPurchaseRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const igrRoutes = require("./routes/igrRoutes");
const doRoutes = require("./routes/doRoutes");
const locationRoutses = require("./routes/locationRoutes");
require("dotenv").config();

const app = express();

app.use(cors());

app.get("/", (req, res) => {
  res.send("server is running");
});

app.use(express.json());
app.use(bodyParser.json());

app.use("/api/auth", authRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/request-purchase", requestPurchaseRoutes);
app.use("/api/purchase-order", purchaseOrderRoutes);
app.use("/api/igr", igrRoutes);
app.use("/api/do", doRoutes);
app.use("/api/location", locationRoutses);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
