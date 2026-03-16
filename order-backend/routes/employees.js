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
  'Unit': Unit
};

// Log to verify all models are loaded
console.log('📦 Models loaded in employees route:', Object.keys(modelMap));

// Configure Cloudinary storage for documents
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employee-documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type: 'auto',
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ==================== UPLOAD DOCUMENTS ====================
router.post('/upload-documents', (req, res) => {
  upload.fields([
    { name: 'aadhar_front', maxCount: 1 },
    { name: 'aadhar_back', maxCount: 1 },
    { name: 'pan_front', maxCount: 1 },
    { name: 'pan_back', maxCount: 1 },
    { name: 'educational', maxCount: 10 }, // Increased to 10
    { name: 'experience', maxCount: 10 },   // Increased to 10
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
      console.log('Request body:', req.body);
      console.log('Files received:', req.files ? Object.keys(req.files) : 'No files');

      const { name, documentNotes, customDocName } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Employee name is required'
        });
      }

      // Find employee with multiple search strategies
      let foundEmployee = null;
      let Model = null;
      let foundRole = null;

      // Try exact match first, then case-insensitive, then trimmed
      for (const [roleName, model] of Object.entries(modelMap)) {
        try {
          // Try exact match
          let emp = await model.findOne({ name: name });

          // Try case-insensitive if not found
          if (!emp) {
            emp = await model.findOne({
              name: { $regex: new RegExp('^' + name + '$', 'i') }
            });
          }

          // Try with trimmed name
          if (!emp) {
            emp = await model.findOne({
              name: { $regex: new RegExp('^' + name.trim() + '$', 'i') }
            });
          }

          if (emp) {
            foundEmployee = emp;
            Model = model;
            foundRole = roleName;
            console.log(`✅ Found employee in model: ${roleName} with name: ${emp.name}`);
            break;
          }
        } catch (modelError) {
          console.error(`Error searching in ${roleName}:`, modelError.message);
        }
      }

      if (!foundEmployee) {
        console.error('❌ Employee not found with name:', name);
        return res.status(404).json({
          success: false,
          message: `Employee not found with name: ${name}`
        });
      }

      // Initialize documents structure
      let documents = foundEmployee.documents || {};

      // Ensure all document types exist with proper structure
      const ensureDocumentStructure = (doc) => {
        if (!doc) return { files: [] };
        if (typeof doc === 'string') return { files: [] };
        if (doc.files && Array.isArray(doc.files)) return doc;
        return { files: [] };
      };

      documents.aadhar = ensureDocumentStructure(documents.aadhar);
      documents.pan = ensureDocumentStructure(documents.pan);
      documents.educational = ensureDocumentStructure(documents.educational);
      documents.experience = ensureDocumentStructure(documents.experience);

      // Handle customDocuments Map
      if (!documents.customDocuments) {
        documents.customDocuments = new Map();
      } else if (!(documents.customDocuments instanceof Map)) {
        // Convert plain object to Map if needed
        try {
          const oldDocs = documents.customDocuments;
          documents.customDocuments = new Map();
          if (typeof oldDocs === 'object' && oldDocs !== null) {
            Object.entries(oldDocs).forEach(([key, value]) => {
              documents.customDocuments.set(key, value);
            });
          }
        } catch (e) {
          documents.customDocuments = new Map();
        }
      }

      // ===== PROCESS AADHAR FILES =====
      if (req.files && req.files.aadhar_front && req.files.aadhar_front.length > 0) {
        console.log(`Processing Aadhar front: ${req.files.aadhar_front.length} file(s)`);
        req.files.aadhar_front.forEach(file => {
          documents.aadhar.files.push({
            url: file.path,
            cloudinaryId: file.filename,
            filename: file.originalname,
            notes: 'Aadhar Front',
            uploadedAt: new Date()
          });
        });
      }

      if (req.files && req.files.aadhar_back && req.files.aadhar_back.length > 0) {
        console.log(`Processing Aadhar back: ${req.files.aadhar_back.length} file(s)`);
        req.files.aadhar_back.forEach(file => {
          documents.aadhar.files.push({
            url: file.path,
            cloudinaryId: file.filename,
            filename: file.originalname,
            notes: 'Aadhar Back',
            uploadedAt: new Date()
          });
        });
      }

      // ===== PROCESS PAN FILES =====
      if (req.files && req.files.pan_front && req.files.pan_front.length > 0) {
        console.log(`Processing PAN front: ${req.files.pan_front.length} file(s)`);
        req.files.pan_front.forEach(file => {
          documents.pan.files.push({
            url: file.path,
            cloudinaryId: file.filename,
            filename: file.originalname,
            notes: 'PAN Front',
            uploadedAt: new Date()
          });
        });
      }

      if (req.files && req.files.pan_back && req.files.pan_back.length > 0) {
        console.log(`Processing PAN back: ${req.files.pan_back.length} file(s)`);
        req.files.pan_back.forEach(file => {
          documents.pan.files.push({
            url: file.path,
            cloudinaryId: file.filename,
            filename: file.originalname,
            notes: 'PAN Back',
            uploadedAt: new Date()
          });
        });
      }

      // ===== PROCESS EDUCATIONAL DOCUMENTS =====
      if (req.files && req.files.educational && req.files.educational.length > 0) {
        console.log(`Processing Educational: ${req.files.educational.length} file(s)`);
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

      // ===== PROCESS EXPERIENCE DOCUMENTS =====
      if (req.files && req.files.experience && req.files.experience.length > 0) {
        console.log(`Processing Experience: ${req.files.experience.length} file(s)`);
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

      // ===== PROCESS CUSTOM DOCUMENTS =====
      if (req.files && req.files.customDocument && req.files.customDocument.length > 0 && customDocName) {
        console.log(`Processing Custom Document: ${customDocName} with ${req.files.customDocument.length} file(s)`);

        // Get or create the custom document type
        let customDocType = documents.customDocuments.get(customDocName);
        if (!customDocType) {
          customDocType = { files: [] };
          documents.customDocuments.set(customDocName, customDocType);
        }

        // Ensure files array exists
        if (!customDocType.files) {
          customDocType.files = [];
        }

        // Add each file
        req.files.customDocument.forEach((file, index) => {
          console.log(`Adding file ${index + 1}:`, file.originalname);

          const fileData = {
            url: file.path,
            cloudinaryId: file.filename,
            filename: file.originalname,
            notes: documentNotes || `${customDocName} ${index + 1}`,
            uploadedAt: new Date()
          };

          console.log('File data being saved:', fileData);
          customDocType.files.push(fileData);
        });

        console.log(`Custom document ${customDocName} now has ${customDocType.files.length} files`);
      }

      // Update employee in database
      const updatedEmployee = await Model.findOneAndUpdate(
        { _id: foundEmployee._id },
        { $set: { documents: documents } },
        { new: true }
      );

      console.log('✅ Documents uploaded successfully');

      // Prepare response - convert Map to object for JSON
      const customDocsObject = {};
      documents.customDocuments.forEach((value, key) => {
        customDocsObject[key] = value;
      });

      const responseDocs = {
        aadhar: documents.aadhar,
        pan: documents.pan,
        educational: documents.educational,
        experience: documents.experience,
        customDocuments: customDocsObject
      };

      return res.json({
        success: true,
        message: 'Documents uploaded successfully',
        documents: responseDocs
      });

    } catch (error) {
      console.error('========== DOCUMENT UPLOAD ERROR ==========');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      return res.status(500).json({
        success: false,
        message: 'Failed to upload documents',
        error: error.message,
        errorType: error.name
      });
    }
  });
});

