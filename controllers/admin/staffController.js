const Staff = require("../../models/Staff");
const Services = require("../../models/Service");
const Saloon = require("../../models/Saloon");
const Booking = require("../../models/Booking");

const handleError = require("../../utils/helpers").handleErrors;
const removeFile = require("../../utils/helpers").removeFile;
const _ = require("lodash");
const filePath = "uploads/staff";
const paginate = require("express-paginate");

module.exports = {
  create: async (req, res, next) => {
    try {
      let inputParams = JSON.parse(req.body.staff);
      console.log(inputParams);

      if (!req.files) {
        return res.status(400).send({
          message: "No files found!",
        });
      }
      inputParams = assignFiles(req.files, inputParams);

      let services = await Services.findById(inputParams.services);

      if (!services) {
        return res.status(404).json({
          message: "Service Id not Found",
        });
      }

      const staff = await Staff.create(inputParams);
      return res.status(200).send({
        message: "Staff created successfully.",
        data: staff,
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

      let [staff, itemCount] = await Promise.all([
        Staff.find(
          {
            saloon: req.params.saloon,
            ...filter.staff,
          },
          { saloon: 0 }
        )
          .collation({ locale: "en" })
          .sort(sort)
          .limit(pagination.limit)
          .skip(pagination.skip),
        Staff.find(filter.staff).count(),
      ]);
      const pageCount = Math.ceil(itemCount / pagination.limit);

      return res.status(200).send({
        message: "Staff details",
        data: staff,
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
      let staffId = req.params.id;

      let staff = await Staff.findById(staffId);

      return res.status(200).send({
        message: "Staff details",
        data: staff,
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
      let inputParams = JSON.parse(req.body.staff);
      const id = req.params.id;

      let staff = await Staff.findById(id);
      if (!staff) {
        return res.status(400).send({
          message: "Staff not found!",
        });
      }

      if (!req.files) {
        return res.status(400).send({
          message: "No files found!",
        });
      }
      inputParams = assignFiles(req.files, inputParams, staff);

      const newstaff = await Staff.findOneAndUpdate({ _id: id }, inputParams, {
        new: true,
      });
      return res.status(200).send({
        message: "Staff updated successfully.",
        data: newstaff,
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
      const result = await Booking.findOne({ "booking_info.staff": id });
      if (result) {
        let staff = await Staff.findById(id);
        staff.status = "Inactive";
        await staff.save();
        return res.status(400).send({
          message: "Staff delete failed",
        });
      } else {
        Staff.findOneAndRemove({ _id: id }).exec(function (err, data) {
          if (err) {
            return res.status(400).send({
              error: err,
              message: "Staff delete failed.",
            });
          }
          console.log(data);
          if (!data) {
            return res.status(400).send({
              error: err,
              message: "Staff delete failed.",
            });
          }

          removeFile(data.mainImage);

          return res.status(200).send({
            message: "Staff deleted successfully.",
          });
        });
      }
    } catch (error) {
      return res.status(400).send({
        error: error,
        message: "Staff delete failed.",
      });
    }
  },

  listStaff: async (req, res, next) => {
    try {
      let services = await Services.findById(req.params.services);

      if (!services) {
        return res.status(404).json({
          message: "Service Id not Found",
        });
      }
      let staff = await Staff.find(
        {
          services: req.params.services,
        },
        { name: 1 }
      );

      return res.status(200).send({
        message: "Staff details",

        data: staff,
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
  return { staff: filter };
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
