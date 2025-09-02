const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const UserModel = require('./models/User')
const Vehicle = require("./models/Vehicle");
const { Types } = require("mongoose");

const app = express()
app.use(express.json())
app.use(cors())

const DB_NAME = 'evo_app'; 

const MONGO_URI = `mongodb+srv://aereiz:aereiz123@cluster0.ad9xbmi.mongodb.net/${DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected (Atlas)'))
  .catch(err => console.error('Mongo connect error:', err.message));


  app.listen(3001, () => {
    console.log("Server is running")
});

const SERVICE_RESET_MAP = {
  "Mali servis": "small",
  "Veliki servis": "big",
  "Kočnice": "brakes",
};

//LOGIN KORISNIKA 
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'UserNotFound', message: 'Korisnički račun ne postoji.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'WrongPassword', message: 'Lozinka nije točna.' });
    }

     // OK – vrati korisnika i ulogu
    return res.json({
      status: 'Success',
      user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'ServerError', message: 'Došlo je do greške na serveru.' });
  }
});

//REGISTRACIJA KORISNIKA
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Provjera postoji li već korisnik s tim emailom
    const exists = await UserModel.findOne({ email });
    if (exists) {
      return res
        .status(409)
        .json({ error: 'EmailExists', message: 'Korisnik s ovim emailom već postoji.' });
    }

    // Kreiraj korisnika 
    await UserModel.create({ name, email, password, role: 'user' });

    return res.status(201).json({ status: 'Registered' });
  } catch (err) {
    console.error('Register error:', err);
    return res
      .status(500)
      .json({ error: 'ServerError', message: 'Došlo je do greške na serveru.' });
  }
});

// Dohvatanje vozila korisnika -HOME
app.get("/vehicles/:userId", async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.params.userId });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: "ServerError" });
  }
});

// Dodavanje vozila -HOME
app.post("/vehicles", async (req, res) => {
  try {
    const newVehicle = new Vehicle(req.body);
    await newVehicle.save();
    res.status(201).json(newVehicle);
  } catch (err) {
    res.status(400).json({ error: "ValidationError", message: err.message });
  }
});

// Dohvatanje vozila po ID-u (s troškovima) - VehicleDetails
app.get("/vehicle/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "BadId" });
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) return res.status(404).json({ error: "NotFound" });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: "ServerError" });
  }
});

// Dodavanje troška vozilu - VehicleDetails
app.post("/vehicle/:id/costs", async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "BadId" });

    const {
      type, subcategory, description, notes, location, vendor,
      amount, date, mileage
    } = req.body;

    if (!type || amount === undefined || amount === null) {
      return res.status(400).json({ error: "ValidationError", message: "Type i amount su obavezni." });
    }

    const cost = {
      type,
      description,
      notes,
      location,
      vendor,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
    };

    if ((type === "servis" || type === "kvar") && subcategory) {
      cost.subcategory = subcategory;
    } else {
      cost.subcategory = ""; 
    }

    if (mileage !== undefined && mileage !== "" && mileage !== null) {
      cost.mileage = Number(mileage);
    }

    const v = await Vehicle.findByIdAndUpdate(
      id,
      { $push: { costs: cost } },
      { new: true }
    );

    if (v && cost.type === "servis" && cost.subcategory && SERVICE_RESET_MAP[cost.subcategory]) {
      const key = SERVICE_RESET_MAP[cost.subcategory];

      let lastKm = null;
      if (typeof cost.mileage === "number" && !Number.isNaN(cost.mileage)) {
        lastKm = cost.mileage;
      } else if (typeof v.odometer === "number" && v.odometer > 0) {
        lastKm = v.odometer;
      }

      if (lastKm === null) {
        return res.status(201).json({ status: "Added", vehicle: v, cost });
      }
      
      const patch = {};
      patch[`serviceCounters.${key}.lastKm`] = lastKm;
      patch[`serviceCounters.${key}.lastDate`] = cost.date || new Date();
      
      await Vehicle.updateOne({ _id: v._id }, { $set: patch });      
      const fresh = await Vehicle.findById(v._id);
      return res.status(201).json({ status: "Added", vehicle: fresh, cost });
    }

    if (!v) return res.status(404).json({ error: "NotFound" });

    res.status(201).json({ status: "Added", vehicle: v, cost });
  } catch (err) {
    console.error("Add cost error:", err);
    res.status(400).json({ error: "ValidationError", message: err.message });
  }
});

// ADMIN - lista korisnika 
app.get("/admin/users", async (req, res) => {
  try {
    const users = await UserModel.find({}, { name: 1, email: 1, role: 1 }).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "ServerError" });
  }
});

// ADMIN - ažuriranje korisnika 
app.put("/admin/users/:id", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const upd = { name, email, role };
    if (password) upd.password = password;

    const u = await UserModel.findByIdAndUpdate(req.params.id, upd, { new: true });
    if (!u) return res.status(404).json({ error: "NotFound" });
    res.json({ status: "Updated", user: u });
  } catch (err) {
    res.status(400).json({ error: "ValidationError", message: err.message });
  }
});

// ADMIN - brisanje korisnika + svih vozila 
app.delete("/admin/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await Vehicle.deleteMany({ userId: id });
    const result = await UserModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "NotFound" });
    res.json({ status: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "ServerError" });
  }
});

// Obriši jedno vozilo (i sve njegove troškove) - VehicleDetails
app.delete("/vehicle/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "BadId" });
    }

    const deleted = await Vehicle.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "NotFound" });
    }

    res.json({ status: "Deleted" });
  } catch (err) {
    console.error("Delete vehicle error:", err);
    res.status(500).json({ error: "ServerError" });
  }
});

// Ažuriraj trošak
app.put("/vehicle/:id/costs/:costId", async (req, res) => {
  try {
    const { id, costId } = req.params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(costId)) {
      return res.status(400).json({ error: "BadId" });
    }

    const {
      type, subcategory, description, notes, location, vendor,
      amount, date, mileage
    } = req.body;

    const setOps = {
      "costs.$[c].type": type,
      "costs.$[c].description": description,
      "costs.$[c].notes": notes,
      "costs.$[c].location": location,
      "costs.$[c].vendor": vendor,
      "costs.$[c].amount": Number(amount),
      "costs.$[c].date": date ? new Date(date) : new Date(),
    };

    if ((type === "servis" || type === "kvar") && subcategory) {
      setOps["costs.$[c].subcategory"] = subcategory;
    } else {
      setOps["costs.$[c].subcategory"] = ""; 
    }

    if (mileage !== undefined && mileage !== null && String(mileage) !== "") {
      setOps["costs.$[c].mileage"] = Number(mileage);
    } else {
      setOps["costs.$[c].mileage"] = undefined;
    }

    const v = await Vehicle.findOneAndUpdate(
      { _id: id },
      { $set: setOps },
      { new: true, arrayFilters: [{ "c._id": costId }] }
    );

    if (!v) return res.status(404).json({ error: "NotFound" });

    if (type === "servis" && SERVICE_RESET_MAP[subcategory]) {
      const key = SERVICE_RESET_MAP[subcategory];

      const same = (v.costs || [])
        .filter((c) => c.type === "servis" && c.subcategory === subcategory)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (same.length) {
        const newest = same[0];

        let lastKm = null;
        if (typeof newest.mileage === "number" && !Number.isNaN(newest.mileage)) {
          lastKm = newest.mileage;
        } else if (typeof v.odometer === "number" && v.odometer > 0) {
          lastKm = v.odometer;
        }

        if (lastKm !== null) {
          const patch = {};
          patch[`serviceCounters.${key}.lastKm`] = lastKm;
          patch[`serviceCounters.${key}.lastDate`] = newest.date || new Date();
          await Vehicle.updateOne({ _id: v._id }, { $set: patch });
          const fresh = await Vehicle.findById(v._id);
          return res.json({ status: "Updated", vehicle: fresh });
        }
      }
    }

    res.json({ status: "Updated", vehicle: v });
  } catch (err) {
    console.error("Update cost error:", err);
    res.status(400).json({ error: "ValidationError", message: err.message });
  }
});

// Obriši jedan trošak
app.delete("/vehicle/:id/costs/:costId", async (req, res) => {
  try {
    const { id, costId } = req.params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(costId)) {
      return res.status(400).json({ error: "BadId" });
    }

    const v = await Vehicle.findByIdAndUpdate(
      id,
      { $pull: { costs: { _id: costId } } },
      { new: true }
    );

    if (!v) return res.status(404).json({ error: "NotFound" });
    res.json({ status: "Deleted", vehicle: v });
  } catch (err) {
    console.error("Delete cost error:", err);
    res.status(500).json({ error: "ServerError" });
  }
});

// Ažuriraj odometar
app.put("/vehicle/:id/odometer", async (req, res) => {
  const { id } = req.params;
  const { odometer } = req.body;
  const v = await Vehicle.findByIdAndUpdate(id, { $set: { odometer: Number(odometer) } }, { new: true });
  if (!v) return res.status(404).json({ error: "NotFound" });
  res.json({ status: "Updated", vehicle: v });
});

// Ažuriraj intervale (ručna izmjena)
app.put("/vehicle/:id/service-settings", async (req, res) => {
  const { id } = req.params;
  const { smallKm, smallMonths, bigKm, bigMonths, brakesKm, brakesMonths } = req.body;
  const $set = {};
  if (smallKm !== undefined)   $set["serviceCounters.small.intervalKm"] = Number(smallKm);
  if (smallMonths !== undefined)$set["serviceCounters.small.intervalMonths"] = Number(smallMonths);
  if (bigKm !== undefined)     $set["serviceCounters.big.intervalKm"] = Number(bigKm);
  if (bigMonths !== undefined) $set["serviceCounters.big.intervalMonths"] = Number(bigMonths);
  if (brakesKm !== undefined)  $set["serviceCounters.brakes.intervalKm"] = Number(brakesKm);
  if (brakesMonths !== undefined)$set["serviceCounters.brakes.intervalMonths"] = Number(brakesMonths);

  const v = await Vehicle.findByIdAndUpdate(id, { $set }, { new: true });
  if (!v) return res.status(404).json({ error: "NotFound" });
  res.json({ status: "Updated", vehicle: v });
});