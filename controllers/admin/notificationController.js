const Notification = require("../../models/Notification");
const handleError = require("../../utils/helpers").handleErrors;
const removeFile = require("../../utils/helpers").removeFile;
const validationAttributes =
  require("../../config/validation-attributes.json").notification;
const validateInputs = require("../../utils/helpers").validateInputs;
const _ = require("lodash");
const moment = require("moment");
const paginate = require("express-paginate");
const ObjectId = require("mongoose").Types.ObjectId;
const filePath = "uploads/notification";
const cron = require("node-cron");
const admin = require("../../firebase").admin;

//////////////////
module.exports = {
  list: async (req, res, next) => {
    try {
      let filter, pagination, sort;
      if (!req.query.filter) {
        filter = {};
      } else {
        filter = filterQueries(JSON.parse(req.query.filter));
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

      const [notification, itemCount] = await Promise.all([
        Notification.find({ userType: "customer", common: true })
          .collation({ locale: "en" })
          .sort(sort)
          .limit(pagination.limit)
          .skip(pagination.skip),
        Notification.find({ userType: "customer", common: true }).count(),
      ]);
      const pageCount = Math.ceil(itemCount / pagination.limit);

      return res.status(200).send({
        message: "Notification Details",
        data: notification,
        pageCount,
        itemCount,
        // pages: paginate.getArrayPages(req)(3, pageCount, pagination.page)
      });
    } catch (error) {
      return res.status(400).json({
        message: "Error getting notification Details",
      });
    }
  },

  details: async (req, res, next) => {
    try {
      const notification = await Notification.findById(req.params.id);

      return res.status(200).send({
        message: "Notification Details",
        data: notification,
      });
    } catch (error) {
      return res.status(400).json({
        message: "Error getting notification Details",
      });
    }
  },

  create: async (req, res) => {
    try {
      let inputParams = JSON.parse(req.body.notification);
      console.log(inputParams);
      if (!req.files) {
        return res.status(400).send({
          message: "No files found!",
        });
      }
      inputParams = assignFiles(req.files, inputParams);

      let notification = await Notification.create(inputParams);
      notification.common = true;
      await notification.save();
      return res.status(200).send({
        message: "Notification created successfully.",
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

  update: async (req, res) => {
    try {
      let inputParams = JSON.parse(req.body.notification);
      const id = req.params.id;

      let notification = await Notification.findById(id);
      if (!notification) {
        return res.status(400).send({
          message: "Notification not found!",
        });
      }

      inputParams = assignFiles(req.files, inputParams, notification);
      const newnotification = await Notification.findOneAndUpdate(
        { _id: id },
        inputParams,
        {
          new: true,
        }
      );
      return res.status(200).send({
        message: "Notification updated successfully.",
        data: newnotification,
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
      console.log(id);
      Notification.findOneAndRemove({ _id: id }).exec(function (err, data) {
        if (err) {
          return res.status(400).send({
            error: err,
            message: "Notification delete failed.",
          });
        }
        console.log(data);
        if (!data) {
          return res.status(400).send({
            error: err,
            message: "Notification delete failed.",
          });
        }

        removeFile(data.mainImage);

        return res.status(200).send({
          message: "Notification deleted successfully.",
        });
      });
    } catch (error) {
      return res.status(400).send({
        error: error,
        message: "Notification delete failed.",
      });
    }
  },

  pushList: async (req, res, next) => {
    try {
      let paginate;
      if (!req.query.paginate) {
        paginate = {};
      } else {
        paginate = JSON.parse(req.query.paginate);
      }

      const unReadNotification = await Notification.find({
        userType: "admin",
        readUsers: { $nin: [req.auth._id] },
      }).sort({ createdAt: -1 });

      let count = unReadNotification.length;

      const readNotification = await Notification.find({
        userType: "admin",
        readUsers: { $in: [req.auth._id] },
      }).sort({ createdAt: -1 });

      const notification = [...unReadNotification, ...readNotification];

      // let filteredNotifications = [];
      // notification.forEach((element) => {
      //   let result = element.readUsers.some((value, index, array) => {
      //     if (value != null) {
      //       return value.toString() === id;
      //     } else {
      //       return false;
      //     }
      //   });
      //   filteredNotifications.push({
      //     status: result ? "read" : "unread",
      //   });
      //   console.log(result);
      // });

      const postCount = notification.length;
      const perPage = paginate.limit;
      const pageCount = Math.ceil(postCount / perPage);
      const page = paginate.page;
      const from = paginate.from;
      let to = paginate.to;
      const unreadData = notification.slice(from, to);

      return res.status(200).send({
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
        message,
      });
    }
  },
  notify: async (req, res) => {
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

  setAllread: async (req, res) => {
    try {
      let notification = await Notification.find({
        userType: "admin",
        readUsers: { $nin: [req.auth._id] },
      });

      notification.forEach(async (element) => {
        element.readUsers.push(ObjectId(req.auth._id));
        await element.save();
      });

      return res.status(200).send({
        message: "Success",
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
    inputParams = inputParams.notification
      ? JSON.parse(inputParams.notification)
      : {};
    // console.log(inputParams);

    const inputValidation = await validateInputs(
      inputParams,
      validationAttributes
    );

    if (!inputValidation.success) {
      return res.status(404).send({
        message: inputValidation.message,
        error: inputValidation.errors,
      });
    }

    next();
  },
};

function assignFiles(files, inputParams, editObj = false) {
  let newParams = { ...inputParams };
  if (!editObj) {
    if (files.mainImage) {
      newParams.mainImage = `${filePath}/${files.mainImage[0].filename}`;
    }
    if (files.additionalImages) {
      newParams.additionalImages = files.additionalImages.map(
        (_a) => `${filePath}/${_a.filename}`
      );
    }
    if (files.documents) {
      newParams.documents = files.documents.map(
        (_a) => `${filePath}/${_a.filename}`
      );
    }
  } else {
    const documents = [];
    const additionalImages = [];
    if (files.mainImage) {
      newParams.mainImage = `${filePath}/${files.mainImage[0].filename}`;
      removeFile(editObj.mainImage);
    }

    if (files.additionalImages) {
      files.additionalImages.forEach((additionalImage, index) => {
        additionalImages[index] = `${filePath}/${additionalImage.filename}`;
        removeFile(editObj.additionalImages[index]);
      });
      newParams.additionalImages = additionalImages;
    }
  }

  return newParams;
}

function filterQueries(queryParams) {
  let filter = { ...queryParams };

  // filter.status = "Active";
  const allowed = ["name"];
  filter = _.pick(filter, allowed);
  console.log(filter);
  if (filter) {
    if (filter.name) {
      if (filter.name.english) {
        filter = {
          ...filter,
          "name.english": { $regex: filter.name.english, $options: "i" },
        };
      }
      if (filter.name.arabic) {
        filter = {
          ...filter,
          "name.arabic": { $regex: filter.name.arabic, $options: "i" },
        };
      }
      delete filter.name;
    }
  }
  return { notification: filter };
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

// Schedule tasks to be run on the server.

cron.schedule("* * * * *", async function () {
  let todayD = moment().format("YYYY-MM-DD HH:mm");
  let dateExtr = moment(todayD).format("YYYY-MM-DD");
  let timeExtr = moment(todayD).format("HH:mm");

  let notification = await Notification.find({
    dateTime: dateExtr,
    time: timeExtr,
    userType: "customer",
    sendStatus: false,
  });
  if (notification) {
    for (i = 0; i <= notification.length; i++) {
      if (notification[i]) {
        let topic = "evebeauty-test";
        let message = {
          data: {
            score: "850",
            time: "2:45",
          },
          notification: {
            title: notification[i].name.english,
            body: notification[i].description.english,
          },
          topic: topic,
        };
        notification[i].sendStatus = true;
        notification[i].save();

        // Send a message to devices subscribed to the provided topic.
        admin
          .messaging()
          .send(message)
          .then((response) => {
            // Response is a message ID string.
            console.log("Successfully sent message:", response);
          })
          .catch((error) => {
            console.log("Error sending message:", error);
          });
      }
    }
  }
  let notificationAdmin = await Notification.find({
    dateStatus: false,
    userType: "customer",
    sendStatus: false,
  });

  if (notificationAdmin) {
    for (i = 0; i <= notificationAdmin.length; i++) {
      if (notificationAdmin[i]) {
        let topic = "evebeauty-test";
        let messages = {
          data: {
            score: "850",
            time: "2:45",
          },
          notification: {
            title: notificationAdmin[i].name.english,
            body: notificationAdmin[i].description.english,
          },
          topic: topic,
        };

        notificationAdmin[i].sendStatus = true;
        notificationAdmin[i].save();
        // Send a message to devices subscribed to the provided topic.
        admin
          .messaging()
          .send(messages)
          .then((response) => {
            // Response is a message ID string.
            console.log("Successfully sent message:", response);
          })
          .catch((error) => {
            console.log("Error sending message:", error);
          });
      }
    }
  }
});
