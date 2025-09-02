// -------------------------
// app.js
// -------------------------

const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const multer = require("multer");
require("dotenv").config();
const puppeteer = require("puppeteer");

// ---------------- Models ----------------
const User = require("./model/data/data");
const Class = require("./model/class");
const Result = require("./model/result");
const Subject = require("./model/subject");


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
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

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

// ---------------- Home ----------------
app.get("/", async (req, res) => {
  try {
    const students = await User.find({ status: "accepted" }).populate("classId").lean();
    const classes = await Class.find().lean();
    res.render("home", { insertData: students, classes });
  } catch (err) {
    console.error(err);
    res.render("home", { insertData: [], classes: [] });
  }
});

// ---------------- Students ----------------
app.get("/all-students", async (req, res) => {
  try {
    const students = await User.find({ status: "accepted" }).populate("classId").lean();
    const classMap = {};
    students.forEach(s => {
      const className = s.classId ? s.classId.name : "Unassigned";
      if (!classMap[className]) classMap[className] = [];
      classMap[className].push(s);
    });
    res.render("students", { classMap });
  } catch (err) {
    console.error(err);
    res.render("students", { classMap: {} });
  }
});

// ---------------- Admission ----------------
app.get("/admission", async (req, res) => {
  try {
    const classes = await Class.find().lean();
    res.render("admission", { classes });
  } catch {
    res.render("admission", { classes: [] });
  }
});

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

app.get("/admission/conditions", (req, res) => res.render("admissionRules"));

// ---------------- User Detail / Password ----------------
app.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.send("User not found");
    if (req.session.isAdmin) return res.render("detail", { user });
    res.render("password", { id: req.params.id });
  } catch {
    res.send("Something went wrong");
  }
});

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
  const user = await User.findOne({ applicationId: req.body.applicationId }).lean();
  if (!user) return res.send("Invalid Application ID!");
  res.render("trackResult", { user });
});

// ---------------- ID Card ----------------
app.get("/idcard/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    res.render("idCard", { user });
  } catch {
    res.status(500).send("Error loading ID card");
  }
});

// ---------------- Admin ----------------
app.get("/admin/login", (req, res) => res.render("adPassword"));

app.post("/admin/login", (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }
  res.send("Wrong Password!");
});

app.get("/admin", isAdmin, async (req, res) => {
  try {
    const users = await User.find().lean();
    res.render("admin", { users });
  } catch {
    res.render("admin", { users: [] });
  }
});

// ---------------- Classes ----------------
app.post("/admin/class/new", isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, description, kitab } = req.body;
    const kitabArray = kitab ? kitab.split(",").map(k => k.trim()) : [];
    const newClass = new Class({
      name,
      description,
      image: req.file ? "/uploads/" + req.file.filename : null,
      kitabs: kitabArray,
    });
    await newClass.save();
    res.redirect("/admin/classes");
  } catch (err) {
    res.send("Error saving class: " + err.message);
  }
});

app.get("/admin/classes", isAdmin, async (req, res) => {
  try {
    const classes = await Class.find().lean();
    res.render("admin_classes", { classes });
  } catch {
    res.send("Error loading classes");
  }
});

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

app.get("/classes", async (req, res) => {
  try {
    const classes = await Class.find().lean();
    res.render("classes", { classes });
  } catch {
    res.send("Error loading classes");
  }
});

app.get("/class/:id", async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id).lean();
    if (!classData) return res.send("Class not found");
    const students = await User.find({ classId: req.params.id }).lean();
    res.render("class_details", { classData, students });
  } catch {
    res.send("Error loading class details");
  }
});

// Admin Result Upload - GET
app.get("/admin/result/upload", isAdmin, async (req, res) => {
  try {
    const classes = await Class.find().lean();
    res.render("uploadResult", { classes });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading result upload page");
  }
});


// GET /admin/result/upload-form
app.get("/admin/result/upload-form", isAdmin, async (req, res) => {
  try {
    const classes = await Class.find().lean();
    let students = [];
    let kitabs = [];

    if (req.query.classId) {
      const selectedClass = await Class.findById(req.query.classId).lean();
      if (selectedClass) {
        students = await User.find({ classId: selectedClass._id }).lean();
        kitabs = selectedClass.kitab || [];
      }
    }

    res.render("uploadResultForm", {
      classes,
      students,
      kitabs,
      selectedClassId: req.query.classId || "",
    });
  } catch (err) {
    console.error(err);
    res.send("Error loading upload form");
  }
});


