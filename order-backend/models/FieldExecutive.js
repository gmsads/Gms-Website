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
  aadhar: String,
  joiningDate: Date,
  experience: Number,
  active: { type: Boolean, default: true },
  image: String,   // ✅ uploaded file path
  resignationDate: String,
  resignationReason: String,
  rejoinDate: String,
}, { timestamps: true });

module.exports = mongoose.model("FieldExecutive", fieldExecutiveSchema);
