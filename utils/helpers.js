const { Validator } = require("node-input-validator");
const fs = require("fs");
const _ = require("lodash");

const defaultImagePath = process.env.FILE_UPLOAD_PATH;
const host = process.env.HOST;

exports.validateInputs = async (input, attributes) => {
  const v = new Validator(input, attributes);

  const matched = await v.check();

  if (!matched) {
    return {
      errors: v.errors,
      success: false,
      message: "Input validation failed",
    };
  }

  return {
    success: true,
    message: "Input validation success",
  };
};

exports.handleErrors = async (error) => {
  let message = error + "Oops, Something went wrong!";

  if (error && error.name) {
    switch (error.name) {
      case "SequelizeUniqueConstraintError":
        message = "Value for an input parameter is already in use!";

        if (error.errors[0])
          message = `${error.errors[0].value} is already in use!`;
        break;

      case "SequelizeForeignKeyConstraintError":
        if (
          error.original &&
          error.original.detail &&
          error.original.detail.includes("referenced")
        )
          message = "Reference exist in another table!";
        if (
          error.original &&
          error.original.detail &&
          error.original.detail.includes("not present")
        )
          message = "Reference doesn't exist!";
        break;

      case "Error":
        message = error.toString();
        break;

      default:
        break;
    }
  } else if (error) {
    message = error;
  }

  return message;
};
exports.validateFile = (file, path, type) => {
  const fileExtension = file.name.split(".").pop();
  if (!fileExtension) {
    return {
      success: false,
    };
  }
  switch (type) {
    case "image":
      if (
        fileExtension == "png" ||
        fileExtension == "jpg" ||
        fileExtension == "jpeg"
      ) {
        const d = new Date();
        const fileName = d.getTime() + "." + fileExtension;
        return {
          success: true,
          fileName: fileName,
          filePath: `${defaultImagePath}/${path}/${fileName}`,
          fileUrl: `${host}/${path}/${fileName}`,
        };
      } else {
        return {
          success: false,
        };
      }
  }
};
exports.removeFile = (path) => {
  try {
    if (path && path != "undefined" && path != "null") {
      fs.unlinkSync(`${defaultImagePath}/${path}`);
    }
  } catch (err) {
    console.error(err);
  }
};

exports.multerStorage = (multer, folder) => {
  try {
    const path = `${defaultImagePath}/uploads/${folder}/`;
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        fs.mkdirSync(path, { recursive: true });

        cb(null, path);
      },
      filename: function (req, file, cb) {
        var filename = file.originalname;
        var fileExtension = filename.split(".")[1];
        cb(null, Date.now() + "." + fileExtension);
      },
    });
    return storage;
  } catch (err) {
    console.error(err);
  }
};

exports.capitalizeFirstLetter = (string) => {
  try {
    return string.charAt(0).toUpperCase() + string.slice(1);
  } catch (error) {
    return string;
  }
};
