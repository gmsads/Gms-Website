const Order = require("../../models/Order");

const checkClientController = async (req, res) => {
  const { phone } = req.query;
  try {
    const existingClient = await Order.findOne({ phone });
    if (existingClient) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error checking client:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  checkClientController,
};