// ---------------- Admin Result Upload POST ----------------
app.post("/admin/result/upload", isAdmin, async (req, res) => {
  try {
    const { classId, examMonth, examYear, studentResults } = req.body;
    if (!studentResults) return res.status(400).send("No results provided");

    for (let studentId in studentResults) {
      const marksData = studentResults[studentId].marks;
      let subjects = [];
      let totalMarks = 0;

      for (let kitab in marksData) {
        const obtained = parseInt(marksData[kitab]) || 0;
        subjects.push({ kitab, obtainedMark: obtained, fullMark: 100 });
        totalMarks += obtained;
      }

      const passFail = subjects.every(s => s.obtainedMark >= 40) ? "Pass" : "Fail";
      const percentage = subjects.length ? (totalMarks / (subjects.length * 100)) * 100 : 0;
      let division = "Fail";
      if (passFail === "Pass") {
        if (percentage >= 60) division = "1st";
        else if (percentage >= 45) division = "2nd";
        else division = "3rd";
      }

      await Result.findOneAndDelete({ classId, studentId, examMonth, examYear });

      await Result.create({
        classId,
        studentId,
        subjects,
        totalMarks,
        passFail,
        division,
        examMonth,
        examYear
      });
    }

    res.redirect(`/results/view/${classId}?examMonth=${examMonth}&examYear=${examYear}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error uploading results");
  }
});

// ---------------- View Class Result ----------------

app.get("/student/result/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId, examYear } = req.query;

    if (!classId || !examYear) return res.send("Class and Exam Year required");

    const student = await User.findById(studentId).lean();
    if (!student) return res.send("Student not found");

    const classInfo = await Class.findById(classId).lean();
    if (!classInfo) return res.send("Class not found");

    const result = await Result.findOne({ studentId, classId, examYear }).lean();
    if (!result) return res.send("Result not found");

    const allResults = await Result.find({ classId, examYear }).sort({ totalMarks: -1 }).lean();
    allResults.forEach((r, idx) => r.position = idx + 1);
    const position = allResults.findIndex(r => r.studentId.toString() === studentId) + 1;

    const kitabs = (classInfo.kitab || []).map(k => k.trim());
    if (result.subjects) {
      result.subjects = result.subjects.map(s => ({ ...s, kitab: String(s.kitab).trim() }));
    }

    res.render("studentResultCard", { student, classInfo, result, kitabs, position, examYear });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// card download

// ----------------------------
// ---------------- Student Result PDF ----------------
app.get("/student/result/:studentId/pdf", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId, examYear } = req.query;

    if (!classId || !examYear) return res.send("Class and Exam Year required");

    const student = await User.findById(studentId).lean();
    if (!student) return res.send("Student not found");

    const classInfo = await Class.findById(classId).lean();
    if (!classInfo) return res.send("Class not found");

    const result = await Result.findOne({ studentId, classId, examYear }).lean();
    if (!result) return res.send("Result not found");

    const allResults = await Result.find({ classId, examYear }).sort({ totalMarks: -1 }).lean();
    allResults.forEach((r, idx) => r.position = idx + 1);
    const position = allResults.findIndex(r => r.studentId.toString() === studentId) + 1;

    const kitabs = (classInfo.kitab || []).map(k => k.trim());
    if (result.subjects) {
      result.subjects = result.subjects.map(s => ({ ...s, kitab: String(s.kitab).trim() }));
    }

    const photoUrl = student.image ? req.protocol + "://" + req.get("host") + student.image : req.protocol + "://" + req.get("host") + "/default.png";

    const ejs = require("ejs");
    const html = await ejs.renderFile(__dirname + "/views/studentResultCardPDFPremium.ejs", {
      student: { ...student, image: photoUrl },
      classInfo,
      result,
      kitabs,
      position,
      examYear
    });

    const puppeteer = require("puppeteer");
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "20px", bottom: "20px" } });
    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${student.name}_Result.pdf"`
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating PDF");
  }
});




app.get("/results/view", async (req, res) => {
  try {
    const { classId, examYear } = req.query;

    // Class info
    const classInfo = await Class.findById(classId).lean();
    if (!classInfo) return res.send("Class not found");

    // Results for the class and year
    const results = await Result.find({ classId, ...(examYear ? { examYear } : {}) })
      .populate("studentId", "name image applicationId")
      .lean();

    // Fetch subjects (kitabs)
    const subjects = await Subject.find({ classId }).lean();
    const kitabs = subjects.map(s => s.name);

    // Sort by totalMarks descending for position calculation
    results.sort((a, b) => b.totalMarks - a.totalMarks);
    results.forEach((r, idx) => {
      r.position = idx + 1;
    });

    res.render("resultReport", {
      classInfo,
      results,
      kitabs,
      examYear: examYear || "",
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// Select Class & Exam Year page
app.get("/results", async (req, res) => {
  try {
    const classes = await Class.find().lean();
    res.render("resultsSelect", { classes });
  } catch (err) {
    console.error(err);
    res.send("Error loading classes");
  }
});




// ---------------- Donations & Policy ----------------
app.get("/donation", (req, res) => res.render("donation"));
app.get("/privacy", (req, res) => res.render("privacy"));
app.get("/terms", (req, res) => res.render("terms"));

// ---------------- Server ----------------
const port = 8080;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
