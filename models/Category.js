const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
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
  Icon: { type: String },
  homeService: { type: Boolean },
  status: { type: String, default: "Active" },
});

const Category = mongoose.model("Category", CategorySchema);

module.exports = Category;
