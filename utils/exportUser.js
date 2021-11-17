const xlsx = require("xlsx");
const path = require("path");

const exportExcel = (data, workSheetColumnNames, workSheetName, filePath) => {
  const workBook = xlsx.utils.book_new();
  const workSheetData = [workSheetColumnNames, ...data];
  const workSheet = xlsx.utils.aoa_to_sheet(workSheetData);
  //console.log('worksheet name');
  //console.log(workSheet);
  xlsx.utils.book_append_sheet(workBook, workSheet, workSheetName);
  xlsx.writeFile(workBook, path.resolve(filePath));
};

const exportUsersToExcel = (
  users,
  workSheetColumnNames,
  workSheetName,
  filePath
) => {
  const data = users.map((userinfo) => {
    return [userinfo.name, userinfo.phone, userinfo.createdAt];
  });
  //console.log('array detect');
  // console.log(data);
  exportExcel(data, workSheetColumnNames, workSheetName, filePath);
};

module.exports = exportUsersToExcel;
