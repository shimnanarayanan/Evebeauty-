const Category = require("../../models/Category");
const Services = require("../../models/Service");
const handleError = require("../../utils/helpers").handleErrors;
const removeFile = require("../../utils/helpers").removeFile;
const _ = require("lodash");
const filePath = "uploads/category";
const paginate = require("express-paginate");

module.exports = {
  create: async (req, res) => {
    try {
      let inputParams = JSON.parse(req.body.category);
      console.log(inputParams);
      if (!req.files) {
        return res.status(400).send({
          message: "No files found!",
        });
      }
      inputParams = assignFiles(req.files, inputParams);

      let category = await Category.create(inputParams);
      return res.status(200).send({
        message: "Category created successfully.",
        data: category,
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

      const [category, itemCount] = await Promise.all([
        Category.find(filter.category)
          .collation({ locale: "en" })
          .sort(sort)
          .limit(pagination.limit)
          .skip(pagination.skip),
        Category.find(filter.category).count(),
      ]);

      const pageCount = Math.ceil(itemCount / pagination.limit);
      return res.status(200).send({
        message: "Category Details",
        data: category,
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
  Categorylist: async (req, res, next) => {
    try {
      const category = await Category.find({ status: "Active" });
      return res.status(200).send({
        message: "Category Details",
        data: category,
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
      const category = await Category.findById(req.params.id);
      return res.status(200).send({
        message: "Category Details",
        data: category,
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
      let inputParams = JSON.parse(req.body.category);
      const id = req.params.id;

      let category = await Category.findById(id);
      if (!category) {
        return res.status(400).send({
          message: "Category Not found!",
        });
      }
      inputParams = assignFiles(req.files, inputParams, category);
      const newcategory = await Category.findOneAndUpdate(
        { _id: id },
        inputParams,
        {
          new: true,
        }
      );
      return res.status(200).send({
        message: "Category Updated Successfully.",
        // data: newcategory,
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

      const result = await Services.findOne({ category: id });
      if (result) {
        let category = await Category.findById(id);
        category.status = "Inactive";
        await category.save();
        return res.status(400).send({
          message: "Category delete failed",
        });
      } else {
        Category.findOneAndRemove({ _id: id }).exec(function (err, data) {
          if (err) {
            return res.status(400).send({
              error: err,
              message: "Category delete failed.",
            });
          }
          console.log(data);
          if (!data) {
            return res.status(400).send({
              error: err,
              message: "Category delete failed.",
            });
          }

          return res.status(200).send({
            message: "Category deleted successfully.",
          });
        });
      }
    } catch (error) {
      return res.status(400).send({
        error: error,
        message: "Category delete failed.",
      });
    }
  },
};

function assignFiles(files, inputParams, editObj = false) {
  let newParams = { ...inputParams };
  if (!editObj) {
    if (files.Icon) {
      newParams.Icon = `${filePath}/${files.Icon[0].filename}`;
    }
  } else {
    if (files.Icon) {
      newParams.Icon = `${filePath}/${files.Icon[0].filename}`;
      removeFile(editObj.Icon);
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
  return { category: filter };
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
