const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');

// Import all models
const Executive = require('../models/Executive');
const Admin = require('../models/Admin');
const Designer = require('../models/Designer');
const Account = require('../models/Account');
const ServiceExecutive = require('../models/ServiceExecutive');
const ServiceManager = require('../models/ServiceManager');
const SalesManager = require('../models/SalesManager');
const ITTeam = require('../models/ITTeam');
const DigitalMarketing = require('../models/DigitalMarketing');
const ClientService = require('../models/ClientService');
const HR = require('../models/HR');
const Vendor = require('../models/Vendor');
const Agent = require('../models/Agent');
const FieldExecutive = require('../models/FieldExecutive');
const Unit = require('../models/Unit');
const VideoEditor = require('../models/VideoEditor');

// Map of role to model
const modelMap = {
  'Executive': Executive,
  'Admin': Admin,
  'Designer': Designer,
  'Account': Account,
  'ServiceExecutive': ServiceExecutive,
  'ServiceManager': ServiceManager,
  'SalesManager': SalesManager,
  'ITTeam': ITTeam,
  'DigitalMarketing': DigitalMarketing,
  'ClientService': ClientService,
  'HR': HR,
  'Vendor': Vendor,
  'Agent': Agent,
  'FieldExecutive': FieldExecutive,
  'Unit': Unit,
  'VideoEditor': VideoEditor
};

console.log('📦 Models loaded in employees route:', Object.keys(modelMap));

// Configure Cloudinary storage for documents
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employee-documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type: 'auto',
  },
});

// Configure Cloudinary storage for profile images
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employee-profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'limit' }],
    resource_type: 'auto',
  },
});

