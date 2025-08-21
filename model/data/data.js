const mongoose = require("mongoose");

main().then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/test");
}


let Schema = mongoose.Schema;

let userSchema = new Schema({
  old: {
    type: Boolean,
    default: false
  },
  new: {
    type: Boolean,
    default: false
  },
  class: {
      type: String,
      required: true
  },
  prevClass: {
      type: String,
      required: true
  },
  name: {
      type: String,
        required: true
    },
    sonOf: {
    type: String,
    required: true
  },
    dateOfbrith: {
    type: String,
    required: true
  },
  vill: {
    type: String,
    required: true
  },
  post:{
  },
  police:{
    type: String,
    required: true
  },
  police:{
    type: String,
    required: true
  },
  district:{
    type: String,
    required: true
  },
  state:{
    type: String,
    required: true
  },
  country:{
    type: String,
    required: true
  },
    pin: {
        type: Number,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
  email: {
    type: String,
  },

  image: {
    type: String,
    required: true
  }, 
  age: {
    type: Number,
    required: true
  }

});


const User = mongoose.model("User", userSchema);

module.exports = User;
