const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  classId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Class", 
    required: true 
  },
  subjects: [
    {
      kitab: { type: String, required: true },     // বইয়ের নাম
      obtainedMark: { type: Number, default: 0 },  // প্রাপ্ত নম্বর
      fullMark: { type: Number, default: 100 }     // পূর্ণ নম্বর
    }
  ],
  totalMarks: { type: Number, default: 0 },        // মোট নম্বর
  passFail: { 
    type: String, 
    enum: ["Pass", "Fail", "Out of Consideration"], // ✅ তিনটাই allow করলাম
    default: "Fail" 
  },
  division: { type: String, default: "-" },        // Division (1st, 2nd, 3rd ইত্যাদি)
  examMonth: { type: String, default: "-" },       // কোন মাসে পরীক্ষা
  examYear: { type: String, required: true }       // বছরটা আবশ্যক
}, { timestamps: true });                          // createdAt, updatedAt auto add হবে

module.exports = mongoose.model("Result", resultSchema);
