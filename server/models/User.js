const mongoose = require ('mongoose')

const UserSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },   
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
})

const UserModel = mongoose.model("users", UserSchema)
module.exports = UserModel