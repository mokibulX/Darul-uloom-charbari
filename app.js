const express = require("express");
const app = express();
const path = require("path");
const ejs = require("ejs");
const mongoose = require("mongoose");
const User = require("./model/data/data");   // ✅ শুধু একবার রাখা হলো
require("dotenv").config();
const session = require("express-session");
const multer = require("multer");


// ---------------- App Setup ----------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));



// storage সেটআপ
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/"); // ফাইল যাবে এই ফোল্ডারে
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });


// app.js এর উপরে mongoose require করার পর সংযোগ করুন
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

    // Image path ঠিক করা
    userData.image = req.file.path.replace("public", "");

    // ----- Amount Handle -----
    let amount = 0;
    if (req.body.payment === "offline") {
      userData.amount = req.body.amount;
    } else if (req.body.payment === "online") {
      userData.amount = 700; // Online fixed fee
    }

    // ----- Save to DB -----
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

// Accept
app.post("/accept/:id", isAdmin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { status: "accepted" });
  res.redirect("/admin");
});

// Edit form
app.get("/edit/:id", isAdmin, async (req, res) => {
  let user = await User.findById(req.params.id);
  res.render("edit", { user });
});

app.post("/edit/:id", isAdmin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, req.body);
  res.redirect("/admin");
});

// Delete
app.post("/delete/:id", isAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect("/admin");
});

// Donation
app.get("/donation", (req, res) => {
  res.render("donation");
});

// ---------------- Server ----------------
const port = 8080;
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
