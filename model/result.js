const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  subjects: [
    {
      kitab: { type: String, required: true },
      obtainedMark: { type: Number, default: 0 },
      fullMark: { type: Number, default: 100 }
    }
  ],
  totalMarks: { type: Number, default: 0 },
  passFail: { type: String, enum: ["Pass", "Fail"], default: "Fail" },
  division: { type: String, default: "-" },
  examMonth: String,
  examYear: String
});

module.exports = mongoose.model("Result", resultSchema);
