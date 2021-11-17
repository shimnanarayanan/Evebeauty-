const Offer = require("../../models/Offer");
const Saloon = require("../../models/Saloon");
const Services = require("../../models/Service");
const ObjectId = require("mongoose").Types.ObjectId;
const handleError = require("../../utils/helpers").handleErrors;
const removeFile = require("../../utils/helpers").removeFile;
const validationAttributes = require("../../config/validation-attributes.json")
  .offer;
const validateInputs = require("../../utils/helpers").validateInputs;
const _ = require("lodash");
const moment = require("moment");
const paginate = require("express-paginate");

const filePath = "uploads/offer";

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
      let saloon = await Saloon.findById(req.params.saloon);

      if (!saloon) {
        return res.status(404).json({
          message: "Saloon Id not Found",
        });
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

      let [offer, itemCount] = await Promise.all([
        Offer.find(
          {
            saloon: req.params.saloon,
            ...filter.offer,
          },
          { saloon: 0 }
        )
          .collation({ locale: "en" })
          .sort(sort)
          .limit(pagination.limit)
          .skip(pagination.skip),
        Offer.find(filter.offer).count(),
      ]);
      const pageCount = Math.ceil(itemCount / pagination.limit);

      return res.status(200).send({
        message: "Offer details",
        data: offer,
        pageCount,
        itemCount,
        // pages: paginate.getArrayPages(req)(3, pageCount, pagination.page)
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
      let offer = await Offer.findById(req.params.id);

      return res.status(200).send({
        message: "Offer details",
        data: offer,
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

  create: async (req, res) => {
    try {
      let inputParams = JSON.parse(req.body.offer);
      console.log(inputParams);

      let saloon = await Saloon.findById(inputParams.saloon);
      let serviceoffer = await Offer.findOne({
        saloon: inputParams.saloon,
        service: inputParams.service,
      });

      if (!saloon) {
        return res.status(400).send({
          message: "Saloon Id not Found",
        });
      }

      if (serviceoffer) {
        return res.status(400).send({
          message: "Offer Already added to Selected Service",
        });
      }

      if (!req.files) {
        return res.status(400).send({
          message: "No files found!",
        });
      }
      inputParams = assignFiles(req.files, inputParams);

      let offer = await Offer.create(inputParams);
      return res.status(200).send({
        message: "Offer created successfully.",
        // data: offer,
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
      let inputParams = JSON.parse(req.body.offer);
      const id = req.params.id;

      let offer = await Offer.findById(id);
      if (!offer) {
        return res.status(400).send({
          message: "Offer not found!",
        });
      }

      if (inputParams.service != offer.service) {
        let serviceoffer = await Offer.findOne({
          saloon: offer.saloon,
          service: inputParams.service,
        });
        if (serviceoffer) {
          return res.status(400).send({
            message: "Offer Already added to Selected Service",
          });
        }
      }

      inputParams = assignFiles(req.files, inputParams, offer);
      const newoffer = await Offer.findOneAndUpdate({ _id: id }, inputParams, {
        new: true,
      });
      return res.status(200).send({
        message: "Offer Updated successfully.",
        // data: newoffer,
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

      Offer.findOneAndRemove({ _id: id }).exec(function (err, data) {
        if (err) {
          return res.status(400).send({
            error: err,
            message: "Offer delete failed.",
          });
        }

        if (!data) {
          return res.status(400).send({
            error: err,
            message: "Offer delete failed.",
          });
        }

        removeFile(data.mainImage);

        return res.status(200).send({
          message: "Offer deleted successfully.",
        });
      });
    } catch (error) {
      return res.status(400).send({
        error: error,
        message: "Offer delete failed.",
      });
    }
  },

  validate: async (req, res, next) => {
    // Validate input parameters

    let inputParams = req.body;
    inputParams = inputParams.offer ? JSON.parse(inputParams.offer) : {};

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
  } else {
    if (files.mainImage) {
      newParams.mainImage = `${filePath}/${files.mainImage[0].filename}`;
      removeFile(editObj.mainImage);
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
  return { offer: filter };
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
