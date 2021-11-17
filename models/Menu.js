const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MenuSchema = new Schema(
  {
    menuname: { type: String },
    url: { type: String },
    children: [
      {
        menuname: { type: String },
        url: { type: String },
      },
    ],
    type: [{ type: String }],
  },

  { timestamps: true }
);

const Menu = mongoose.model("Menu", MenuSchema);

module.exports = Menu;
