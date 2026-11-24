const express = require("express");
const bcrypt = require("bcrypt");
const authRouter = express.Router();

const { validateSignUpData } = require("../utils/validation");
const User = require("../models/user");

// compared against when the email does not exist, so response time
// does not reveal which emails are registered
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 8 * 60 * 60 * 1000,
};

const publicUser = (user) => {
  const { password, __v, ...safe } = user.toObject();
  return safe;
};

const isString = (v) => typeof v === "string";

authRouter.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, emailId, password } = req.body || {};
    if (![firstName, lastName, emailId, password].every(isString)) {
      throw new Error("Invalid signup details");
    }
    validateSignUpData(req);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailId,
      password: passwordHash,
    });
    await user.save();

    // log the user in right away: one request, one hash
    const token = await user.getJWT();
    res.cookie("token", token, cookieOptions);
    res.status(201).json({ message: "Account created", data: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).send("An account with this email already exists.");
    }
    if (err.name === "ValidationError") {
      const first = Object.values(err.errors || {})[0];
      return res.status(400).send(first?.message || "Please check your details.");
    }
    res.status(400).send(err.message);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body || {};
    if (!isString(emailId) || !isString(password)) {
      return res.status(400).send("Invalid email or password");
    }

    const user = await User.findOne({ emailId: emailId.trim().toLowerCase() });
    let ok = false;
    if (user) {
      ok = await user.validatePassword(password);
    } else {
      await bcrypt.compare(password, DUMMY_HASH);
    }
    if (!ok) return res.status(401).send("Invalid email or password");

    const token = await user.getJWT();
    res.cookie("token", token, cookieOptions);
    res.json({ message: "Logged in", data: publicUser(user) });
  } catch (err) {
    res.status(500).send("Something went wrong. Please try again.");
  }
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieOptions.secure,
  });
  res.send("Logged out");
});

module.exports = authRouter;
