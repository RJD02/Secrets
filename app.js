require("dotenv").config();
const express = require("express");
const app = express();
const ejs = require("ejs");
const mongoose = require("mongoose");
const morgan = require("morgan");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-find-or-create");

app.use(morgan("dev"));

app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "I am Raviraj Dulange.",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
mongoose
  .connect(process.env.MONGO_DB_CONNECT)
  .then(() => {
    console.log("DATABASE CONNECTED");
  })
  .catch(() => {
    console.log("DATABASE IS NOT UP");
  });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  googleId: String,
  secrets: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// const secret = process.env.MONGOOSE_ENCRYPTION_SECRET;

// userSchema.plugin(encrypt, { secret, encryptedFields: ["password"] });

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        "https://evening-river-18409.herokuapp.com/auth/google/secrets",
    },
    (accessToken, refreshToken, profile, cb) => {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) res.render("submit");
  else res.redirect("/login");
});

app.post("/submit", async (req, res) => {
  const submittedSecret = req.body.secret;

  console.log(req.user);
  try {
    const foundUser = await User.findById(req.user.id);
    if (foundUser) {
      foundUser.secrets = submittedSecret;
      await foundUser.save();
      res.redirect("/secrets");
    }
  } catch (e) {
    console.log(e);
    res.redirect("/secrets");
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/secrets");
  }
);

app.get("/secrets", async (req, res) => {
  try {
    const allSecrets = await User.find({ secrets: { $ne: null } });
    if (allSecrets) {
      res.render("secrets", { usersWithSecrets: allSecrets });
    }
  } catch (e) {
    console.log(e);
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    async (err, user) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
        await user.save();
      }
    }
  );
});

app.get("/logout", (req, res) => {
  res.redirect("/");
});

app.listen(3000, () => {
  console.log("App running on port 3000");
});
