
const User = require("./data");

const insertData = async () => {
  const user = new User({
    class: "Class 10",
    prevClass: "Class 9",
    name: "abdullah ",
    sonOf: "abdul basit",
    dateOfbrith: 2005,
    vill: "bamunpara",
    post: "manullapara",
    police: "mankachar",
    distric: "south salmara mankachar",
    state: "assam",
    country: "India",
    pin: 783135,
    phone: 1234567890,
    email: "abdullah@example.com",
    image: src="/photos/alom.jpg"
  });

  await user.save();
  console.log("User inserted");
};

insertData();