// ==================== GET EMPLOYEE DOCUMENTS ====================
router.get('/documents/:name', async (req, res) => {
  try {
    const { name } = req.params;
    console.log(`Fetching documents for employee: ${name}`);

    let foundEmployee = null;
    let foundRole = null;

    // Search in all models
    for (const [roleName, model] of Object.entries(modelMap)) {
      try {
        const emp = await model.findOne({
          name: { $regex: new RegExp('^' + name + '$', 'i') }
        });

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
      console.error('❌ Employee not found:', name);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
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
      'Unit': ['aadhar', 'pan', 'educational']
    };

    const requiredDocs = roleDocumentRequirements[foundRole] || ['aadhar', 'pan'];

    // Ensure documents have proper structure
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
      console.log('Raw customDocuments from DB:', documents.customDocuments);
      
      // Handle as Map
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
      } 
      // Handle as plain object
      else if (typeof documents.customDocuments === 'object' && documents.customDocuments !== null) {
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

    console.log('Processed custom documents:', customDocsObject);

    // Prepare response
    const documentsForResponse = {
      aadhar: ensureDocumentStructure(documents.aadhar),
      pan: ensureDocumentStructure(documents.pan),
      educational: ensureDocumentStructure(documents.educational),
      experience: ensureDocumentStructure(documents.experience),
      customDocuments: customDocsObject
    };

    console.log(`Educational documents count: ${documentsForResponse.educational.files.length}`);
    console.log(`Experience documents count: ${documentsForResponse.experience.files.length}`);
    console.log(`Found ${Object.keys(documentsForResponse.customDocuments).length} custom document types`);

    res.json({
      success: true,
      documents: documentsForResponse,
      requiredDocuments: requiredDocs,
      role: foundRole
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

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

    // Handle custom documents
    if (docType.startsWith('custom_')) {
      const customName = docType.replace('custom_', '');
      console.log(`Deleting custom document: ${customName}, index: ${index}`);

      if (documents.customDocuments) {
        // Handle as Map
        if (documents.customDocuments instanceof Map) {
          if (documents.customDocuments.has(customName)) {
            const customDoc = documents.customDocuments.get(customName);
            if (customDoc.files && customDoc.files[index]) {
              // Optional: Delete from Cloudinary
              if (customDoc.files[index].cloudinaryId) {
                try {
                  await cloudinary.uploader.destroy(customDoc.files[index].cloudinaryId);
                  console.log(`Deleted from Cloudinary: ${customDoc.files[index].cloudinaryId}`);
                } catch (cloudinaryError) {
                  console.error('Cloudinary delete error:', cloudinaryError);
                }
              }

              customDoc.files.splice(index, 1);
              if (customDoc.files.length === 0) {
                documents.customDocuments.delete(customName);
              }
            }
          }
        }
        // Handle as plain object
        else if (typeof documents.customDocuments === 'object') {
          if (documents.customDocuments[customName]) {
            if (documents.customDocuments[customName].files &&
              documents.customDocuments[customName].files[index]) {

              // Delete from Cloudinary
              if (documents.customDocuments[customName].files[index].cloudinaryId) {
                try {
                  await cloudinary.uploader.destroy(documents.customDocuments[customName].files[index].cloudinaryId);
                } catch (cloudinaryError) {
                  console.error('Cloudinary delete error:', cloudinaryError);
                }
              }

              documents.customDocuments[customName].files.splice(index, 1);
              if (documents.customDocuments[customName].files.length === 0) {
                delete documents.customDocuments[customName];
              }
            }
          }
        }
      }
    }
    // Handle regular documents (aadhar, pan, educational, experience)
    else {
      if (documents[docType] && documents[docType].files && documents[docType].files[index]) {
        // Optional: Delete from Cloudinary
        if (documents[docType].files[index].cloudinaryId) {
          try {
            await cloudinary.uploader.destroy(documents[docType].files[index].cloudinaryId);
            console.log(`Deleted from Cloudinary: ${documents[docType].files[index].cloudinaryId}`);
          } catch (cloudinaryError) {
            console.error('Cloudinary delete error:', cloudinaryError);
          }
        }

        documents[docType].files.splice(index, 1);
      }
    }

    // Update employee in database
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

// ==================== GET ALL EMPLOYEES (for reference) ====================
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