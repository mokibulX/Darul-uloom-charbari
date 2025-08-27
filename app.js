const express = require("express")
const app = express();
const path = require("path");
const ejs = require("ejs");
const mongoose = require("mongoose");
const User = require("./model/data/data");
require('dotenv').config();
const session = require("express-session");


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,  // কোনো strong secret দিন
  resave: false,
  saveUninitialized: true
}));


///password function


function isAdmin(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect("/admin/login");  // password না দিলে admin login এ ফেরত যাবে
  }
}


// password middleware
// Student details route
app.get("/users/:id", async (req, res) => {
  try {
    // যদি admin login করা থাকে → সরাসরি details দেখাও
    if (req.session.isAdmin) {
      let user = await User.findById(req.params.id);
      if (!user) return res.send("User not found");
      return res.render("detail", { user });
    }

    // admin না হলে → password form দেখাও
    res.render("password", { id: req.params.id });

  } catch (err) {
    console.log(err);
    res.send("Something went wrong");
  }
});

//  password check
app.post("/users/:id", async (req, res) => {
  try {
    let user = await User.findById(req.params.id); 
    if (!user) return res.send("User not found");
     if (req.session.isAdmin) {
     return res.render("detail", { user });
  }

    if (req.body.password !== user.password) {
      return res.send("Wrong password!");
    }

    res.render("detail", { user });

  } catch (err) {
    console.log(err);
    res.render("detail", { user: {} });
  }
});


//home route
app.get("/", async (req, res) => {
  try {
    let data = await User.find({ status: "accepted" }); // শুধু approved ইউজার
    res.render("home", { insertData: data });
  } catch (err) {
    console.log(err);
    res.render("home", { insertData: [] });
  }
});

///admission form route
app.get("/admission", (req, res) => {
  res.render("admission");
});

//admission route
app.post("/admission", async (req, res) => {
  let userData = req.body;
  userData.old = userData.old === "on";
  userData.new = userData.new === "on";
  userData.status = "pending";   // by default pending অবস্থায় যাবে

  let newUser = new User(userData);
  await newUser.save();

  res.send("Your admission form has been submitted and is pending approval.");
});

// Login form দেখানোর জন্য
app.get("/admin/login", (req, res) => {
  res.render("adPassword"); // এখানে password form থাকবে
});

// Login form submit করলে check
app.post("/admin/login", (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect("/admin"); // login সফল হলে admin panel এ যাবে
  }
  res.send(" Wrong Password!");
});

// admin route

app.get("/admin", isAdmin, async (req, res) => {
  try {
    let users = await User.find();
    res.render("admin", { users });  // এখানে সব student list আসবে
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

// Edit Form দেখানো
app.get("/edit/:id", isAdmin, async (req, res) => {
  let user = await User.findById(req.params.id);
  res.render("edit", { user });
});

// Edit Form Submit
app.post("/edit/:id", isAdmin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, req.body);
  res.redirect("/admin");
});

// Delete
app.post("/delete/:id", isAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect("/admin");
});

app.get("/donation", (req, res) => {
  res.render("donation");
});
/// port
const port = 8080
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});