const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const config = require("config");

// CUSTOM MIDDLEWARE
app.use(cors());
let limit = "10mb";
app.use(express.json({ limit: limit }));
app.use(bodyParser.json({ limit: limit }));
app.use(bodyParser.urlencoded({ extended: true, limit: limit }));

app.all("/", (req, res) =>
  res.json({ msg: "Welcome to YotvChannels Customer API" })
);

const tokenCheck = (req, res, next) => {
  if (req.path.includes("/login")) {
    next();
    return;
  }

  let { token } = req.headers;
  try {
    const decoded = jwt.verify(token, config["secret"]);
    // console.log(decoded);
    res.locals.user = { ...decoded };
    next();
  } catch (err) {
    console.log(err);
    res.status(403).send("Unauthorised login");
  }
};

app.use(tokenCheck);

// Define the routes
app.use("/user", require("./user"));
app.use("/bulk", require("./bulk"));
app.use("/admin", require("./admin"));

// use env PORT for production, 5000 for development,
// nodemon will watch any changes to server without restart
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server start on port ${PORT}`));
