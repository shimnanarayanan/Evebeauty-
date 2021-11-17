const mongoose = require("mongoose");

const RecentlySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  saloon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Saloon",
    required: true,
  },
  visited: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});
const Recently = mongoose.model("Recently", RecentlySchema);

module.exports = Recently;
