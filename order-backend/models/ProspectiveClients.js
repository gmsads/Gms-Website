const mongoose = require('mongoose');

const prospectiveClientSchema = new mongoose.Schema({
    ExcutiveName: {
        type: String,
        required: [true, 'Executive name is required'],
        trim: true
    },
    businessName: {
        type: String,
        required: [true, 'Business name is required'],
        trim: true
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        validate: {
            validator: function(v) {
                return /^\d{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    contactPerson: {
        type: String,
        required: [true, 'Contact person is required'],
        trim: true
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    requirementDescription: {
        type: String,
        trim: true
    },
    followUpDate: {
        type: Date,
        required: [true, 'Follow-up date is required'],
        validate: {
            validator: function(v) {
                return v >= new Date();
            },
            message: 'Follow-up date must be in the future'
        }
    },
    prospectType: {
        type: String,
        enum: ['Hot Prospect', 'Cold Prospect', 'Expected in Next Month'],
        required: [true, 'Prospect type is required']
    },
    whatsappStatus: {
        type: String,
        enum: ['Send', 'Not Send'],
        required: [true, 'WhatsApp status is required']
    },
    leadFrom: {
        type: String,
        required: [true, 'Lead source is required'],
        trim: true
    },
    status: {
        type: String,
        enum: ['new', 'contacted', 'followup', 'sale closed', 'not interested', 'next month'],
        default: 'new'
    },
    notes: [{
        content: {
            type: String,
            required: true
        },
        createdBy: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true, // This will automatically manage createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Update the updatedAt field before saving
prospectiveClientSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Add a text index for search functionality
prospectiveClientSchema.index({
    businessName: 'text',
    contactPerson: 'text',
    location: 'text',
    phoneNumber: 'text'
});

// Virtual for formatted follow-up date
prospectiveClientSchema.virtual('formattedFollowUpDate').get(function() {
    return this.followUpDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

const ProspectiveClient = mongoose.model('ProspectiveClient', prospectiveClientSchema);

module.exports = ProspectiveClient;