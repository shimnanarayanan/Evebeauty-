const Mystery = require("../../models/Mystery");
const Subscription = require("../../models/Subscription");

const handleError = require("../../utils/helpers").handleErrors;
const removeFile = require("../../utils/helpers").removeFile;
const validationAttributes = require("../../config/validation-attributes.json")
  .mystery;
const validateInputs = require("../../utils/helpers").validateInputs;
const _ = require("lodash");
const moment = require("moment");
const paginate = require("express-paginate");

const filePath = "uploads/mystery";

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

      const [mystery, itemCount] = await Promise.all([
        Mystery.find(filter.mystery)
          .collation({ locale: "en" })
          .sort(sort)
          .limit(pagination.limit)
          .skip(pagination.skip),
        Mystery.find(filter.mystery).count(),
      ]);
      const pageCount = Math.ceil(itemCount / pagination.limit);
      return res.status(200).send({
        message: "Mystery Details",
        data: mystery,
        pageCount,
        itemCount,
        // pages: paginate.getArrayPages(req)(3, pageCount, pagination.page)
      });
    } catch (error) {
      return res.status(400).json({
        message: "Error getting mystery Details",
      });
    }
  },

  details: async (req, res, next) => {
    try {
      const mystery = await Mystery.findById(req.params.id);

      return res.status(200).send({
        message: "Mystery Details",
        data: mystery,
      });
    } catch (error) {
      return res.status(400).json({
        message: "Error getting mystery Details",
      });
    }
  },

  create: async (req, res) => {
    try {
      let inputParams = JSON.parse(req.body.mystery);
      console.log(inputParams);
      if (!req.files) {
        return res.status(400).send({
          message: "No files found!",
        });
      }
      inputParams = assignFiles(req.files, inputParams);

      let mystery = await Mystery.create(inputParams);
      return res.status(200).send({
        message: "Mystery created successfully.",
        data: mystery,
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
      let inputParams = JSON.parse(req.body.mystery);
      const id = req.params.id;

      let mystery = await Mystery.findById(id);
      if (!mystery) {
        return res.status(400).send({
          message: "Mystery not found!",
        });
      }

      inputParams = assignFiles(req.files, inputParams, mystery);
      const newmystery = await Mystery.findOneAndUpdate(
        { _id: id },
        inputParams,
        {
          new: true,
        }
      );
      return res.status(200).send({
        message: "Mystery updated successfully.",
        data: newmystery,
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
      const result = await Subscription.findOne({ mystery: id });
      if (result) {
        return res.status(400).send({
          message: "Mystery delete Failed",
        });
      } else {
        Mystery.findOneAndRemove({ _id: id }).exec(function (err, data) {
          if (err) {
            return res.status(400).send({
              error: err,
              message: "Mystery delete failed.",
            });
          }
          console.log(data);
          if (!data) {
            return res.status(400).send({
              error: err,
              message: "Mystery delete failed.",
            });
          }

          removeFile(data.mainImage);

          return res.status(200).send({
            message: "Mystery deleted successfully.",
          });
        });
      }
    } catch (error) {
      return res.status(400).send({
        error: error,
        message: "Mystery delete failed.",
      });
    }
  },

  validate: async (req, res, next) => {
    // Validate input parameters

    let inputParams = req.body;
    inputParams = inputParams.mystery ? JSON.parse(inputParams.mystery) : {};
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
  return { mystery: filter };
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
