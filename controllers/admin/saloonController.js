const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const City = require("../../models/City");
const Saloon = require("../../models/Saloon");
const Services = require("../../models/Service");
const Category = require("../../models/Category");
const Country = require("../../models/Country");
const Notification = require("../../models/Notification");
const PaymentOption = require("../../models/PaymentOption");
const Booking = require("../../models/Booking");
const Menu = require("../../models/Menu");
const handleError = require("../../utils/helpers").handleErrors;
const removeFile = require("../../utils/helpers").removeFile;
const validationAttributes =
  require("../../config/validation-attributes.json").saloon;
const validationAttributesUpdate =
  require("../../config/validation-attributes.json").saloon_update;
const validationSignin =
  require("../../config/validation-attributes.json").signin;
const capitalizeFirstLetter =
  require("../../utils/helpers").capitalizeFirstLetter;
const validateInputs = require("../../utils/helpers").validateInputs;
const _ = require("lodash");
const filePath = "uploads/saloons";
const moment = require("moment");
const paginate = require("express-paginate");
const { sendMail } = require("../../utils/email");
const admin = require("../../firebase").admin;

module.exports = {
  create: async (req, res) => {
    try {
      let inputParams = req.body;

      const userInput = inputParams.user;
      let saloonPhoneExist = await User.findOne({
        phone: userInput.phone,
      });
      if (saloonPhoneExist) {
        return res.status(400).send({
          success: false,
          message: "Phone number is already registered!",
        });
      }
      const checkUser = await User.findOne({
        username: userInput.username.toLowerCase(),
      });

      if (checkUser) {
        return res.status(400).send({
          message: "User already exists.",
        });
      } else {
        const userPassword = userInput.password;
        userInput.password = bcrypt.hashSync(userInput.password, 10);
        if (userInput.username) {
          userInput.username = userInput.username.toLowerCase();
        }
        const user = await User.create(userInput);

        const mailData = {
          from: "admin@evebeauty.qa",
          to: `${userInput.email}`,
          subject: "Evebeauty Account",
          html: `Hello ${userInput.name}, <br><br>Thank you for registering with us <br> Username : ${userInput.username} <br> Password: ${userPassword}`,
        };
        sendMail(mailData);
        inputParams.user = user._id;
      }

      const saloon = await Saloon.create(inputParams);
      await saloon.populate("User", "-password").execPopulate();

      return res.status(200).send({
        message: "Salon created successfully.",
        data: saloon,
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
  list: async (req, res) => {
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

      const [saloon, itemCount] = await Promise.all([
        Saloon.find(filter.saloon)
          .collation({ locale: "en" })
          .sort(sort)
          // .sort({ createdAt: -1 })
          .populate("Services")
          .populate("paymentOptions")
          .populate({
            path: "city",
            model: City,
            // select: { _id: 0 },
          })
          .collation({ locale: "en" })
          .sort(sort)
          .limit(pagination.limit)
          .skip(pagination.skip),
        Saloon.find(filter.saloon).count(),
      ]);
      const pageCount = Math.ceil(itemCount / pagination.limit);

      return res.status(200).send({
        data: saloon,
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
  details: async (req, res) => {
    try {
      const id = req.params.id;
      const saloon = await Saloon.findById(id)
        .populate("Services")
        .populate("paymentOptions")
        .populate({
          path: "city",
          model: City,
          // select: { _id: 0 },
        });

      return res.status(200).send({
        message: "Success",
        data: saloon,
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
      let inputParams = JSON.parse(req.body.saloon);
      const id = req.params.id;
      let phoneCheck = inputParams.phone;
      console.log(id);
      let saloon = await Saloon.findById(id);
      if (!saloon) {
        return res.status(400).send({
          message: "Salon not found!",
        });
      }
      if (phoneCheck != saloon.phone) {
        let saloonPhoneExist = await Saloon.findOne({
          phone: phoneCheck,
        });
        if (saloonPhoneExist) {
          return res.status(400).send({
            message: "Phone number is already registered!",
          });
        }
      }

      inputParams = assignFiles(req.files, inputParams, saloon);
      if (inputParams.name.english) {
        inputParams.name.english = capitalizeFirstLetter(
          inputParams.name.english
        );
      }
      const user = await User.findById(inputParams.user._id);
      if (user) {
        let userData = inputParams.user;
        user.email = userData.email || "";
        user.name = userData.name || "";
        user.phone = userData.phone || "";
        user.save();
      }
      const newsaloon = await Saloon.findOneAndUpdate(
        { _id: id },
        inputParams,
        { new: true, populate: { path: "User", select: "-password" } }
      );

      dateOfUpdate = moment().format("MMMM Do YYYY, h:mm:ss a");
      const newNotification = new Notification({
        userType: "admin",
        notificationType: "Update",
        "name.english": "Saloon details updated",
        "description.english": `${saloon.name.english} has been updated on ${dateOfUpdate}`,
        saloon: saloon._id,
        image: "notifications/updated.png",
      });
      await newNotification.save();

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
  delete: async (req, res) => {
    try {
      const id = req.params.id;
      const resulBook = await Booking.findOne({
        saloon: id,
        $or: [{ status: "Booked" }, { paymentStatus: "SUCCESS" }],
      });

      if (resulBook) {
        let saloon = await Saloon.findById(id);
        saloon.status = "Inactive";
        await saloon.save();
        return res.status(400).send({
          message: "Salon delete failed",
        });
      } else {
        Saloon.findOneAndRemove({ _id: id }).exec(async function (err, data) {
          if (err) {
            return res.status(400).send({
              error: err,
              message: "Salon delete failed.",
            });
          }
          console.log(data);
          if (!data) {
            return res.status(400).send({
              error: err,
              message: "Salon delete failed.",
            });
          }

          const user = await User.findOne({ _id: data.user });
          if (user) {
            user.remove();
          }

          removeFile(data.mainImage);
          if (data.additionalImages) {
            data.additionalImages.forEach((image, index) => {
              removeFile(image);
            });
          }
          if (data.documents) {
            data.documents.forEach((document, index) => {
              removeFile(document);
            });
          }

          return res.status(200).send({
            message: "Salon deleted successfully.",
          });
        });
      }
    } catch (error) {
      return res.status(400).send({
        error: error,
        message: "Salon delete failed.",
      });
    }
  },

  approval: async (req, res) => {
    try {
      const id = req.params.id;
      const status = req.params.status;

      let saloon = await Saloon.findById(id);
      if (!saloon) {
        return res.status(400).send({
          message: "Saloon Not found!",
        });
      }

      if (status === "approved") {
        let email = saloon.email;
        let name = saloon.name.english;
        let randomstring = Math.random().toString(36).slice(-8);
        console.log(randomstring);
        let password = bcrypt.hashSync(randomstring, 10);
        console.log(password);

        let type = "saloon";

        let user = await User.findOne({ email: email });
        if (user) {
          return res.status(400).send({
            message: "Email  Already registered!",
          });
        }
        const newUser = await new User({
          name,
          email,
          password,
          type,
        });
        WelcomeEmail(email, name, randomstring);
        await newUser.save();
        const newsaloon = await Saloon.updateOne(
          { _id: id },
          { $set: { status: status, verificationStatus: true } }
        );
      } else {
        const newsaloon = await Saloon.updateOne(
          { _id: id },
          { $set: { status: status } }
        );
      }

      return res.status(200).send({
        message: "Salon updated successfully.",
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
  search: async (req, res, next) => {
    // Get all Users
    try {
      const key = req.query.key.toString().trim();
      console.log(key);

      const saloon = await Saloon.find(
        {
          "name.english": { $regex: key, $options: "si" },
        },
        { "name.english": 1, _id: 1 }
      ).limit(10);

      return res.status(200).send({
        data: saloon,
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
  deleteImages: async (req, res) => {
    try {
      const id = req.params.id;
      let { type } = req.query;
      if (!type) {
        return res.status(400).send({
          message: "Type field is required.",
        });
      }
      type = JSON.parse(type) || {};

      if (!type.documents && !type.additionalImages) {
        return res.status(400).send({
          message: "No input found.",
        });
      }
      Saloon.findById(id).exec(async function (err, data) {
        if (err) {
          return res.status(400).send({
            error: err,
            message: "Salon image delete failed.",
          });
        }

        if (!data) {
          return res.status(400).send({
            message: "Salon not found.",
          });
        }

        const saloon = data.toJSON();

        if (type.documents) {
          saloon.documents = saloon.documents
            .map((_a, i) => {
              if (!type.documents.includes(i)) {
                return _a;
              } else {
                removeFile(_a);
              }
            })
            .filter((_a) => _a);
        }
        if (type.additionalImages) {
          saloon.additionalImages = saloon.additionalImages
            .map((_a, i) => {
              if (!type.additionalImages.includes(i)) {
                return _a;
              } else {
                removeFile(_a);
              }
            })
            .filter((_a) => _a);
        }

        await Saloon.findOneAndUpdate({ _id: id }, saloon);
        return res.status(200).send({
          message: "Salon image deleted successfully.",
        });
      });
    } catch (error) {
      return res.status(400).send({
        error: error,
        message: "Salon image delete failed.",
      });
    }
  },

  categorylist: async (req, res) => {
    try {
      const id = req.params.id;
      let service = await Services.find(
        { saloon: id },
        { name: 1, category: 1 }
      ).populate("Staff");

      let category = await Category.find();

      let merged = [];

      for (cat of category) {
        let cate = {
          name: cat.name,

          _id: cat._id,

          services: [],
          homeService: cat.homeService,
        };

        for (ser of service) {
          if (ser.category.toString() === cat._id.toString()) {
            cate.services.push(ser);
            console.log(cate);
          }
        }
        merged.push(cate);
      }

      return res.status(200).send({
        message: "Success",
        data: merged,
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
  validateUpdate: async (req, res, next) => {
    // Validate input parameters

    let inputParams = req.body;
    inputParams = inputParams.saloon ? JSON.parse(inputParams.saloon) : {};
    const inputValidation = await validateInputs(
      inputParams,
      validationAttributesUpdate
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

function filterQueries(queryParams) {
  let filter = { ...queryParams };

  // filter.status = "Active";
  const allowed = [
    "name",
    "email",
    "phone",
    "city",
    "createdAt",
    "fromDate",
    "toDate",
  ];
  filter = _.pick(filter, allowed);

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
    if (filter.email) {
      filter = {
        ...filter,
        email: { $regex: filter.email, $options: "i" },
      };
    }
    if (filter.phone) {
      filter = {
        ...filter,
        phone: { $regex: filter.phone, $options: "i" },
      };
    }
    if (filter.createdAt) {
      const fromDate = moment(filter.createdAt, "YYYY-MM-DD HH:mm:ss");
      const toDate = moment(filter.createdAt, "YYYY-MM-DD HH:mm:ss").add(
        1,
        "d"
      );
      // console.log(fromDate);
      // console.log(toDate);

      filter.createdAt = {
        $gte: fromDate,
        $lt: toDate,
      };
    }
  }
  return { saloon: filter };
}

function assignFiles(files, inputParams, saloon = false) {
  let newParams = { ...inputParams };
  try {
    if (files.mainImage) {
      newParams.mainImage = `${filePath}/${files.mainImage[0].filename}`;
      if (saloon) {
        removeFile(saloon.mainImage);
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
