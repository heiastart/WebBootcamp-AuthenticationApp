//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

// const encrypt = require("mongoose-encryption"); - using md5 hashing instead
// const md5 = require("md5"); -> using bcrypt instead
// const bcrypt = require("bcrypt"); -> using passport instead
// const saltRounds = 10;
// const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


// ---------------------------------------------------------------------------------------
// MIDDLEWARE (code before going to the route) for creating sessions for the client
// Using app.use() for this...
// NB: the middleware MUST be added BEFORE the db-code and the code for the different routes!!!!
// ---------------------------------------------------------------------------------------
// Initializing the session:
const secret = process.env.DB_EncryptKey;
app.use(session({ 
  secret: secret,
  resave: false,
  saveUninitialized: false
  }
));

// Initializing passport:
app.use(passport.initialize());
app.use(passport.session());


// ---------------------------------------------------------------------------------------
// MongoDB code, i.e connect to db, create new schema and model (for collection) from that schema
// mongoose.connect(), const <name>Schema = new mongoose.Schema{}, const Post = mongoose.model();
// ---------------------------------------------------------------------------------------
const dbURI = process.env.DB_URI;
mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  secret: String
});

// This line is for the final passport version of the app :)
userSchema.plugin(passportLocalMongoose);

// ALL the out-commented code below is for the encrypt/hashing part
// Using the "Secret string instead of two keys" way from https://www.npmjs.com/package/mongoose-encryption
// Also, we only want to encrypt the password, which we must specify
// const secret = process.env.DB_EncryptKey;
// userSchema.plugin(encrypt, {secret: secret, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);
// Then we need to set up the Passport-Local Configuration, which basically enables Mongoose to access the cookie and fetch the information
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// ---------------------------------------------------------------------------------------
// GET-request code to the different routes
// app.get(), app.route("for fixed route") or router.get -> using object of express.Router().
// ---------------------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.render("home");
})

app.get("/login", (req, res) => {
  res.render("login");
})

app.get("/logout", (req, res) => {
  // Here, we "de-authenticate" the user (i.e ending the session) before sending him back to the home page
  req.logout();
  res.redirect("/");
})

app.get("/register", (req, res) => {
  res.render("register");
})

app.get("/submit", (req, res) => {
  // First we check if the user is logged in/authenticated
  if (req.isAuthenticated()) {
    res.render('submit');
  }
  else {
    res.redirect('/login');
  }
})

app.get("/secrets", (req, res) => {
  // For the final part of the this app, we want everybody to be able to see everybodys posted secrets...
  // Therefore, no need to check for authentication
  User.find({"secret": {$ne:null}}, (err, foundUsers) => {
      if (err){
        console.log(err);
      }
      else {
        if (foundUsers){
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
      }
   })
})


// ----------------------------------------------------------------
// POST-request code to the different routes
// Last step was to use passport package, therefore all previous code for the POST-requests was deleted
// ----------------------------------------------------------------
app.post("/register", (req, res) => {
  // This method comes from the passport-local-mongoose package
  User.register({username: req.body.username}, req.body.password, (err, regUser) => {
    if (err) {
      console.log(err);
      res.redirect('/register');
    }
    else {
      // No errors, thus we're gonna authenticate the user using passport
      // local is the type of authentication
      passport.authenticate("local")(req, res, function (){
        res.redirect('/secrets');
      });
    }
  });
})


app.post("/login", (req, res) => {  
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  // We then use passport to login this user and authenticate him/her using a built-in login() method on the req object
  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } 
    else {
      // We can now authenticate the user, using passport, since he was able to log in
      passport.authenticate("local")(req, res, function (){
        res.redirect('/secrets');
      });
    }
  })
})

app.post("/submit", (req, res) => {
  const submittedSecret = req.body.secret;

  // We then must find which user is logged in and save the new secret to his/her user account...and passport has a method for this
  console.log(req.user.id);

  User.findById(req.user.id, (err, foundUser) => {
    if (err) {
      console.log(err);
    } 
    else {
      if (foundUser) {
        // Add the submitted secret to the foundUser account (i.e the secret field in the db schema)
        foundUser.secret = submittedSecret;
        foundUser.save(() => {
          res.redirect("/secrets");
        });
      }
    }
  })
})


app.listen(port, function () {
    console.log("Server started on port 3000");
})
