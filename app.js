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
app.use(session({ 
  secret: 'Our little secret.',
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
  password: String
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

app.get("/register", (req, res) => {
  res.render("register");
})

app.get("/secrets", (req, res) => {
  // Here we are checking whether the user is authenticated
  if (req.isAuthenticated()) {
    res.render('secrets');
  }
  else {
    res.redirect('/login');
  }
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
  
})




app.listen(port, function () {
    console.log("Server started on port 3000");
})
