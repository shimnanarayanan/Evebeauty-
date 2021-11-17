const Menu = require("../models/Menu");
const handleError = require("../utils/helpers").handleErrors;

module.exports = {
  list: async (req, res, next) => {
    let menu;
    try {
      menu = await Menu.find();
      return res.status(200).json({
        message: "Menu Details",
        data: {
          menu: menu,
        },
      });
    } catch (error) {
      return res.status(400).json({
        message: "Error getting menu Details",
      });
    }
  },

  create: async (req, res) => {
    let inputParams;
    console.log(req.body);
    try {
      inputParams = req.body;

      let menu = await Menu.create(inputParams);
      return res.status(200).send({
        message: "Menu created successfully.",
        data: menu,
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
      const id = req.params.id;
      let inputParams = req.body;
      let menu = await Menu.findById(id);
      if (!menu) {
        return res.status(400).send({
          message: "menu not found!",
        });
      }

      const newmenu = await Menu.findOneAndUpdate({ _id: id }, inputParams, {
        new: true,
      });
      return res.status(200).send({
        message: "menu updated successfully.",
        data: newmenu,
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
