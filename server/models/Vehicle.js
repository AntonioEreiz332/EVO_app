const mongoose = require("mongoose");

const SERVICE_SUBCATS = [
  "Mali servis",
  "Veliki servis",
  "Kočnice",
  "Motor i prijenos",
  "Elektronika",
  "Ovjes i trap",
  "Klima",
  "Tekućine i potrošni materijal",
  "Gume i vulkanizacija",
];

const FAILURE_SUBCATS = [
  "Motor i pogon",
  "Kočnice",
  "Elektronika",
  "Ovjes i trap",
  "Mjenjač i prijenos",
  "Klima i grijanje",
  "Gume i kotači",
];

const ALL_TYPES = ["servis", "kvar", "registracija", "osiguranje", "gorivo", "gume"];
const ALL_SUBCATS = [...SERVICE_SUBCATS, ...FAILURE_SUBCATS];

const vehicleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number },
    registration: { type: String },

    odometer: { type: Number, min: 0, default: 0 },

    serviceCounters: {
      small: {
        lastKm: { type: Number, min: 0, default: null },
        lastDate: { type: Date, default: null },
        intervalKm: { type: Number, min: 0, default: 15000 },
        intervalMonths: { type: Number, min: 0, default: 12 },
      },
      big: {
        lastKm: { type: Number, min: 0, default: null },
        lastDate: { type: Date, default: null },
        intervalKm: { type: Number, min: 0, default: 100000 },
        intervalMonths: { type: Number, min: 0, default: 72 }, 
      },
      brakes: {
        lastKm: { type: Number, min: 0, default: null },
        lastDate: { type: Date, default: null },
        intervalKm: { type: Number, min: 0, default: 50000 },
        intervalMonths: { type: Number, min: 0, default: 36 }, 
      },
    },

    costs: [
      {
        type: { type: String, enum: ALL_TYPES, required: true },
        subcategory: {
          type: String,
          enum: [...ALL_SUBCATS, ""],
          default: "",
          // custom provjera: podkategorija samo za servis/kvar
          validate: {
            validator: function (v) {
              if (!v) return true; // prazno je ok
              if (this.type === "servis") return SERVICE_SUBCATS.includes(v);
              if (this.type === "kvar") return FAILURE_SUBCATS.includes(v);
              return false;
            },
            message: "Neispravna podkategorija za odabranu kategoriju.",
          },
        },
        description: String,
        notes: String,
        location: String,
        vendor: String,
        amount: Number,
        date: { type: Date, default: Date.now },
        mileage: { type: Number, min: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
