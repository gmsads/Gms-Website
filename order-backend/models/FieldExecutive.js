const mongoose = require("mongoose");

const fieldExecutiveSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid 10-digit phone number!`
    }
  },
  email: String,
  guardianName: String,
  guardianContact: Number,

  aadhar: String,
  joiningDate: Date,
  experience: Number,
  imageUrl: String,
  cloudinaryId: String, // to store uploaded image path with cloudinary 

 active: {
    type: Boolean,
    default: true
  },   // ✅ uploaded file path
  resignationDate: String,
  resignationReason: String,
  documents: {
  aadhar: { type: String, default: null },
  pan: { type: String, default: null },
  educational: { type: String, default: null },
  experience: { type: String, default: null }
},
  rejoinDate: String,
}, { timestamps: true });

module.exports = mongoose.model("FieldExecutive", fieldExecutiveSchema);
