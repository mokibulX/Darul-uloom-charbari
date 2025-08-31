const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

let Schema = mongoose.Schema;

let userSchema = new Schema({
  type: { type: String, enum: ["new", "old"], default: "new" },
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
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" }
});

// ---------------- Password Hashing ----------------
userSchema.pre("save", async function(next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Compare password method for login/check
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
module.exports = User;
