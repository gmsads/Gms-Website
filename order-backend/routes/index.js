const { Router } = require("express");

const router = Router();

router.use("/designers", require("./designers"));
router.use("/design-requests", require("./designRequests"));

module.exports = router;
