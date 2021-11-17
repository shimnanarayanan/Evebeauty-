const Saloon = require("../../models/Saloon");
const Staff = require("../../models/Staff");
const Services = require("../../models/Service");
const Booking = require("../../models/Booking");

const Category = require("../../models/Category");
const handleError = require("../../utils/helpers").handleErrors;
const _ = require("lodash");
const paginate = require("express-paginate");

module.exports = {
  create: async (req, res, next) => {
    try {
      let inputParams = req.body;
      console.log(inputParams);

      let saloon = await Saloon.findById(inputParams.saloon);
      let servicename = await Services.findOne({
        saloon: inputParams.saloon,
        name: inputParams.name,
      });

      if (!saloon) {
        return res.status(400).json({
          message: "Saloon Id not Found",
        });
      }
      if (servicename) {
        return res.status(400).json({
          message: "Service Already added",
        });
      }

      const services = await Services.create(inputParams);
      let count = await Services.count({
        homeService: true,
        saloon: inputParams.saloon,
        category: inputParams.category,
      });

      if (count == 0) {
        let homeService = false;
        await Saloon.findOneAndUpdate(
          { _id: inputParams.saloon },
          { homeService }
        );
        await Category.findOneAndUpdate(
          { _id: inputParams.category },
          { homeService }
        );
      } else {
        let homeService = true;
        await Saloon.findOneAndUpdate(
          { _id: inputParams.saloon },
          { homeService }
        );
        await Category.findOneAndUpdate(
          { _id: inputParams.category },
          { homeService }
        );
      }
      return res.status(200).send({
        message: "Service added successfully.",
        data: services._id,
      });
    } catch (error) {
      let message = await handleError(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  list: async (req, res, next) => {
    try {
      let filter, pagination, sort;
      if (!req.query.filter) {
        filter = {};
      } else {
        filter = filterQueries(JSON.parse(req.query.filter));
      }

      let saloon = await Saloon.findById(req.params.id);

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

      let [services, itemCount] = await Promise.all([
        Services.find({
          saloon: req.params.id,
          ...filter.service,
        })
          .collation({ locale: "en" })
          .sort(sort)
          .limit(pagination.limit)
          .skip(pagination.skip),
        Services.find(filter.services).count(),
      ]);
      const pageCount = Math.ceil(itemCount / pagination.limit);

      return res.status(200).send({
        message: "Service details",
        saloon: saloon.name,
        data: services,
        pageCount,
        itemCount,
        // pages: paginate.getArrayPages(req)(3, pageCount, pagination.page),
      });
    } catch (error) {
      let message = await handleError(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  Servicelist: async (req, res, next) => {
    try {
      let saloon = await Saloon.findById(req.params.id);

      if (!saloon) {
        return res.status(404).json({
          message: "Saloon Id not Found",
        });
      }
      let services = await Services.find({
        saloon: req.params.id,
        status: "Active",
      });

      return res.status(200).send({
        message: "Service details",
        saloon: saloon.name,
        data: services,
      });
    } catch (error) {
      let message = await handleError(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  details: async (req, res, next) => {
    try {
      let serviceId = req.params.id;
      let services = await Services.findById(serviceId);

      return res.status(200).send({
        message: "Service details",
        data: services,
      });
    } catch (error) {
      let message = await handleError(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  update: async (req, res) => {
    try {
      let inputParams = req.body;
      const id = req.params.id;
      console.log(id);

      let services = await Services.findById(id);
      if (!services) {
        return res.status(400).send({
          message: "Service not found!",
        });
      }

      const newservices = await Services.findOneAndUpdate(
        { _id: id },
        inputParams,
        {
          new: true,
        }
      );
      let count = await Services.count({
        homeService: true,
        saloon: services.saloon,
        category: services.category,
      });

      if (count == 0) {
        let homeService = false;
        await Saloon.findOneAndUpdate(
          { _id: services.saloon },
          { homeService }
        );
        await Category.findOneAndUpdate(
          { _id: services.category },
          { homeService }
        );
      } else {
        let homeService = true;
        await Saloon.findOneAndUpdate(
          { _id: services.saloon },
          { homeService }
        );
        await Category.findOneAndUpdate(
          { _id: services.category },
          { homeService }
        );
      }
      return res.status(200).send({
        message: "Service updated successfully.",
        data: newservices,
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

      const resultBooking = await Booking.findOne({
        "booking_info.service": id,
      });

      if (resultBooking) {
        let services = await Services.findById(id);
        services.status = "Inactive";
        await services.save();
        return res.status(400).send({
          message: "Service delete failed",
        });
      } else {
        await Staff.updateMany(
          { services: id },
          { $pullAll: { services: [id] } }
        );

        Services.findOneAndRemove({ _id: id }).exec(function (err, data) {
          if (err) {
            return res.status(400).send({
              error: err,
              message: "Service delete failed.",
            });
          }
          console.log(data);
          if (!data) {
            return res.status(400).send({
              error: err,
              message: "Service delete failed.",
            });
          }

          return res.status(200).send({
            message: "Service deleted successfully.",
          });
        });
      }
    } catch (error) {
      return res.status(400).send({
        error: error,
        message: "Service delete failed.",
      });
    }
  },
};

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
  return { service: filter };
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
