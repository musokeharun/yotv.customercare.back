const Report = require("./reports");

let report = new Report(Report.ALL, Report.LAST_WEEK, Report.TODAY, Report.STEP_DAILY_WEEK);

report.genderGraph(1).then(r => console.log(r)).catch(r => console.dir(r));