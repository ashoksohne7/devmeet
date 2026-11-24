const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chatKey: { type: String, required: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    text: { type: String, required: true, trim: true, maxLength: 1000 },
  },
  { timestamps: true }
);

messageSchema.index({ chatKey: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
