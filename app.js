const express = require("express");
const app = express();
const path = require("path");
const ejs = require("ejs");
const mongoose = require("mongoose");
const User = require("./model/data/data");
require("dotenv").config();
const session = require("express-session");
const multer = require("multer");
const Student = require("./model/student");
const Class = require("./model/class");

// ---------------- App Setup ----------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Storage setup for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/"); // file will be saved to this folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Mongoose connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use(
  session({
    secret: process.env.SESSION_SECRET, // strong secret
    resave: false,
    saveUninitialized: true,
  })
);

// ---------------- Middleware ----------------
function isAdmin(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect("/admin/login");
  }
}

// ---------------- Routes ----------------

// Student details route
app.get("/users/:id", async (req, res) => {
  try {
    if (req.session.isAdmin) {
      let user = await User.findById(req.params.id);
      if (!user) return res.send("User not found");
      return res.render("detail", { user });
    }
    res.render("password", { id: req.params.id });
  } catch (err) {
    console.log(err);
    res.send("Something went wrong");
  }
});

// Password check
app.post("/users/:id", async (req, res) => {
  try {
    let user = await User.findById(req.params.id);
    if (!user) return res.send("User not found");
    if (req.body.password !== user.password) {
      return res.send("Wrong password!");
    }
    res.render("detail", { user });
  } catch (err) {
    console.log(err);
    res.render("detail", { user: {} });
  }
});

// Home route
app.get("/", async (req, res) => {
  try {
    let data = await User.find({ status: "accepted" });
    res.render("home", { insertData: data });
  } catch (err) {
    console.log(err);
    res.render("home", { insertData: [] });
  }
});

// Admission form
app.get("/admission", (req, res) => {
  res.render("admission");
});

// Admission submit
app.post("/admission", upload.single("image"), async (req, res) => {
  try {
    let userData = req.body;

    // Unique Application ID & default status
    userData.applicationId = "APP-" + Date.now();
    userData.status = "pending";
    req.body.agreeAll = req.body.agreeAll === "true";

    // Adjust the image path by removing "public"
    userData.image = req.file.path.replace("public", "");

    // ----- Amount Handle -----
    if (req.body.payment === "offline") {
      userData.amount = req.body.amount;
    } else if (req.body.payment === "online") {
      userData.amount = 700; // Online fixed fee
    }

    // Save to database
    let newUser = new User(userData);
    await newUser.save();

    res.render("success", {
      applicationId: newUser.applicationId,
    });
  } catch (err) {
    console.error(err);
    res.send("Error submitting form: " + err.message);
  }
});

// Admission conditions
app.get("/admission/conditions", (req, res) => {
  res.render("admissionRules");
});

// Track form
app.get("/track", (req, res) => {
  res.render("trackForm");
});

// Track result
app.post("/track", async (req, res) => {
  let appId = req.body.applicationId;
  let user = await User.findOne({ applicationId: appId });

  if (!user) {
    return res.send("Invalid Application ID!");
  }
  res.render("trackResult", { user });
});

// ID Card
app.get("/idcard/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.render("idCard", { user });
  } catch (err) {
    res.status(500).send("Error loading ID card");
  }
});

// Admin login
app.get("/admin/login", (req, res) => {
  res.render("adPassword");
});

app.post("/admin/login", (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }
  res.send("Wrong Password!");
});
// ================== Admin Routes ==================
// Admin panel
app.get("/admin", isAdmin, async (req, res) => {
  try {
    let users = await User.find();
    res.render("admin", { users });
  } catch (err) {
    console.log(err);
    res.render("admin", { users: [] });
  }
});
// Show Admin Add Class Page

// Admin form submission
app.post("/admin/class/new", isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, description, kitab } = req.body;

    const kitabArray = kitab ? kitab.split(",").map(k => k.trim()) : [];

    const newClass = new Class({
      name,
      description,
      image: req.file ? "/uploads/" + req.file.filename : null,
      kitab: kitabArray,
    });

    await newClass.save();
    res.redirect("/admin/classes");
  } catch (err) {
    console.error("Error saving class:", err);
    res.send("Error saving class: " + err.message);
  }
});
  // Class card route
app.get("/classes", async (req, res) => {
  try {
    const classes = await Class.find();
    res.render("classes", { classes });
  } catch (err) {
    console.error(err);
    res.send("Error loading classes");
  }
});


// Show Admin Classes
app.get("/admin/classes", isAdmin, async (req, res) => {
  try {
    const classes = await Class.find();
    res.render("admin_classes", { classes });
  } catch (err) {
    console.error(err);
    res.send("Error loading classes");
  }
});

// Class Details Page
app.get("/class/:id", async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);
    if (!classData) return res.send("Class not found");

    // Students list for this class
    const students = await User.find({ classId: req.params.id });

    res.render("class_details", { classData, students });
  } catch (err) {
    console.error(err);
    res.send("Error loading class details");
  }
});



// Class Details Page
app.get("/class/:id", async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);
    if (!classData) return res.send("Class not found");

    // যে students এই class এ আছে
    const students = await User.find({ classId: req.params.id });

    res.render("class_details", { classData, students });
  } catch (err) {
    console.error(err);
    res.send("Error loading class details");
  }
});



// Accept user
app.post("/accept/:id", isAdmin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { status: "accepted" });
  res.redirect("/admin");
});

// Edit form
app.get("/edit/:id", isAdmin, async (req, res) => {
  let user = await User.findById(req.params.id);
  res.render("edit", { user });
});

app.post("/edit/:id", isAdmin, upload.single("image"), async (req, res) => {
  try {
    let updateData = { ...req.body };
    if (req.file) {
      updateData.image = req.file.path.replace("public", "");
    }

    await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.redirect("/admin");
  } catch (err) {
    console.error("Error updating user:", err);
    res.send("Update failed!");
  }
});

// Delete user
app.post("/delete/:id", isAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect("/admin");
});

// Donation page
app.get("/donation", (req, res) => {
  res.render("donation");
});

// ---------------- Server ----------------
const port = 8080;
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});