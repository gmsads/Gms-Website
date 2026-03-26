const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads - ADDED
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  }
});

// Import all models at the top (only once)
const Executive = require("../models/Executive");
const Admin = require("../models/Admin");
const Designer = require("../models/Designer");
const Account = require("../models/Account");
const ServiceExecutive = require("../models/ServiceExecutive");
const ServiceManager = require("../models/ServiceManager");
const SalesManager = require("../models/SalesManager");
const ItTeam = require("../models/ITTeam");
const DigitalMarketing = require("../models/DigitalMarketing");
const ClientService = require("../models/ClientService");
const Vendor = require("../models/Vendor");
const Order = require("../models/Order");
const FieldExecutive = require("../models/FieldExecutive");
const Unit = require("../models/Unit");
const Agent = require("../models/Agent");
const HR = require("../models/HR");
// At the top with other model imports, add this line:
const VideoEditor = require("../models/VideoEditor");
// ✅ Login route for Executive, Admin, Designer, Account, Service
router.post("/login", async (req, res) => {
  const { name, password } = req.body;

  try {
    console.log(`Login attempt for: ${name}`);

    // Check Service Manager
    const serviceManager = await ServiceManager.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (serviceManager) {
      console.log('Service Manager found:', {
        name: serviceManager.name,
        active: serviceManager.active
      });
      
      if (serviceManager.active === false) {
        console.log('Service Manager is inactive, denying login');
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      
      console.log('Service Manager login successful');
      return res.json({
        success: true,
        role: "Service Manager",
        name: serviceManager.name,
      });
    }

    // Check Account
    const account = await Account.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (account) {
      console.log('Account found:', {
        name: account.name,
        active: account.active
      });
      
      if (account.active === false) {
        console.log('Account is inactive, denying login');
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      
      console.log('Account login successful');
      return res.json({ success: true, role: "Account", name: account.name });
    }

    // Check Service Executive
    const serviceExecutive = await ServiceExecutive.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (serviceExecutive) {
      if (serviceExecutive.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({
        success: true,
        role: "Service Executive",
        name: serviceExecutive.name,
      });
    }

    // Check IT Team
    const itStaff = await ItTeam.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (itStaff) {
      if (itStaff.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({
        success: true,
        role: "IT",
        name: itStaff.name,
      });
    }

    // Check Sales Manager
    const salesManager = await SalesManager.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (salesManager) {
      if (salesManager.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({
        success: true,
        role: "Sales Manager",
        name: salesManager.name,
      });
    }

    // Check Digital Marketing
    const digitalMarketing = await DigitalMarketing.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (digitalMarketing) {
      if (digitalMarketing.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({
        success: true,
        role: "Digital Marketing",
        name: digitalMarketing.name,
      });
    }

    // Check Agent
    const agent = await Agent.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (agent) {
      if (agent.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({
        success: true,
        role: "Agent",
        name: agent.name,
      });
    }

    // Check HR
    const hr = await HR.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (hr) {
      if (hr.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({
        success: true,
        role: "HR",
        name: hr.name,
      });
    }
 const videoEditor = await VideoEditor.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (videoEditor) {
      if (videoEditor.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({
        success: true,
        role: "Video Editor",
        name: videoEditor.name,
      });
    }

    // Check Client service
    const clientService = await ClientService.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (clientService) {
      if (clientService.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({
        success: true,
        role: "Client service",
        name: clientService.name,
      });
    }

    // Check Executive - THIS IS THE FIXED PART WITH .lean()
    const executive = await Executive.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean(); // ← ADD .lean() HERE
    
    if (executive) {
      if (executive.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({
        success: true,
        role: "Executive",
        name: executive.name,
      });
    }

    // Check Admin
    const admin = await Admin.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (admin) {
      if (admin.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({ success: true, role: "Admin", name: admin.name });
    }

    // Check Designer
    const designer = await Designer.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (designer) {
      if (designer.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({ success: true, role: "Designer", name: designer.name });
    }

    // Check Vendor
    const vendor = await Vendor.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (vendor) {
      if (vendor.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({
        success: true,
        role: "Vendor",
        name: vendor.name
      });
    }

    // Check Field Executive
    const fieldExecutive = await FieldExecutive.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (fieldExecutive) {
      if (fieldExecutive.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({
        success: true,
        role: "FieldExecutive",
        name: fieldExecutive.name,
      });
    }

    // Check Unit
    const unitEmployee = await Unit.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { username: new RegExp(`^${name.trim()}$`, "i") }
      ],
      password: password.trim()
    }).lean();
    
    if (unitEmployee) {
      if (unitEmployee.active === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is inactive. Please contact administrator." 
        });
      }
      return res.json({
        success: true,
        role: "Unit",
        name: unitEmployee.name,
      });
    }

    return res
      .status(401)
      .json({ success: false, message: "Name or Password is Incorrect" });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});
// ✅ Route to add Video Editor - ADD THIS ROUTE
router.post("/add-video-editor", async (req, res) => {
  const {
    username,
    name,
    phone,
    password,
    email,
    guardianName,
    guardianContact,
    aadhar,
    joiningDate,
    experience,
    active
  } = req.body;

  try {
    const existing = await VideoEditor.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newVideoEditor = new VideoEditor({
      username,
      name,
      password,
      phone,
      email,
      guardianName,
      guardianContact,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newVideoEditor.save();
    res.status(201).json({ message: "Video Editor added successfully" });
  } catch (err) {
    console.error("Error saving Video Editor:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// ✅ Route to add an Executive (with username)
router.post("/add-executive", async (req, res) => {
  const { username, name, password, phone, email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active } = req.body;

  try {
    // Check if executive exists by username OR name
    const existing = await Executive.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newExecutive = new Executive({
      username, name, password, phone, email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false // Default to true if not specified
    });
    await newExecutive.save();
    res.status(201).json({ message: "Executive added successfully" });
  } catch (err) {
    console.error("Error saving executive:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route to add Vendor (with username)
router.post("/add-vendor", async (req, res) => {
  const {
    username,
    name,
    phone,
    password,
    email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active
  } = req.body;

  try {
    const existing = await Vendor.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newVendor = new Vendor({
      username,
      name,
      password,
      phone,
      email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newVendor.save();
    res.status(201).json({ message: "Vendor added successfully" });
  } catch (err) {
    console.error("Error saving Vendor:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route to add an Admin (with username)
router.post("/add-admin", async (req, res) => {
  const { username, name, password, phone, email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active } = req.body;

  try {
    const existing = await Admin.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newAdmin = new Admin({
      username, name, password, phone, email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newAdmin.save();
    res.status(201).json({ message: "Admin added successfully" });
  } catch (err) {
    console.error("Error saving admin:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route to add a Designer (with username)
router.post("/add-designer", async (req, res) => {
  const { username, name, password, phone, email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active } = req.body;

  try {
    const existing = await Designer.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newUser = new Designer({
      username, name, password, phone, email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newUser.save();
    res.status(201).json({ message: "Designer added successfully" });
  } catch (err) {
    console.error("Error saving designer:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route to add HR
router.post("/add-hr", async (req, res) => {
  const {
    username,
    name,
    phone,
    password,
    email,
    guardianName,
    guardianContact,
    aadhar,
    joiningDate,
    experience,
    active
  } = req.body;

  try {
    const existing = await HR.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newHR = new HR({
      username,
      name,
      password,
      phone,
      email,
      guardianName,
      guardianContact,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newHR.save();
    res.status(201).json({ message: "HR added successfully" });
  } catch (err) {
    console.error("Error saving HR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route to add an Account (with username)
router.post("/add-account", async (req, res) => {
  const { username, name, password, phone, email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active } = req.body;

  try {
    const existing = await Account.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newUser = new Account({
      username, name, password, phone, email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newUser.save();
    res.status(201).json({ message: "Account user added successfully" });
  } catch (err) {
    console.error("Error saving account user:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route to add Service Executive (with username)
router.post("/add-service-executive", async (req, res) => {
  const { username, name, password, phone, email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active } = req.body;

  try {
    const existing = await ServiceExecutive.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newUser = new ServiceExecutive({
      username, name, password, phone, email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newUser.save();
    res.status(201).json({ message: "Service Executive added successfully" });
  } catch (err) {
    console.error("Error saving Service Executive:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route to add Service Manager (with username)
router.post("/add-service-manager", async (req, res) => {
  const { 
    username, 
    name, 
    password, 
    phone, 
    email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    resignationDate,
    resignationReason,
    rejoinDate,
    active 
  } = req.body;

  try {
    const existing = await ServiceManager.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newUser = new ServiceManager({
      username, 
      name, 
      password, 
      phone, 
      email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      resignationDate,
      resignationReason,
      rejoinDate,
      active: active !== false
    });
    await newUser.save();
    res.status(201).json({ message: "Service Manager added successfully" });
  } catch (err) {
    console.error("Error saving Service Manager:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route to add Sales Manager (with username)
router.post("/add-sales-manager", async (req, res) => {
  const { username, name, password, phone, email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active } = req.body;

  try {
    const existing = await SalesManager.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newUser = new SalesManager({
      username, name, password, phone, email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newUser.save();
    res.status(201).json({ message: "Sales Manager added successfully" });
  } catch (err) {
    console.error("Error saving Sales Manager:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route to add IT Team (with username)
router.post("/add-it-team", async (req, res) => {
  const {
    username,
    name,
    phone,
    password,
    email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active
  } = req.body;

  try {
    const existing = await ItTeam.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newUser = new ItTeam({
      username,
      name,
      password,
      phone,
      email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newUser.save();
    res.status(201).json({ message: "IT Team member added successfully" });
  } catch (err) {
    console.error("Error saving IT Team user:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route to add Digital Marketing (with username)
router.post("/add-digital-marketing", async (req, res) => {
  const { username, name, password, phone, email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active } = req.body;

  try {
    const existing = await DigitalMarketing.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newUser = new DigitalMarketing({
      username, name, password, phone, email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newUser.save();
    res
      .status(201)
      .json({ message: "Digital Marketing user added successfully" });
  } catch (err) {
    console.error("Error saving Digital Marketing user:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route to add a clientservice (fixed version)
router.post("/add-clientservice", async (req, res) => {
  const { username, name, password, phone, email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active } = req.body;

  try {
    const existing = await ClientService.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newUser = new ClientService({
      username, name, password, phone, email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newUser.save();
    res.status(201).json({ message: "Client Service user added successfully" });
  } catch (err) {
    console.error("Error saving Client Service user:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET executive dashboard data
router.get("/executive-dashboard-data", async (req, res) => {
  try {
    const { executiveName, month, year } = req.query;

    if (!executiveName) {
      return res.status(400).json({ error: "Executive name is required" });
    }

    // Build date range if month and year are provided
    let startDate = null;
    let endDate = null;
    if (month && year) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 1);
    }

    // Filter orders by executive
    const query = { executive: executiveName };
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lt: endDate };
    }

    const orders = await Order.find(query);

    // Achieved orders
    const achieved = orders.length;

    // Total target (assuming each order is 1 point, or use your own logic)
    const target = 20; // Replace with actual monthly target logic if needed

    // Pending Payments
    const pendingPayments = orders.filter((order) => order.balance > 0).length;

    // Pending Services
    const pendingServices = orders.reduce((count, order) => {
      order.rows.forEach((row) => {
        if (!row.isCompleted) count++;
      });
      return count;
    }, 0);

    res.json({
      executive: executiveName,
      target,
      achieved,
      pendingPayments,
      pendingServices,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// Get all employees - ensure all categories are properly included
router.get("/employees", async (req, res) => {
  try {
    const [
      executives,
      admins,
      designers,
      accounts,
      serviceExecutives,
      serviceManagers,
      salesManagers,
      itTeams,
      digitalMarketings,
      clientServices,
      units,
      fieldExecutives,
      agents,
      vendors,
      hrs,
      videoEditors
    ] = await Promise.all([
      Executive.find({}).lean(),
      Admin.find({}).lean(),
      Designer.find({}).lean(),
      Account.find({}).lean(),
      ServiceExecutive.find({}).lean(),
      ServiceManager.find({}).lean(),
      SalesManager.find({}).lean(),
      ItTeam.find({}).lean(),
      DigitalMarketing.find({}).lean(),
      ClientService.find({}).lean(),
      Unit.find({}).lean(),
      FieldExecutive.find({}).lean(),
      Agent.find({}).lean(),
      Vendor.find({}).lean(),
      HR.find({}).lean(),
      VideoEditor.find({}).lean()
    ]);

    const employeeCategories = {
      Executive: executives,
      Admin: admins,
      Designer: designers,
      Account: accounts,
      ServiceExecutive: serviceExecutives,
      ServiceManager: serviceManagers,
      SalesManager: salesManagers,
      ITTeam: itTeams,
      DigitalMarketing: digitalMarketings,
      ClientService: clientServices,
      Unit: units,
      FieldExecutive: fieldExecutives,
      Agent: agents,
      Vendor: vendors,
      HR: hrs,
      "Graphic Designer": videoEditors  // Display name changed
    };

    res.json(employeeCategories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get user profile
router.get("/user-profile", async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).send("Name is required");

    const collections = [
      { model: Executive, name: "Executive" },
      { model: Admin, name: "Admin" },
      { model: Designer, name: "Designer" },
      { model: Account, name: "Account" },
      { model: ServiceExecutive, name: "ServiceExecutive" },
      { model: ServiceManager, name: "ServiceManager" },
      { model: SalesManager, name: "SalesManager" },
      { model: ItTeam, name: "ITTeam" },
      { model: DigitalMarketing, name: "DigitalMarketing" },
      { model: ClientService, name: "ClientService" },
      { model: Unit, name: "Unit" },
      { model: FieldExecutive, name: "FieldExecutive" },
      { model: Agent, name: "Agent" },
      { model: Vendor, name: "Vendor" },
      { model: HR, name: "HR" },
        { model: VideoEditor, name: "VideoEditor" }  // ADD VIDEO EDITOR
    ];

    let user = null;
    let role = "";

    for (const { model, name: roleName } of collections) {
      user = await model.findOne({ 
        $or: [
          { name: new RegExp(`^${name.trim()}$`, "i") },
          { username: new RegExp(`^${name.trim()}$`, "i") }
        ]
      });
      if (user) {
        role = roleName;
        break;
      }
    }

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.json({
      name: user.name,
      phone: user.phone,
      active: user.active !== false,
      role,
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).send("Server error");
  }
});

// Update profile
router.put("/update-profile", async (req, res) => {
  try {
    const { name, updates } = req.body;

    if (!name || !updates) {
      return res.status(400).json({
        success: false,
        message: "Name and updates are required",
      });
    }

    const collections = {
      Executive,
      Admin,
      Designer,
      Account,
      ServiceExecutive,
      ServiceManager,
      SalesManager,
      ItTeam,
      DigitalMarketing,
      ClientService,
      Unit,
      FieldExecutive,
      Agent,
      Vendor,
      HR,
      VideoEditor  // ADD VIDEO EDITOR
    };

    // Find current user
    let currentModel = null;
    let currentUser = null;

    for (const [modelName, Model] of Object.entries(collections)) {
      currentUser = await Model.findOne({ 
        $or: [
          { name: new RegExp(`^${name.trim()}$`, "i") },
          { username: new RegExp(`^${name.trim()}$`, "i") }
        ]
      });
      if (currentUser) {
        currentModel = Model;
        console.log(`Found user in ${modelName}:`, {
          name: currentUser.name,
          currentActive: currentUser.active
        });
        break;
      }
    }

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Handle role change
    if (updates.role && updates.role !== currentModel.modelName) {
      const NewModel = collections[updates.role];
      if (!NewModel) {
        return res.status(400).json({
          success: false,
          message: "Invalid role specified",
        });
      }

      // Check for existing user in new role
      const existingUser = await NewModel.findOne({ 
        $or: [
          { name: new RegExp(`^${currentUser.name.trim()}$`, "i") },
          { username: new RegExp(`^${currentUser.username?.trim()}$`, "i") }
        ]
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists in the new role",
        });
      }

      // Create new user in target collection
      const newUser = new NewModel({
        username: currentUser.username,
        name: currentUser.name,
        phone: updates.phone || currentUser.phone,
        active: updates.active === true || updates.active === 'true' ? true : false,
        password: currentUser.password,
        email: currentUser.email,
        guardianName: currentUser.guardianName,
        aadhar: currentUser.aadhar,
        joiningDate: currentUser.joiningDate,
        experience: currentUser.experience
      });

      await newUser.save();
      await currentModel.deleteOne({ _id: currentUser._id });

      console.log(`User moved to ${updates.role} with active:`, newUser.active);

      return res.json({
        success: true,
        message: "Profile and role updated successfully",
        data: {
          name: newUser.name,
          phone: newUser.phone,
          active: newUser.active,
          role: updates.role,
        },
      });
    }

    // Regular update - ensure active is properly handled
    const updateData = {
      ...updates,
      active: updates.active === true || updates.active === 'true' ? true : false,
    };

    console.log('Updating user with data:', updateData);

    const updatedUser = await currentModel.findOneAndUpdate(
      { _id: currentUser._id },
      { $set: updateData },
      { new: true }
    );

    console.log('User updated, new active status:', updatedUser.active);

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        name: updatedUser.name,
        phone: updatedUser.phone,
        active: updatedUser.active,
        role: currentModel.modelName,
      },
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during update",
      error: err.message,
    });
  }
});

// Add route to create Unit employees
router.post("/add-unit", async (req, res) => {
  const {
    username,
    name,
    phone,
    password,
    email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active
  } = req.body;

  try {
    const existing = await Unit.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newUnit = new Unit({
      username,
      name,
      password,
      phone,
      email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newUnit.save();
    res.status(201).json({ message: "Unit employee added successfully" });
  } catch (err) {
    console.error("Error saving Unit employee:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route to add Agent (with username)
router.post("/add-agent", async (req, res) => {
  const {
    username,
    name,
    phone,
    password,
    email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active
  } = req.body;

  try {
    const existing = await Agent.findOne({
      $or: [{ username }, { name }],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    const newAgent = new Agent({
      username,
      name,
      password,
      phone,
      email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false
    });
    await newAgent.save();
    res.status(201).json({ message: "Agent added successfully" });
  } catch (err) {
    console.error("Error saving Agent:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update the route to use multer middleware
router.post("/add-field-executive", upload.single('image'), async (req, res) => {
  const {
    username,
    name,
    password,
    phone,
    email,
    guardianName,
    aadhar,
    joiningDate,
    experience,
    active
  } = req.body;

  try {
    // Check if username or name already exists
    const existing = await FieldExecutive.findOne({
      $or: [{ username }, { name }],
    });

    if (existing) {
      return res.status(400).json({
        error:
          existing.username === username
            ? "Username already exists"
            : "Name already exists",
      });
    }

    // Create new Field Executive with image path if available
    const newExec = new FieldExecutive({
      username,
      name,
      password,
      phone,
      email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      active: active !== false,
      image: req.file ? req.file.filename : null
    });

    await newExec.save();
    res.status(201).json({ message: "Field Executive added successfully" });
  } catch (err) {
    console.error("Error saving Field Executive:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// Get all Unit employees
router.get("/units", async (req, res) => {
  try {
    const units = await Unit.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: units,
      count: units.length
    });
  } catch (err) {
    console.error("Error fetching Unit employees:", err);
    res.status(500).json({ 
      success: false,
      error: "Server error while fetching units" 
    });
  }
});

// Debug route to check Service Manager
router.get("/debug/service-manager/:name", async (req, res) => {
  try {
    const { name } = req.params;
    
    const serviceManager = await ServiceManager.findOne({
      $or: [
        { name: new RegExp(`^${name}$`, "i") },
        { username: new RegExp(`^${name}$`, "i") }
      ]
    });
    
    if (!serviceManager) {
      return res.json({ found: false });
    }
    
    res.json({
      found: true,
      name: serviceManager.name,
      username: serviceManager.username,
      active: serviceManager.active,
      activeType: typeof serviceManager.active,
      activeValue: serviceManager.active,
      hasActiveField: serviceManager.hasOwnProperty('active'),
      allFields: Object.keys(serviceManager._doc)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;