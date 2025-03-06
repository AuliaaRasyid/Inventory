const express = require('express');
const router = express.Router();
const { createDeliveryOrder,
    approveDeliveryOrder,
    getAllDeliveryOrders,
    getDeliveryOrderDetails,
    editDeliveryOrder,
    deleteDeliveryOrder,
    rejectDeliveryOrder
} = require('../Controller/doController');

const { authenticateUser, authorizeRoles } = require("../Middleware/authenticate");

router.post('/create',
    authenticateUser,
    authorizeRoles('Admin', 'Staff'),
    createDeliveryOrder
);

router.post(
    '/approve/:deliveryOrderId',
    authenticateUser,
    authorizeRoles('Admin', 'Staff'),
    approveDeliveryOrder
);

router.get(
    '/get-all',
    authenticateUser,
    authorizeRoles('Admin', 'Staff'),
    getAllDeliveryOrders
)

router.get(
    '/get-details/:id',
    authenticateUser,
    authorizeRoles('Admin', 'Staff'),
    getDeliveryOrderDetails
)

router.put(
    '/update/:id',
    authenticateUser,
    authorizeRoles('Admin', 'Staff'),
    editDeliveryOrder
)

router.delete(
    '/delete/:id',
    authenticateUser,
    authorizeRoles('Admin', 'Staff'),
    deleteDeliveryOrder
)

router.post(
    '/reject/:deliveryOrderId',
    authenticateUser,
    authorizeRoles('Admin', 'Staff'),
    rejectDeliveryOrder
)

module.exports = router;