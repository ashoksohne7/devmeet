const express = require("express");
const jwt = require("jsonwebtoken");
const chatRouter = express.Router();

const { userAuth } = require("../middleware/auth");
const Message = require("../models/message");
const { isId, chatKey, areConnected, serialize } = require("../utils/chat");

// short-lived token the browser uses to open the socket
chatRouter.get("/chat/token", userAuth, (req, res) => {
  const token = jwt.sign(
    { _id: String(req.user._id), purpose: "socket" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );
  res.json({ token });
});

chatRouter.get("/chat/:otherId", userAuth, async (req, res) => {
  try {
    const { otherId } = req.params;
    if (!isId(otherId)) return res.status(400).send("Invalid user");

    const me = String(req.user._id);
    if (!(await areConnected(me, otherId))) {
      return res.status(403).send("You can only view chats with your connections.");
    }

    const filter = { chatKey: chatKey(me, otherId) };
    if (req.query.before) {
      const d = new Date(String(req.query.before));
      if (!isNaN(d)) filter.createdAt = { $lt: d };
    }

    const rows = await Message.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    const hasMore = rows.length === 50;
    res.json({ data: rows.reverse().map(serialize), hasMore });
  } catch (err) {
    res.status(500).send("Could not load messages.");
  }
});

module.exports = chatRouter;
