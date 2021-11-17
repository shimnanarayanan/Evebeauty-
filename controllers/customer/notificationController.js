const Notification = require("../../models/Notification");
const User = require("../../models/User");

const handleError = require("../../utils/helpers").handleErrors;
const ObjectId = require("mongoose").Types.ObjectId;
const _ = require("lodash");

const moment = require("moment");

// const Notificationstate = require("../../models/Notificationstate");

module.exports = {
  list: async (req, res, next) => {
    try {
      let userId = req.auth._id;

      let user = await User.findById(req.auth._id);
      if (!user) {
        return res.status(400).send({
          message: "User Not found",
        });
      }
      let createdAt = user.createdAt;
      const notification = await Notification.find({
        userType: "customer",
        $or: [{ user: userId }, { sendStatus: true }],
        $and: [
          {
            dateTime: {
              $lte: moment(),
              $gte: moment().subtract(1, 'months')
            },
          },
          {
            dateTime: {
              $gte: createdAt,
            },
          },
        ],
      })
        .populate("saloon", "_id mainImage")
        .sort({ createdAt: -1 })
        .lean()
        .exec()
        .then((data) => {
          data.forEach((element) => {
            // console.log(element);
            let result = element.readUsers.some((value, index, array) => {
              if (value != null) {
                return value.toString() == userId;
              } else {
                return false;
              }
            });
            // console.log(result);
            element.readUsers = [];
            element.status = result ? "read" : "unread";
          });
          return data;
        });

      return res.status(200).send({
        message: "Notification Details",
        data: notification,
      });
    } catch (error) {
      let message = await handleError(error);
      console.error(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  notify: async (req, res) => {
    try {
      let notification = await Notification.findOne({
        _id: req.body.notification,
      });
      if (!notification) {
        return res.status(400).send({
          success: false,
          message: "Notification Not found",
        });
      }

      if (notification) {
        notification.readUsers.push(ObjectId(req.auth._id));
        await notification.save();
      }
      let newNotification = await Notification.findOne({
        _id: req.body.notification,
      })
        .lean()
        .exec()
        .then((data) => {
          let result = data.readUsers.some((value, index, array) => {
            if (value != null) {
              return value.toString() == req.auth._id;
            } else {
              return false;
            }
          });
          data.readUsers = [];
          data.status = result ? "read" : "unread";
          return data;
        });

      return res.status(200).send({
        message: "Success",
        data: newNotification,
      });
    } catch (error) {
      let message = await handleError(error);
      console.error(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
};
