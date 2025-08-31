const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const multer = require("multer");
require("dotenv").config();
const Result = require("./model/result");

// Models
const User = require("./model/data/data");
const Student = require("./model/student");
const Class = require("./model/class");

// ---------------- App Setup ----------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// ---------------- Multer Setup ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ---------------- MongoDB Connection ----------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("MongoDB connection error:", err));

// ---------------- Session ----------------
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// ---------------- Middleware ----------------
const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) return next();
  res.redirect("/admin/login");
};


///home route 

// Home page route
app.get("/", async (req, res) => {
  try {
    // Accepted students
    const students = await User.find({ status: "accepted" }).populate('classId');

    // All classes
    const classes = await Class.find();

    res.render("home", {
      insertData: students,
      classes: classes
    });
  } catch (err) {
    console.error("Error loading home page:", err);
    res.render("home", {
      insertData: [],
      classes: []
    });
  }
});


// ---------------- Routes ----------------
// All students - grouped by class
app.get("/all-students", async (req, res) => {
  try {
    const data = await User.find({ status: "accepted" }).populate("classId");

    const classMap = {};
    data.forEach(student => {
      const className = student.classId ? student.classId.name : "Unassigned";
      if (!classMap[className]) classMap[className] = [];
      classMap[className].push(student);
    });
    res.render("students", { insertData: data, classMap });
  } catch (err) {
    console.error(err);
    res.render("students", { insertData: [], classMap: {} });
  }
});


// ---------------- Admission ----------------

// Admission Form
app.get("/admission", async (req, res) => {
  try {
    const classes = await Class.find();
    res.render("admission", { classes });
  } catch {
    res.render("admission", { classes: [] });
  }
});

// Admission Submission (with password hashing ready)
app.post("/admission", upload.single("image"), async (req, res) => {
  try {
    const userData = {
      ...req.body,
      pin: Number(req.body.pin),
      phone: Number(req.body.phone),
      age: Number(req.body.age),
      agreeAll: req.body.agreeAll === "true",
      applicationId: "APP-" + Date.now(),
      status: "pending",
      amount: req.body.payment === "online" ? 700 : Number(req.body.amount),
      image: req.file ? req.file.path.replace("public", "") : null,
    };

    const newUser = new User(userData);
    await newUser.save();

    res.render("success", { applicationId: newUser.applicationId });
  } catch (err) {
    console.error(err);
    res.send("Error submitting form: " + err.message);
  }
});

// Admission Conditions
app.get("/admission/conditions", (req, res) => {
  res.render("admissionRules");
});

// ---------------- User Detail / Password ----------------

// View Student Details
app.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.send("User not found");

    if (req.session.isAdmin) return res.render("detail", { user });

    res.render("password", { id: req.params.id });
  } catch {
    res.send("Something went wrong");
  }
});

// Password Check (hashed password ready)
app.post("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.send("User not found");

    const isMatch = await user.comparePassword(req.body.password);
    if (!isMatch) return res.send("Wrong password!");

    res.render("detail", { user });
  } catch {
    res.render("detail", { user: {} });
  }
});

// ---------------- Track ----------------
app.get("/track", (req, res) => res.render("trackForm"));

app.post("/track", async (req, res) => {
  const user = await User.findOne({ applicationId: req.body.applicationId });
  if (!user) return res.send("Invalid Application ID!");
  res.render("trackResult", { user });
});

// ---------------- ID Card ----------------
app.get("/idcard/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.render("idCard", { user });
  } catch {
    res.status(500).send("Error loading ID card");
  }
});

// ---------------- Admin ----------------

// Admin Login
app.get("/admin/login", (req, res) => res.render("adPassword"));

app.post("/admin/login", (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }
  res.send("Wrong Password!");
});

// Admin Dashboard
app.get("/admin", isAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.render("admin", { users });
  } catch {
    res.render("admin", { users: [] });
  }
});

// Add New Class
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
    res.send("Error saving class: " + err.message);
  }
});