const uploadDocuments = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ==================== GET EMPLOYEE DOCUMENTS ====================
router.get('/documents/:name', async (req, res) => {
  try {
    const { name } = req.params;
    console.log(`🔍 Fetching documents for employee: ${decodeURIComponent(name)}`);

    let foundEmployee = null;
    let foundRole = null;

    // Search in all models
    for (const [roleName, model] of Object.entries(modelMap)) {
      try {
        let emp = await model.findOne({
          name: { $regex: new RegExp('^' + decodeURIComponent(name) + '$', 'i') }
        });
        
        if (!emp) {
          emp = await model.findOne({
            name: decodeURIComponent(name)
          });
        }
        
        if (!emp) {
          emp = await model.findOne({
            username: { $regex: new RegExp('^' + decodeURIComponent(name) + '$', 'i') }
          });
        }

        if (emp) {
          foundEmployee = emp;
          foundRole = roleName;
          console.log(`✅ Found employee in model: ${roleName}`);
          break;
        }
      } catch (err) {
        console.error(`Error searching in ${roleName}:`, err.message);
      }
    }

    if (!foundEmployee) {
      console.error('❌ Employee not found with name:', name);
      return res.status(404).json({
        success: false,
        message: `Employee not found with name: ${name}`
      });
    }

    // Get role-specific document requirements
    const roleDocumentRequirements = {
      'Executive': ['aadhar', 'pan', 'educational', 'experience'],
      'Admin': ['aadhar', 'pan', 'educational'],
      'Designer': ['aadhar', 'pan', 'educational', 'portfolio'],
      'Account': ['aadhar', 'pan', 'educational', 'certification'],
      'ServiceExecutive': ['aadhar', 'pan', 'educational', 'drivingLicense'],
      'ServiceManager': ['aadhar', 'pan', 'educational', 'experience'],
      'SalesManager': ['aadhar', 'pan', 'educational'],
      'ITTeam': ['aadhar', 'pan', 'educational', 'certification'],
      'DigitalMarketing': ['aadhar', 'pan', 'educational', 'portfolio'],
      'ClientService': ['aadhar', 'pan', 'educational'],
      'HR': ['aadhar', 'pan', 'educational', 'certification'],
      'Vendor': ['aadhar', 'pan', 'gstCertificate'],
      'Agent': ['aadhar', 'pan'],
      'FieldExecutive': ['aadhar', 'pan', 'drivingLicense'],
      'Unit': ['aadhar', 'pan', 'educational'],
      'VideoEditor': ['aadhar', 'pan', 'educational', 'portfolio']
    };

    const requiredDocs = roleDocumentRequirements[foundRole] || ['aadhar', 'pan'];
    const documents = foundEmployee.documents || {};

    const ensureDocumentStructure = (doc) => {
      if (!doc) return { files: [] };
      if (typeof doc === 'string') return { files: [] };
      if (doc.files && Array.isArray(doc.files)) return doc;
      return { files: [] };
    };

    // Handle custom documents
    let customDocsObject = {};
    
    if (documents.customDocuments) {
      if (documents.customDocuments instanceof Map) {
        documents.customDocuments.forEach((value, key) => {
          if (value && typeof value === 'object') {
            if (value.files && Array.isArray(value.files)) {
              customDocsObject[key] = {
                files: value.files.map(file => ({
                  url: file.url || '',
                  cloudinaryId: file.cloudinaryId || '',
                  filename: file.filename || '',
                  notes: file.notes || key,
                  uploadedAt: file.uploadedAt || new Date()
                }))
              };
            } else {
              customDocsObject[key] = { files: [] };
            }
          } else {
            customDocsObject[key] = { files: [] };
          }
        });
      } else if (typeof documents.customDocuments === 'object' && documents.customDocuments !== null) {
        Object.entries(documents.customDocuments).forEach(([key, value]) => {
          if (value && typeof value === 'object') {
            if (value.files && Array.isArray(value.files)) {
              customDocsObject[key] = {
                files: value.files.map(file => ({
                  url: file.url || '',
                  cloudinaryId: file.cloudinaryId || '',
                  filename: file.filename || '',
                  notes: file.notes || key,
                  uploadedAt: file.uploadedAt || new Date()
                }))
              };
            } else {
              customDocsObject[key] = { files: [] };
            }
          } else {
            customDocsObject[key] = { files: [] };
          }
        });
      }
    }

    const documentsForResponse = {
      aadhar: ensureDocumentStructure(documents.aadhar),
      pan: ensureDocumentStructure(documents.pan),
      educational: ensureDocumentStructure(documents.educational),
      experience: ensureDocumentStructure(documents.experience),
      customDocuments: customDocsObject
    };

    res.json({
      success: true,
      documents: documentsForResponse,
      requiredDocuments: requiredDocs,
      role: foundRole
    });

  } catch (error) {
    console.error('❌ Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ==================== UPDATE EMPLOYEE PROFILE WITH IMAGE ====================
router.put('/update-profile', uploadProfile.single('image'), async (req, res) => {
  try {
    console.log('========== UPDATE PROFILE REQUEST ==========');
    console.log('Request body:', req.body);
    console.log('File received:', req.file ? req.file.originalname : 'No file');
    
    let { name, username, phone, email, guardianName, guardianContact, aadhar, joiningDate, experience, role, active, rejoinDate, resignationDate, resignationReason } = req.body;
    
    const isActive = active === 'true' || active === true;
    
    console.log(`Updating employee: ${name}, Role: ${role}, Active: ${isActive}`);
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Employee name is required'
      });
    }
    
    // Find the employee
    let foundEmployee = null;
    let Model = null;
    let foundRole = null;
    
    if (role && modelMap[role]) {
      try {
        foundEmployee = await modelMap[role].findOne({ name: name });
        if (foundEmployee) {
          Model = modelMap[role];
          foundRole = role;
          console.log(`✅ Found employee in specified model: ${role}`);
        }
      } catch (err) {
        console.error(`Error searching in ${role}:`, err.message);
      }
    }
    
    if (!foundEmployee) {
      for (const [roleName, model] of Object.entries(modelMap)) {
        try {
          let emp = await model.findOne({ name: name });
          if (!emp) {
            emp = await model.findOne({
              name: { $regex: new RegExp('^' + name + '$', 'i') }
            });
          }
          if (emp) {
            foundEmployee = emp;
            Model = model;
            foundRole = roleName;
            console.log(`✅ Found employee in model: ${roleName}`);
            break;
          }
        } catch (err) {
          console.error(`Error searching in ${roleName}:`, err.message);
        }
      }
    }
    
    if (!foundEmployee) {
      console.error('❌ Employee not found with name:', name);
      return res.status(404).json({
        success: false,
        message: `Employee not found with name: ${name}`
      });
    }
    
    // Prepare update object
    const updateData = {
      username: username || foundEmployee.username,
      phone: phone || foundEmployee.phone,
      email: email || foundEmployee.email,
      guardianName: guardianName || foundEmployee.guardianName,
      guardianContact: guardianContact || foundEmployee.guardianContact,
      aadhar: aadhar || foundEmployee.aadhar,
      joiningDate: joiningDate || foundEmployee.joiningDate,
      experience: experience || foundEmployee.experience,
      active: isActive,
      rejoinDate: rejoinDate || foundEmployee.rejoinDate,
      resignationDate: resignationDate || foundEmployee.resignationDate,
      resignationReason: resignationReason || foundEmployee.resignationReason
    };
    
    // Handle image upload
    if (req.file) {
      if (foundEmployee.cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(foundEmployee.cloudinaryId);
          console.log(`Deleted old image: ${foundEmployee.cloudinaryId}`);
        } catch (cloudinaryError) {
          console.error('Cloudinary delete error:', cloudinaryError);
        }
      }
      
      updateData.imageUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }
    
    // Remove undefined/empty fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key];
      }
    });
    
    console.log('Update data:', updateData);
    
    const updatedEmployee = await Model.findOneAndUpdate(
      { _id: foundEmployee._id },
      { $set: updateData },
      { new: true }
    );
    
    console.log('✅ Employee updated successfully');
    
    res.json({
      success: true,
      message: 'Employee profile updated successfully',
      employee: {
        name: updatedEmployee.name,
        username: updatedEmployee.username,
        phone: updatedEmployee.phone,
        email: updatedEmployee.email,
        imageUrl: updatedEmployee.imageUrl,
        active: updatedEmployee.active,
        role: foundRole
      }
    });
    
  } catch (error) {
    console.error('========== UPDATE PROFILE ERROR ==========');
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update employee profile',
      error: error.message
    });
  }
});

