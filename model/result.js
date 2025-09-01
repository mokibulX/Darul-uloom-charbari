const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
  examMonth: String,
  examYear: String,
  totalMarks: Number,
  passFail: String,
  division: String
});

module.exports = mongoose.model("Result", resultSchema);
