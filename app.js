require("dotenv").config();
const express = require("express");
const app = express();
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const morgan = require("morgan");

app.use(morgan("dev"));

mongoose
  .connect("mongodb://localhost:27017/userDB")
  .then(() => {
    console.log("DATABASE CONNECTED");
  })
  .catch(() => {
    console.log("DATABASE IS NOT UP");
  });

app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const secret = process.env.MONGOOSE_ENCRYPTION_SECRET;

userSchema.plugin(encrypt, { secret, encryptedFields: ["password"] });

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const user = await User.findOne({
    email: req.body.username,
  });
  if (user && user.password === req.body.password) {
    console.log(user.password);
    res.render("secrets");
  } else {
    console.log("ERROR-User does not exist");
    res.send("You shall not pass");
  }
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const newUser = new User({
    email: req.body.username,
    password: req.body.password,
  });
  newUser.save((err) => {
    if (err) {
      console.log(err);
    } else {
      res.render("secrets");
    }
  });
});

app.listen(3000, () => {
  console.log("App running on port 3000");
});
