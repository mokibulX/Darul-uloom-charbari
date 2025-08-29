const mongoose = require("mongoose");

let Schema = mongoose.Schema;

let userSchema = new Schema({
  type: { type: String, enum: ["new", "old"], default: "new" },
  class: { type: String, required: true },
  prevClass: { type: String, required: true },
  name: { type: String, required: true },
  sonOf: { type: String, required: true },
  dateOfbrith: { type: String, required: true },
  vill: { type: String, required: true },
  post: { type: String },
  police: { type: String, required: true },
  distric: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  pin: { type: Number, required: true },
  phone: { type: Number, required: true },
  email: { type: String },
  image: { type: String, required: true },
  age: { type: Number, required: true },
  password: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "accepted"],
    default: "pending",
  },
  applicationId: {
    type: String,
    required: true,
    unique: true,
  },
  Date: { type: Date, default: Date.now },
  payment: {
    type: String,
    enum: ["online", "offline"],
    required: true
  },
   amount: { type: Number, required: true },
   agreeAll: { type: Boolean, required: true },
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;
