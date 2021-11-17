const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const Saloon = require("../../models/Saloon");
const ObjectId = require("mongoose").Types.ObjectId;
const handleError = require("../../utils/helpers").handleErrors;
const removeFile = require("../../utils/helpers").removeFile;

const validationSignin =
  require("../../config/validation-attributes.json").signin;
const validateInputs = require("../../utils/helpers").validateInputs;
const _ = require("lodash");
const Booking = require("../../models/Booking");
const filePath = "uploads/saloons";
const moment = require("moment");

module.exports = {
  list: async (req, res) => {
    try {
      let filter;
      if (!req.query.filter) {
        filter = {};
      } else {
        filter = await filterQueries(JSON.parse(req.query.filter));
      }
      const id = req.params.id;
      await Booking.find({ saloon: id }).distinct(
        "user",
        function (error, ids) {
          User.find({ _id: { $in: ids }, ...filter.user })
            .lean()
            .exec()
            .then(async (data) => {
              if (data) {
                return res.status(200).send({
                  data: data,
                });
              }
            });
        }
      );
    } catch (error) {
      let message = await handleError(error);
      console.error(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  details: async (req, res) => {
    try {
      const id = req.params.id;
      const user = await User.findOne({ _id: id })
        .select("-password")
        .lean()
        .exec()
        .then(async (user) => {
          if (user) {
            user.bookings = await Booking.find({ user: user._id });
          }
          return user;
        });

      return res.status(200).send({
        message: "Success",
        data: user,
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
  profile: async (req, res) => {
    try {
      let inputParams = JSON.parse(req.body.saloon);
      const id = req.auth._id;

      let user = await User.findById(id);
      if (!user) {
        return res.status(400).send({
          message: "User not found!",
        });
      }
      if (inputParams.username) {
        inputParams.username = inputParams.username.toLowerCase();
      }
      if (inputParams.phone) {
        if (inputParams.phone != user.phone) {
          let userPhoneExist = await User.findOne({
            phone: inputParams.phone,
            type: "saloon",
          });
          if (userPhoneExist) {
            return res.status(400).send({
              message: "Phone number is already registered!",
            });
          }
        }
      }

      if (inputParams.email != user.email) {
        let userPhoneExist = await User.findOne({
          email: inputParams.email,
          type: "saloon",
        });
        if (userPhoneExist) {
          return res.status(400).send({
            message: "Email is already registered!",
          });
        }
      }
      inputParams = assignFiles(req.files, inputParams, user);

      const newsaloon = await User.findOneAndUpdate({ _id: id }, inputParams, {
        new: true,
      });
      return res.status(200).send({
        message: "Salon updated successfully.",
        data: newsaloon,
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

  setAllread: async (req, res) => {
    try {
      let notification = await Notification.updateMany(
        {
          saloon: req.params.id,
          userType: "saloon",
        },
        { $set: { readUsers: ObjectId(req.auth._id) } }
      );

      return res.status(200).send({
        success: true,
        message: "Success",
      });
    } catch (error) {
      let message = await handleError(error);
      console.error(error);
      return res.status(400).send({
        error: error,
        success: false,
        message,
      });
    }
  },
  saloonNotifications: async (req, res, next) => {
    try {
      if (!req.query.pagination) {
        paginate = {};
      } else {
        paginate = JSON.parse(req.query.pagination);
      }
      let unReadNotification = await Notification.find({
        saloon: req.params.nid,
        userType: "saloon",
        readUsers: { $nin: [req.auth._id] },
      }).sort({ createdAt: -1 });

      let count = unReadNotification.length;

      const readNotification = await Notification.find({
        userType: "saloon",
        readUsers: { $in: [req.auth._id] },
      }).sort({ createdAt: -1 });

      const notification = [...unReadNotification, ...readNotification];

      const postCount = notification.length;
      const perPage = paginate.limit;
      const pageCount = Math.ceil(postCount / perPage);
      const page = paginate.page;
      const from = paginate.from;
      let to = paginate.to;
      const unreadData = notification.slice(from, to);

      return res.status(200).send({
        success: true,
        message: "Notification Details",
        data: unreadData,
        Unread: count,
        page,
        itemCount: postCount,
        pageCount,
      });
    } catch (error) {
      let message = await handleError(error);
      console.error(error);
      return res.status(400).send({
        error: error,
        success: false,
        message,
      });
    }
  },

  setRead: async (req, res) => {
    try {
      let notification = await Notification.findOne({
        _id: req.params.nid,
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
        _id: req.params.nid,
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

function assignFiles(files, inputParams, saloon = false) {
  let newParams = { ...inputParams };
  try {
    if (files.mainImage) {
      newParams.mainImage = `${filePath}/${files.mainImage[0].filename}`;
      if (saloon) {
        removeFile(saloon.mainImage);
      }
    }
    if (files.profileImage) {
      newParams.profileImage = `${filePath}/${files.profileImage[0].filename}`;
      if (saloon) {
        removeFile(saloon.profileImage);
      }
    }
    if (files.additionalImages) {
      newParams.additionalImages = files.additionalImages.map(
        (_a) => `${filePath}/${_a.filename}`
      );
      if (saloon) {
        const additionalImages = saloon.additionalImages || [];
        newParams.additionalImages =
          newParams.additionalImages.concat(additionalImages);
      }
    }
    if (files.documents) {
      newParams.documents = files.documents.map(
        (_a) => `${filePath}/${_a.filename}`
      );
      if (saloon) {
        const documents = saloon.documents || [];
        newParams.documents = newParams.documents.concat(documents);
      }
    }
  } catch (error) {
    console.error(error);
  }

  return newParams;
}

async function filterQueries(queryParams) {
  let filter = { ...queryParams };
  // filter.status = "Active";
  const allowed = ["name", "phone", "type", "createdAt", "key", "nameAr"];
  filter = _.pick(filter, allowed);
  if (filter.key) {
    filter = {
      ...filter,
      $or: [
        { name: { $regex: filter.key, $options: "i" } },
        { nameAr: { $regex: filter.key, $options: "i" } },
        { phone: { $regex: filter.key, $options: "i" } },
        { type: { $regex: filter.key, $options: "i" } },
      ],
    };
  }
  delete filter.key;
  if (filter.createdAt) {
    const fromDate = moment(filter.createdAt, "YYYY-MM-DD HH:mm:ss");
    const toDate = moment(filter.createdAt, "YYYY-MM-DD HH:mm:ss").add(1, "d");
    // console.log("datewaise");
    filter.createdAt = {
      $gte: fromDate,
      $lt: toDate,
    };
  }
  return { user: filter };
}