// ==================== UPLOAD DOCUMENTS ====================
router.post('/upload-documents', (req, res) => {
  uploadDocuments.fields([
    { name: 'aadhar_front', maxCount: 1 },
    { name: 'aadhar_back', maxCount: 1 },
    { name: 'pan_front', maxCount: 1 },
    { name: 'pan_back', maxCount: 1 },
    { name: 'educational', maxCount: 10 },
    { name: 'experience', maxCount: 10 },
    { name: 'customDocument', maxCount: 20 }
  ])(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          error: err.message
        });
      }

      console.log('========== DOCUMENT UPLOAD START ==========');
      const { name, documentNotes, customDocName } = req.body;
      const employeeName = name ? name.trim() : '';

      console.log(`Searching for employee: "${employeeName}"`);

      if (!employeeName) {
        return res.status(400).json({
          success: false,
          message: 'Employee name is required'
        });
      }

      let foundEmployee = null;
      let Model = null;
      let foundRole = null;

      // Search in Executive model first
      console.log('🔍 Searching in Executive model...');
      
      let exec = await Executive.findOne({
        name: { $regex: new RegExp('^' + escapeRegex(employeeName) + '$', 'i') }
      });
      
      if (!exec) {
        exec = await Executive.findOne({
          name: { $regex: new RegExp(escapeRegex(employeeName), 'i') }
        });
      }
      
      if (!exec) {
        exec = await Executive.findOne({
          username: { $regex: new RegExp(escapeRegex(employeeName), 'i') }
        });
      }
      
      if (exec) {
        foundEmployee = exec;
        Model = Executive;
        foundRole = 'Executive';
        console.log(`✅ Found employee in Executive model: "${exec.name}"`);
      }
      
      // If not found, search other models
      if (!foundEmployee) {
        for (const [roleName, model] of Object.entries(modelMap)) {
          if (roleName === 'Executive') continue;
          
          try {
            let emp = await model.findOne({
              name: { $regex: new RegExp('^' + escapeRegex(employeeName) + '$', 'i') }
            });
            
            if (!emp) {
              emp = await model.findOne({
                name: { $regex: new RegExp(escapeRegex(employeeName), 'i') }
              });
            }
            
            if (emp) {
              foundEmployee = emp;
              Model = model;
              foundRole = roleName;
              console.log(`✅ Found employee in model: ${roleName}`);
              break;
            }
          } catch (modelError) {
            console.error(`Error searching in ${roleName}:`, modelError.message);
          }
        }
      }

      if (!foundEmployee) {
        console.error('❌ Employee not found with name:', employeeName);
        return res.status(404).json({
          success: false,
          message: `Employee not found with name: "${employeeName}"`
        });
      }

      // Helper function to convert old string documents to new structure
      const convertToDocumentStructure = (doc) => {
        if (!doc) return { files: [] };
        if (typeof doc === 'string') {
          // Convert old string URL to new structure
          return {
            files: [{
              url: doc,
              cloudinaryId: doc.split('/').pop().split('.')[0],
              filename: 'Document',
              notes: 'Legacy document',
              uploadedAt: new Date()
            }]
          };
        }
        if (doc.files && Array.isArray(doc.files)) return doc;
        return { files: [] };
      };

      // Initialize documents with conversion of old string data
      let documents = foundEmployee.documents || {};
      
      // Convert old string documents to new structure
      documents.aadhar = convertToDocumentStructure(documents.aadhar);
      documents.pan = convertToDocumentStructure(documents.pan);
      documents.educational = convertToDocumentStructure(documents.educational);
      documents.experience = convertToDocumentStructure(documents.experience);

      // Initialize custom documents as Map if needed
      if (!documents.customDocuments) {
        documents.customDocuments = new Map();
      } else if (!(documents.customDocuments instanceof Map)) {
        try {
          const oldDocs = documents.customDocuments;
          documents.customDocuments = new Map();
          if (typeof oldDocs === 'object' && oldDocs !== null) {
            Object.entries(oldDocs).forEach(([key, value]) => {
              documents.customDocuments.set(key, convertToDocumentStructure(value));
            });
          }
        } catch (e) {
          documents.customDocuments = new Map();
        }
      }

      // Process uploaded files
      if (req.files && req.files.aadhar_front) {
        req.files.aadhar_front.forEach(file => {
          documents.aadhar.files.push({
            url: file.path,
            cloudinaryId: file.filename,
            filename: file.originalname,
            notes: documentNotes || 'Aadhar Front',
            uploadedAt: new Date()
          });
        });
      }

      if (req.files && req.files.aadhar_back) {
        req.files.aadhar_back.forEach(file => {
          documents.aadhar.files.push({
            url: file.path,
            cloudinaryId: file.filename,
            filename: file.originalname,
            notes: documentNotes || 'Aadhar Back',
            uploadedAt: new Date()
          });
        });
      }

      if (req.files && req.files.pan_front) {
        req.files.pan_front.forEach(file => {
          documents.pan.files.push({
            url: file.path,
            cloudinaryId: file.filename,
            filename: file.originalname,
            notes: documentNotes || 'PAN Front',
            uploadedAt: new Date()
          });
        });
      }

      if (req.files && req.files.pan_back) {
        req.files.pan_back.forEach(file => {
          documents.pan.files.push({
            url: file.path,
            cloudinaryId: file.filename,
            filename: file.originalname,
            notes: documentNotes || 'PAN Back',
            uploadedAt: new Date()
          });
        });
      }

      if (req.files && req.files.educational) {
        req.files.educational.forEach((file, index) => {
          documents.educational.files.push({
            url: file.path,
            cloudinaryId: file.filename,
            filename: file.originalname,
            notes: documentNotes || `Educational Document ${index + 1}`,
            uploadedAt: new Date()
          });
        });
      }

      if (req.files && req.files.experience) {
        req.files.experience.forEach((file, index) => {
          documents.experience.files.push({
            url: file.path,
            cloudinaryId: file.filename,
            filename: file.originalname,
            notes: documentNotes || `Experience Document ${index + 1}`,
            uploadedAt: new Date()
          });
        });
      }

      if (req.files && req.files.customDocument && customDocName) {
        let customDocType = documents.customDocuments.get(customDocName);
        if (!customDocType) {
          customDocType = { files: [] };
          documents.customDocuments.set(customDocName, customDocType);
        }
        if (!customDocType.files) customDocType.files = [];

        req.files.customDocument.forEach((file, index) => {
          customDocType.files.push({
            url: file.path,
            cloudinaryId: file.filename,
            filename: file.originalname,
            notes: documentNotes || `${customDocName} ${index + 1}`,
            uploadedAt: new Date()
          });
        });
      }

      // Save the updated documents
      await Model.findOneAndUpdate(
        { _id: foundEmployee._id },
        { $set: { documents: documents } },
        { new: true }
      );

      console.log(`✅ Documents uploaded successfully for ${foundEmployee.name}`);
      console.log(`   Total files uploaded: ${Object.values(req.files || {}).reduce((sum, files) => sum + files.length, 0)}`);

      // Prepare response
      const customDocsObject = {};
      if (documents.customDocuments instanceof Map) {
        documents.customDocuments.forEach((value, key) => {
          customDocsObject[key] = value;
        });
      }

      return res.json({
        success: true,
        message: 'Documents uploaded successfully',
        documents: {
          aadhar: documents.aadhar,
          pan: documents.pan,
          educational: documents.educational,
          experience: documents.experience,
          customDocuments: customDocsObject
        }
      });

    } catch (error) {
      console.error('========== DOCUMENT UPLOAD ERROR ==========');
      console.error(error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload documents',
        error: error.message
      });
    }
  });
});

