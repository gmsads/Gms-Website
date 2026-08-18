// backend/routes/checkClient.js
const { Router } = require("express");
const router = Router();
const { checkClientController } = require("./controllers/check-client");

router.get("/check-client", checkClientController);

module.exports = router;