// Show Admin Classes
app.get("/admin/classes", isAdmin, async (req, res) => {
  try {
    const classes = await Class.find();
    res.render("admin_classes", { classes });
  } catch {
    res.send("Error loading classes");
  }
});

// Delete Class
app.post("/admin/class/delete/:id", isAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    await Class.findByIdAndDelete(classId);
    await User.updateMany({ classId }, { $unset: { classId: "" } });
    res.redirect("/admin/classes");
  } catch (err) {
    res.send("Class delete failed: " + err.message);
  }
});

// Class Card Page
app.get("/classes", async (req, res) => {
  try {
    const classes = await Class.find();
    res.render("classes", { classes });
  } catch {
    res.send("Error loading classes");
  }
});

// Class Details Page
app.get("/class/:id", async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);
    if (!classData) return res.send("Class not found");

    const students = await User.find({ classId: req.params.id });
    res.render("class_details", { classData, students });
  } catch {
    res.send("Error loading class details");
  }
});

// ---------------- Accept / Edit / Delete User ----------------
app.post("/accept/:id", isAdmin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { status: "accepted" });
  res.redirect("/admin");
});

app.get("/edit/:id", isAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  res.render("edit", { user });
});

app.post("/edit/:id", isAdmin, upload.single("image"), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) updateData.image = req.file.path.replace("public", "");
    await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.redirect("/admin");
  } catch {
    res.send("Update failed!");
  }
});

app.post("/delete/:id", isAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect("/admin");
});


/// result admin route


// Show result upload form
// Admin Result Upload Page

// Show Result Upload Page
app.get("/admin/result/upload", isAdmin, async (req, res) => {
  try {
    const classes = await Class.find();
    let students = [];
    let selectedClass = req.query.classId || null;

    if (selectedClass) {
      students = await Student.find({ classId: selectedClass });
    }

    res.render("adminResult", { classes, students, selectedClass });
  } catch (err) {
    console.error(err);
    res.send("Error loading result page");
  }
});

// Handle Result Submission
app.post("/admin/result/upload", isAdmin, async (req, res) => {
  try {
    const results = req.body.studentResults; // Array of student results
    const { classId, examMonth, examYear } = req.body;

    // Remove old results of the same class & exam if any
    await Result.deleteMany({ classId, examMonth, examYear });

    // Save new results
    for (let r of results) {
      let passFail = r.obtainedMark >= (r.fullMark * 0.33) ? "Pass" : "Fail";

      // Calculate division
      let division = "Fail";
      if (passFail === "Pass") {
        let percent = (r.obtainedMark / r.fullMark) * 100;
        if (percent >= 60) division = "First";
        else if (percent >= 45) division = "Second";
        else division = "Third";
      }

      await Result.create({
        classId,
        studentId: r.studentId,
        kitab: r.kitab,
        fullMark: r.fullMark,
        obtainedMark: r.obtainedMark,
        passFail,
        division,
        examMonth,
        examYear
      });
    }

    res.send("Results uploaded successfully!");
  } catch (err) {
    console.error(err);
    res.send("Error uploading results: " + err.message);
  }
});

//// result show route  
// Show class-wise results
app.get("/results", async (req, res) => {
  try {
    const classes = await Class.find();
    let results = [];
    let selectedClass = req.query.classId || null;

    if (selectedClass) {
      // Populate student info
      results = await Result.find({ classId: selectedClass })
        .populate("studentId", "name") // populate student name
        .sort({ obtainedMark: -1 }); // sorting by obtained marks for position
    }

    res.render("classResults", { classes, results, selectedClass });
  } catch (err) {
    console.error(err);
    res.send("Error loading results");
  }
});

//----------- Donation ----------------
app.get("/donation", (req, res) => res.render("donation"));

// ---------------- Privacy & Terms ----------------
app.get("/privacy", (req, res) => res.render("privacy"));
app.get("/terms", (req, res) => res.render("terms"));

// ---------------- Server ----------------
const port = 8080;
app.listen(port, () => console.log(`Server running on ${port}`));
