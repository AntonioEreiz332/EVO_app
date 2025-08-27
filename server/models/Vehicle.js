const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  brand: { type: String, required: true },     
  model: { type: String, required: true },     
  year: { type: Number },                      
  registration: { type: String },              
  costs: [
    {
      type: { type: String, enum: ["servis", "kvar", "registracija", "gorivo"], required: true },
      description: String,
      amount: Number,
      date: { type: Date, default: Date.now },
      mileage: { type: Number, min: 0 }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Vehicle", vehicleSchema);
