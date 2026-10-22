const Admin = require('../../models/Admin');
const Account = require('../../models/Account');
const SalesManager = require('../../models/SalesManager');
const ServiceManager = require('../../models/ServiceManager');
const Executive = require('../../models/Executive');
const ServiceExecutive = require('../../models/ServiceExecutive');
const FieldExecutive = require('../../models/FieldExecutive');
const Agent = require('../../models/Agent');
const ItTeam = require('../../models/ITTeam');
const HR = require('../../models/HR');

const ROLE_MODEL_MAP = {
  Admin: Admin,
  Account: Account,
  'Sales Manager': SalesManager,
  'Service Manager': ServiceManager,
  Executive: Executive,
  'Service Executive': ServiceExecutive,
  FieldExecutive: FieldExecutive,
  Agent: Agent,
  IT: ItTeam,
  HR: HR,
};

const PERMISSION_ROLES = {
  UPLOAD: [
    'Admin',
    'Account',
    'Sales Manager',
    'Service Manager',
    'Executive',
    'Service Executive',
    'FieldExecutive',
    'Agent',
    'IT',
  ],
  VIEW: [
    'Admin',
    'Account',
    'Sales Manager',
    'Service Manager',
    'Executive',
    'Service Executive',
    'FieldExecutive',
    'Agent',
    'IT',
  ],
  EDIT: ['Admin', 'Account', 'Sales Manager', 'Service Manager', 'Executive', 'Service Executive'],
  APPROVE_REJECT: ['Admin', 'Account', 'Sales Manager'],
  RECONCILE_VERIFICATION: ['Admin', 'Account'],
  SYNC_SHEETS: ['Admin', 'Account', 'Sales Manager'],
};

/**
 * Extracts CRM user identity from headers, query params, or request body,
 * and optionally verifies against the corresponding role model in MongoDB.
 */
async function resolveCrmUser(req) {
  const rawName =
    req.headers['x-user-name'] ||
    req.query.userName ||
    (req.body && req.body.userName) ||
    '';
  const rawRole =
    req.headers['x-user-role'] ||
    req.query.userRole ||
    (req.body && req.body.userRole) ||
    '';

  const userName = String(rawName).trim();
  const userRole = String(rawRole).trim();

  if (!userName || !userRole) {
    return null;
  }

  const Model = ROLE_MODEL_MAP[userRole];
  if (!Model) {
    return null;
  }

  // Try to verify active user in DB if MongoDB is connected
  try {
    if (Model.db && Model.db.readyState === 1) {
      const escaped = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const dbUser = await Model.findOne({
        $or: [
          { name: new RegExp(`^${escaped}$`, 'i') },
          { username: new RegExp(`^${escaped}$`, 'i') },
        ],
      }).lean();

      if (dbUser) {
        if (dbUser.active === false) {
          return { inactive: true };
        }
        return {
          userId: dbUser._id,
          userName: dbUser.name || userName,
          userRole,
          verifiedInDb: true,
        };
      }
    }
  } catch (err) {
    // Non-fatal fallback if DB lookup fails during transient error
  }

  return {
    userId: null,
    userName,
    userRole,
    verifiedInDb: false,
  };
}

/**
 * Express middleware factory to enforce role-based access control
 */
function requirePermission(permissionKey) {
  const allowedRoles = PERMISSION_ROLES[permissionKey] || ['Admin'];

  return async (req, res, next) => {
    try {
      const user = await resolveCrmUser(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please log in to the CRM.',
        });
      }

      if (user.inactive) {
        return res.status(403).json({
          success: false,
          message: 'Your CRM account is inactive.',
        });
      }

      if (!allowedRoles.includes(user.userRole)) {
        return res.status(403).json({
          success: false,
          message: `Role "${user.userRole}" does not have permission for ${permissionKey}. Allowed roles: ${allowedRoles.join(', ')}`,
        });
      }

      req.crmUser = user;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Permission verification error',
      });
    }
  };
}

module.exports = {
  PERMISSION_ROLES,
  resolveCrmUser,
  requirePermission,
};
