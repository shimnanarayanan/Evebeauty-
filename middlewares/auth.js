const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const authHeaders = req.header("Authorization");

    const guestToken = "#evebeauty";
    if (authHeaders == guestToken) {
      req.auth = { type: "guest" };
      return next();
    }

    const token = req.header("Authorization").split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    const user = await User.findOne({
      _id: decoded.USER_ID,
      // token: token,
    });

    if (!user) {
      return res.status(401).json({
        message: "Authorization failed. Please authenticate.",
      });
    }

    // req.token = token;
    req.auth = user;
    // req.auth = decoded;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      message: "Authorization failed. Please authenticate.",
    });
  }
};

module.exports = auth;
