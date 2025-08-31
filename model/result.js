const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  kitab: { type: String, required: true },
  fullMark: { type: Number, required: true },
  obtainedMark: { type: Number, required: true },
  passFail: { type: String },
  division: { type: String },
  position: { type: Number },
  examMonth: { type: String },
  examYear: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Result", resultSchema);
