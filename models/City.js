const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CitySchema = new Schema({
  name: {
    english: {
      type: String,
    },
    arabic: {
      type: String,
    },
  },
});

const City = mongoose.model("City", CitySchema);

module.exports = City;
