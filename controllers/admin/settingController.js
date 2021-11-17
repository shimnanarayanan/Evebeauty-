const Setting = require("../../models/Setting");

const handleError = require("../../utils/helpers").handleErrors;

module.exports = {
  create: async (req, res, next) => {
    try {
      let inputParams = req.body;

      let settings = await Setting.findOne();
      if (settings) {
        return res.status(400).send({
          message: "Settings Already Added",
        });
      }
      const saloonsettings = await Setting.create(inputParams);

      return res.status(200).send({
        message: "Settings added successfuly",
        data: saloonsettings,
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
      const settings = await Setting.findOne();

      return res.status(200).send({
        message: "Success",
        data: settings,
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

  update: async (req, res, next) => {
    try {
      let inputParams = req.body;
      const settings = await Setting.findById(req.params.id);

      if (!settings) {
        return res.status(400).send({
          message: "Settings Not Found",
        });
      }

      const newSettings = await Setting.findByIdAndUpdate(
        req.params.id,
        inputParams,
        {
          new: true,
        }
      );

      return res.status(201).send({
        message: "Settings updated successfully.",
        data: newSettings,
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
  customerlist: async (req, res, next) => {
    try {
      const settings = await Setting.findOne(
        {},
        { privacyPolicy: 1, termsAndconditions: 1, aboutus: 1 }
      );
      return res.status(200).send({
        message: "Success",
        data: settings,
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
