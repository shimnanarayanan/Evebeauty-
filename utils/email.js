const mail = require("nodemailer").mail;

exports.sendMail = async (mailOptions) => {
  try {
    mail(mailOptions);
  } catch (error) {
    console.error(error);
  }
};
