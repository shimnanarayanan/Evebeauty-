const mongoose = require("mongoose");

const VersionSchema = new mongoose.Schema(
  {
    version: {
      type: String,
    },
    dateAdded: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Version = mongoose.model("Version", VersionSchema);

module.exports = Version;
