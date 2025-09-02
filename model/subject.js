const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true }
});

module.exports = mongoose.model("Subject", subjectSchema);
