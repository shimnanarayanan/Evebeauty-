const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StaffSchema = new Schema({
  saloon: { type: Schema.Types.ObjectId, required: true, ref: "Saloon" },
  name: {
    english: {
      type: String,
      required: true,
      index: true,
    },
    arabic: {
      type: String,
    },
  },
  mainImage: { type: String },
  services: [{ type: Schema.Types.ObjectId, ref: "Services" }],
  status: { type: String, default: "Active" },
});

const Staff = mongoose.model("Staff", StaffSchema);

module.exports = Staff;
