const express = require("express");
const router = express.Router();
const DesignRequest = require("../models/DesignRequest");
const Designer = require("../models/Designer");

// Helper function to format seconds to MM:SS
const formatSeconds = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// @route   POST /api/design-requests
// @desc    Create new design request
// @access  Public
router.post("/", async (req, res) => {
  try {
    // Basic validation
    if (!req.body.executive || !req.body.businessName || !req.body.contactPerson || 
        !req.body.phoneNumber || !req.body.requirements) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Phone number validation
    if (!/^\d{10}$/.test(req.body.phoneNumber)) {
      return res.status(400).json({ message: "Phone number must be 10 digits" });
    }

    const newRequest = new DesignRequest(req.body);
    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    console.error("Error creating design request:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// @route   GET /api/design-requests
// @desc    Get all design requests
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { status, designer } = req.query;
    let query = {};

    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }
    
    if (designer) query.assignedDesigner = designer;

    const requests = await DesignRequest.find(query)
      .populate('executive', 'name')
      .populate('assignedDesigner', 'name')
      .sort({ requestDate: -1 });

    res.json(requests);
  } catch (err) {
    console.error("Error fetching design requests:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// @route   PATCH /api/design-requests/:id
// @desc    Update design request
// @access  Public
router.patch("/:id", async (req, res) => {
  try {
    console.log("PATCH request received for ID:", req.params.id);
    console.log("Request body:", req.body);

    const { 
      status, 
      assignedDesigner, 
      pauseReason, 
      timeUsedBeforePause,
      resumeTimer,
      completedAt,
      assignedToServiceTeam,
      serviceTeamAssignedBy,
      assignedToServiceDate
    } = req.body;

    // Handle pause reason submission
    if (pauseReason && timeUsedBeforePause) {
      try {
        const request = await DesignRequest.findById(req.params.id);
        
        if (!request) {
          return res.status(404).json({ message: "Design request not found" });
        }
        
        // Add new pause entry
        request.pauses.push({
          reason: pauseReason,
          timeUsedBeforePause: timeUsedBeforePause,
          pauseTime: new Date()
        });
        
        // Set last paused at
        request.lastPausedAt = new Date();
        
        await request.save();
        
        return res.json({
          message: "Pause reason recorded successfully",
          request: request
        });
      } catch (err) {
        console.error("Error saving pause reason:", err);
        return res.status(500).json({ 
          message: "Error saving pause reason",
          error: err.message 
        });
      }
    }
    
    // Handle resume timer
    if (resumeTimer === true) {
      try {
        const request = await DesignRequest.findById(req.params.id);
        
        if (!request) {
          return res.status(404).json({ message: "Design request not found" });
        }
        
        // Find the latest pause without a resume time
        const activePauses = request.pauses.filter(p => !p.resumeTime);
        if (activePauses.length > 0) {
          const latestPause = activePauses.reduce((latest, current) => {
            return new Date(current.pauseTime) > new Date(latest.pauseTime) ? current : latest;
          });
          
          latestPause.resumeTime = new Date();
          latestPause.duration = Math.floor((latestPause.resumeTime - latestPause.pauseTime) / 1000);
          
          // Update total pause time
          request.totalPauseTime = (request.totalPauseTime || 0) + latestPause.duration;
          
          await request.save();
        }
        
        return res.json({
          message: "Timer resumed successfully",
          request: request
        });
      } catch (err) {
        console.error("Error resuming timer:", err);
        return res.status(500).json({ 
          message: "Error resuming timer",
          error: err.message 
        });
      }
    }

    // Handle regular updates
    const updateData = {};
    
    if (status) {
      updateData.status = status;
      
      // Handle status-specific updates
      if (status === 'assigned-to-service') {
        updateData.assignedToServiceTeam = true;
        updateData.assignedToServiceDate = new Date();
        updateData.serviceTeamAssignedBy = serviceTeamAssignedBy;
      } else if (status === 'completed') {
        updateData.completedAt = new Date();
      }
    }
    
    // Handle direct service team assignment fields
    if (assignedToServiceTeam !== undefined) {
      updateData.assignedToServiceTeam = assignedToServiceTeam;
    }
    
    if (serviceTeamAssignedBy) {
      updateData.serviceTeamAssignedBy = serviceTeamAssignedBy;
    }
    
    if (assignedToServiceDate) {
      updateData.assignedToServiceDate = assignedToServiceDate;
    }
    
    if (completedAt) {
      updateData.completedAt = completedAt;
    }
    
    if (assignedDesigner) {
      updateData.assignedDesigner = assignedDesigner;
      
      // Try to get designer name
      try {
        const designer = await Designer.findById(assignedDesigner).select('name');
        if (designer) {
          updateData.designerName = designer.name;
        }
      } catch (err) {
        console.warn("Could not find designer:", err.message);
        // Continue without designer name
      }
    }

    const updatedRequest = await DesignRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Design request not found" });
    }

    res.json(updatedRequest);
  } catch (err) {
    console.error("Error updating design request:", err);
    res.status(500).json({ 
      message: "Server error updating design request",
      error: err.message 
    });
  }
});

// @route   GET /api/design-requests/:id/pauses
// @desc    Get pause details for a design request
// @access  Public
router.get("/:id/pauses", async (req, res) => {
  try {
    const { id } = req.params;
    const design = await DesignRequest.findById(id);

    if (!design) {
      return res.status(404).json({ message: "Design not found" });
    }

    if (!design.pauses || design.pauses.length === 0) {
      return res.json({
        businessName: design.businessName,
        pauses: [],
        totalPauseTime: 0,
        totalPauseTimeFormatted: "00:00"
      });
    }

    // Calculate total pause time
    const totalPauseTime = design.pauses.reduce(
      (acc, pause) => acc + (pause.duration || 0),
      0
    );

    res.json({
      businessName: design.businessName,
      pauses: design.pauses,
      totalPauseTime,
      totalPauseTimeFormatted: formatSeconds(totalPauseTime)
    });
  } catch (err) {
    console.error("Error fetching pause details:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/design-requests/service-team
// @desc    Get service team requests
// @access  Public
router.get('/service-team', async (req, res) => {
  try {
    const { simple } = req.query;
    
    let query = DesignRequest.find({ assignedToServiceTeam: true })
      .populate('executive', 'name')
      .populate('assignedDesigner', 'name')
      .sort('-assignedToServiceDate');

    if (simple === 'true') {
      query = query.select('_id businessName contactPerson phoneNumber requirements status assignedToServiceDate completedDate assignedDesigner designerName executive');
    }

    const requests = await query.lean();
    
    // Ensure designer name is properly set in each request
    const enhancedRequests = requests.map(request => ({
      ...request,
      designerName: request.assignedDesigner?.name || request.designerName || 'Not assigned'
    }));

    res.json(enhancedRequests);
  } catch (err) {
    console.error("Error fetching service team requests:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
