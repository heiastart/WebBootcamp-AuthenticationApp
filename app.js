//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption"); - using md5 hashing instead
// const md5 = require("md5"); -> using bcrypt instead
const bcrypt = require("bcrypt");
const saltRounds = 10;
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
// MongoDB code, i.e connect to db, create new schema and model (for collection) from that schema
// mongoose.connect(), const <name>Schema = new mongoose.Schema{}, const Post = mongoose.model();
// ---------------------------------------------------------------------------------------
const dbURI = process.env.DB_URI;
mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

// Using the "Secret string instead of two keys" way from https://www.npmjs.com/package/mongoose-encryption
// Also, we only want to encrypt the password, which we must specify
const secret = process.env.DB_EncryptKey;
// userSchema.plugin(encrypt, {secret: secret, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);



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



// ----------------------------------------------------------------
// POST-request code to the different routes
// ----------------------------------------------------------------
app.post("/register", (req, res) => {
  // Using bcrypt to generate a random salt and then use it (with the user's password) to calculate the final hash
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    if (err) {
      console.log(err);
    } 
    else {
      // Creating an object of the model to store the new user as a document in the database
      const newUser = new User({
      // Must fetch the data from the email and password fields, using their name attribute
      // Then we store the hash of the data in the database
      email: req.body.username,
      password: hash
      });

      newUser.save((err) => {
        if (err){
          console.log(err);
        }
        else{
          // If no error, send OK message
          // We're only rendering the secrets page if the user excists!!
          // res.status(200).send("User saved successfully!"); -> did not work
          res.render("secrets");
          console.log("User saved successfully, using bcrypt hashing!");
        } 
      });  
    }
  });
})

app.post("/login", (req, res) => { 
  const username = req.body.username;
  const password = req.body.password;

  // Here, we're basically checking if the user already exists in the database
  User.findOne({email: username}, (err, foundUser) => {
    if (err) {
      console.log(err);
    } 
    else {
      if (foundUser) {
        // Using bcrypt to check the given password's hash against the hash in the database
        // First parameter is the user's password that he types in, second parameter is the stored db-hash from foundUser that is returned
        // from the findOne() query!
        bcrypt.compare(password, foundUser.password, function(err, result) {
          if (result === true) {
            // Finally, we can serve the user the secrets-page since he has typed the correct password
            res.render("secrets");
            console.log("User logged in successfully, using bcrypt hashing!");
          }
        });
      }  
    }
  });
})




app.listen(port, function () {
    console.log("Server started on port 3000");
})
