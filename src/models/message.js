const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chatKey: { type: String, required: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    text: { type: String, required: true, trim: true, maxLength: 1000 },
    unread: { type: Boolean, default: true },
  },
  { timestamps: true }
);

messageSchema.index({ chatKey: 1, createdAt: -1 });
messageSchema.index({ toUserId: 1, unread: 1 });
messageSchema.index({ fromUserId: 1, createdAt: -1 });
messageSchema.index({ toUserId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
