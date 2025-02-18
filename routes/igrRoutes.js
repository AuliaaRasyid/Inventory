const express = require('express');
const router = express.Router();
const { 
    approveIGR,
    getIGRList,
    getIGRDetails,
    deleteIGR
} = require('../Controller/igrController');

const { authenticateUser, authorizeRoles } = require("../Middleware/authenticate");


router.post(
    '/approve/:igrId',
    authenticateUser,
    authorizeRoles('Admin', 'Staff'),
    approveIGR
);

router.get('/get-all',
    authenticateUser,
    authorizeRoles('Admin', 'Staff'),
    getIGRList
);
router.get('/get-igr/:igrId',
    authenticateUser,
    authorizeRoles('Admin', 'Staff'),
    getIGRDetails
);

router.delete('/delete/:igrId',
    authenticateUser,
    authorizeRoles('Admin', 'Staff'),
    deleteIGR
);

module.exports = router;