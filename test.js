const fs = require("fs");

const testJSON = fs.readFileSync(__dirname + "/result.json");

if (!testJSON) return "No data";

const res = {
  "01": 0,
  "02": 0,
  "03": 0,
  "04": 0,
  "05": 0,
  "06": 0,
};

JSON.parse(testJSON).forEach((obj) => {
  let m = obj["subscription_endtime"].substr(5, 2);
  res[m] = res[m] + 1;
  return;
});

// fs.writeFileSync(__dirname + "/result.json", JSON.stringify(filtered));
console.log(res);
console.log("Finished");
