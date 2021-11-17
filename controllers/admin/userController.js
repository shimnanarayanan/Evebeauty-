const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const Saloon = require("../../models/Saloon");
const handleError = require("../../utils/helpers").handleErrors;
const validateInputs = require("../../utils/helpers").validateInputs;
const validationFields =
  require("../../config/validation-attributes.json").user;

const _ = require("lodash");
const moment = require("moment");
const removeFile = require("../../utils/helpers").removeFile;
const filePath = "uploads/users";
const paginate = require("express-paginate");
const admin = require("../../firebase").admin;
const exportUsersToExcel = require("../../utils/exportUser");

module.exports = {
  create: async (req, res, next) => {
    // Create a new Admin

    try {
      let inputParams = req.body;

      inputParams.password = bcrypt.hashSync(req.body.password, 10);
      if (inputParams.username) {
        inputParams.username = inputParams.username.toLowerCase();
      }
      const user = await User.create(inputParams);

      return res.status(200).send({
        message: "User created successfully.",
        // data: user,
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
  list: async (req, res, next) => {
    // Get all Users
    try {
      let filter = {};
      const type = req.query.type || false;

      if (type) {
        filter.type = type;
      }

      if (!req.query.pagination) {
        pagination = {};
      } else {
        pagination = JSON.parse(req.query.pagination);
      }
      if (!req.query.sort) {
        sort = {};
      } else {
        sort = handleReportSort(JSON.parse(req.query.sort));
      }

      const [users, itemCount] = await Promise.all([
        User.find(filter)
          .select("-password")
          .collation({ locale: "en" })
          .sort(sort)
          .limit(pagination.limit)
          .skip(pagination.skip),
        User.find(filter).count(),
      ]);
      const pageCount = Math.ceil(itemCount / pagination.limit);

      return res.status(200).send({
        data: users,
        pageCount,
        itemCount,
        // pages: paginate.getArrayPages(req)(3, pageCount, pagination.page),
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

  details: async (req, res, next) => {
    try {
      const id = req.params.id;
      const user = await User.findById(id).select("-password");

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

  update: async (req, res) => {
    try {
      let inputParams = JSON.parse(req.body.user);
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
      if (inputParams.phone != user.phone) {
        let userPhoneExist = await User.findOne({
          phone: inputParams.phone,
          type: "admin",
        });
        if (userPhoneExist) {
          return res.status(400).send({
            message: "Phone number is already registered!",
          });
        }
      }
      if (inputParams.email != user.email) {
        let userPhoneExist = await User.findOne({
          email: inputParams.email,
          type: "admin",
        });
        if (userPhoneExist) {
          return res.status(400).send({
            message: "Email is already registered!",
          });
        }
      }

      inputParams = assignFiles(req.files, inputParams, user);
      const newUser = await User.findOneAndUpdate({ _id: id }, inputParams, {
        new: true,
      });

      return res.status(200).send({
        message: "User updated successfully",
        data: newUser,
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

  Userupdate: async (req, res) => {
    try {
      let inputParams = req.body;
      const id = req.params.id;

      let user = await User.findById(id);
      if (!user) {
        return res.status(400).send({
          message: "User not found!",
        });
      }
      if (inputParams.username) {
        inputParams.username = inputParams.username.toLowerCase();
      }
      const newUser = await User.findOneAndUpdate({ _id: id }, inputParams, {
        new: true,
      });
      if (inputParams.status == "Inactive" && user.fcm_token) {
        const registrationToken = user.fcm_token;
        var message = {
          notification: {
            title: "Update",
            body: `Hi ${user.name},Your Evebeauty Account has been Inactivated`,
          },
          data: {
            id: `${user._id}`,
            notificationType: "Inactive",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            title: "Update",
            body: `Hi ${user.name},Your Evebeauty Account has been Inactivated`,
          },
        };
        const newNotification = new Notification({
          user: user._id,
          userType: "customer",
          notificationType: "Inactive",
          "name.english": message.notification.title,
          "description.english": message.notification.body,
          image: "notifications/inactive.png",
        });
        await newNotification.save();
        admin
          .messaging()
          .sendToDevice(registrationToken, message)
          .then((response) => {
            console.log("Successfully sent");
          })
          .catch((error) => {
            console.log(error);
          });

        const newNotification2 = new Notification({
          userType: "admin",
          notificationType: "Inactive",
          "name.english": "User Account Inactivated",
          "description.english": `${user.name} account Inactivated`,
          image: "notifications/inactive.png",
        });
        await newNotification2.save();
      }
      return res.status(200).send({
        message: "User updated successfully.",
        data: newUser,
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

  delete: async (req, res) => {
    try {
      const id = req.params.id;

      let user = await User.findById(id);
      if (!user) {
        return res.status(400).send({
          message: "User not found",
        });
      }

      User.findOneAndRemove({ _id: id }).exec(function (err, data) {
        if (err) {
          return res.status(400).send({
            error: err,
            message: "User delete failed.",
          });
        }

        return res.status(200).send({
          message: "User deleted successfully.",
        });
      });
    } catch (error) {
      return res.status(400).send({
        error: error,
        message: "User delete failed.",
      });
    }
  },
  search: async (req, res, next) => {
    // Get all Users
    try {
      let filter;
      if (!req.query.filter) {
        filter = {};
      } else {
        filter = filterQueries(JSON.parse(req.query.filter));
      }

      const user = await User.find(filter.user);

      return res.status(200).send({
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
  searchCust: async (req, res, next) => {
    // Get all Users
    try {
      const key = req.query.key.toString().trim();
      console.log(key);

      const users = await User.find(
        {
          $or: [
            { name: { $regex: key, $options: "si" } },
            { nameAr: { $regex: key, $options: "si" } },
            { type: { $regex: key, $options: "si" } },
          ],
        },
        { name: 1, _id: 1, nameAr: 1 }
      ).limit(10);

      return res.status(200).send({
        data: users,
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
  validate: async (req, res, next) => {
    // Validate input parameters

    let inputParams = req.body;

    const inputValidation = await validateInputs(inputParams, validationFields);

    if (!inputValidation.success) {
      return res.status(404).send({
        message: inputValidation.message,
        error: inputValidation.errors,
      });
    }

    let user = await User.findOne({
      username: inputParams.username.toLowerCase(),
      type: inputParams.type,
    }).catch((e) => {
      throw e;
    });

    if (user) {
      return res.status(400).send({
        message: "Username is taken. Try with a new one.",
        error: "Username is taken. Try with a new one.",
      });
    }

    if (inputParams.password.length < 6) {
      return res.status(400).send({
        message: "Passwords must have atleast six characters!",
        error: "Passwords must have atleast six characters!",
      });
    }
    // if (inputParams.password !== inputParams.confirmPassword) {
    //   return res.status(400).send({
    //     message: "Passwords doesn't match!",
    //     error: "Passwords doesn't match!",
    //   });
    // }

    next();
  },
  customerExport: async (req, res, next) => {
    // Get all Users
    try {
      let filter = {};
      const type = req.query.type || false;

      if (type) {
        filter.type = type;
      }
      const users = await User.find(filter)
        .select("-password")
        .collation({ locale: "en" });
      const workSheetColumnName = ["Name", "Phone", "createdAt"];
      const workSheetName = "Customer";
      const filePath2 = "public/Excelsheet/excel-users.xlsx";
      const filePath = "Excelsheet/excel-users.xlsx";

      exportUsersToExcel(users, workSheetColumnName, workSheetName, filePath2);
      return res.status(200).send({
        data: users,
        filePath,
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

function filterQueries(queryParams) {
  let filter = { ...queryParams };

  filter.type = "customer";
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
function assignFiles(files, inputParams, saloon = false) {
  let newParams = { ...inputParams };
  try {
    if (files.profileImage) {
      newParams.profileImage = `${filePath}/${files.profileImage[0].filename}`;
      if (saloon) {
        removeFile(saloon.profileImage);
      }
    }
  } catch (error) {
    console.error(error);
  }

  return newParams;
}
function handleReportSort(sortParams) {
  let sort = { ...sortParams };

  const allowed = ["name.english", "name.arabic"];
  sort = _.pick(sort, allowed);
  try {
    if (sort.name) {
      if (sort.name.english) {
        sort = {
          ...sort,
          "name.english": sort.name.english,
        };
      }
      if (sort.name.arabic) {
        sort = {
          ...sort,
          "name.arabic": sort.name.arabic,
        };
      }
      delete sort.name;
    }
    return sort;
  } catch (error) {
    console.error(error);
  }
}
