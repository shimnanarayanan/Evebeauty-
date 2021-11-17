const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const xss = require("xss-clean");

const dotenv = require("dotenv");

dotenv.config();

const db = require("./utils/db");
const _ = require("lodash");
const moment = require("moment-timezone");
moment.tz.setDefault("Asia/Qatar");

// import routes
const apiRouter = require("./routes/api");

const app = express();
app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
//Logging
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

//Set Security headers
app.use(helmet());
//Prevent XSS attacks
app.use(xss());

app.use("/api", apiRouter.router);

app.get("/", (req, res) => {
  res.status(200).send({
    message: "Welcome to Evebeauty!",
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV}  mode on port: ${port}`
  );
});
