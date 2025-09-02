const mongoose = require("mongoose");
const slugify = require("slugify"); // npm install slugify

const classSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: "" },
  image: { type: String, default: "" },
  // Single array for all subjects/kitabs
  kitabs: [{ type: String, trim: true }],
  slug: { type: String, unique: true }
}, { timestamps: true });

// Auto-generate slug before saving
classSchema.pre("save", function(next) {
  if (!this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model("Class", classSchema);
