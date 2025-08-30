const mongoose = require("mongoose");
const slugify = require("slugify"); // npm install slugify

const classSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  image: String,
  kitab: [String],
  slug: { type: String, unique: true }
}, { timestamps: true });

// pre save hook to auto-generate slug
classSchema.pre("save", function(next) {
  if (!this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model("Class", classSchema);