// Helper function to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper function to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// ==================== DELETE DOCUMENT ====================
router.delete('/documents/:name/:docType/:fileIndex', async (req, res) => {
  try {
    const { name, docType, fileIndex } = req.params;
    const index = parseInt(fileIndex);

    console.log(`Deleting document: ${docType}[${index}] for employee: ${name}`);

    let foundEmployee = null;
    let Model = null;

    for (const [roleName, model] of Object.entries(modelMap)) {
      const emp = await model.findOne({
        name: { $regex: new RegExp('^' + name + '$', 'i') }
      });
      if (emp) {
        foundEmployee = emp;
        Model = model;
        console.log(`Found employee in model: ${roleName}`);
        break;
      }
    }

    if (!foundEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const documents = foundEmployee.documents || {};

    if (documents[docType] && documents[docType].files && documents[docType].files[index]) {
      if (documents[docType].files[index].cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(documents[docType].files[index].cloudinaryId);
        } catch (cloudinaryError) {
          console.error('Cloudinary delete error:', cloudinaryError);
        }
      }
      documents[docType].files.splice(index, 1);
    }

    await Model.findOneAndUpdate(
      { _id: foundEmployee._id },
      { $set: { documents } }
    );

    console.log('✅ Document deleted successfully');

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ==================== GET ALL EMPLOYEES ====================
router.get('/', async (req, res) => {
  try {
    const allEmployees = {};

    for (const [roleName, model] of Object.entries(modelMap)) {
      const employees = await model.find({}).select('-password');
      if (employees.length > 0) {
        allEmployees[roleName] = employees;
      }
    }

    res.json(allEmployees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;