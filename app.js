const express = require("express")
const app = express();
const path = require("path");
const ejs = require("ejs");
const mongoose = require("mongoose");
const User = require("./model/data/data");


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));




////details route

app.get("/users/:id", async (req, res) => {
  try {
    let user = await User.findById(req.params.id);
    res.render("detail", { user });
  } catch (err) {
    console.log(err);
    res.render("detail", { user: {} });
  }
});

//home route

app.get("/", async (req, res) => {
  try {
    let data = await User.find(); 
    newFunction(data); 
  } catch (err) {
    console.log(err);
    res.render("home", { insertData: [] }); 
  }

  function newFunction(data) {
    res.render("home", { insertData: data });
  }
});

///admission form route
app.get("/admission", (req, res) => {
  res.render("admission");
});




//admission route
app.post("/admission", (req, res) => {
  let user = req.body;
    user.old = user.old === "on";
  user.new = user.new === "on";
  user.insertData = new User(user);
  user.insertData.save();
  res.redirect("/");
});

// donation route

app.get("/donation", (req, res) => {
  res.render("donation");
});


const port = 8080
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});