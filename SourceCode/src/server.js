const express = require("express");
const bodyParser = require("body-parser");
const swaggerUi = require("swagger-ui-express");
const yaml = require("yaml");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const scrapeProducts = require("./scraper");
const { spawn } = require('child_process');

// Import all endpoint modules
const {
  uploadShow,
  uploadTheatre,
  exportFailedStructures,
  getLatestFile,
  fetchStructure,
  fetchShowStructure
} = require('./endpoints');

const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve the Socket.io client library
app.use('/socket.io', express.static(path.join(__dirname, '../node_modules/socket.io/client-dist')));

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "../public")));

// Load Swagger YAML file for UI
const swaggerDocument = yaml.parse(
  fs.readFileSync(path.join(__dirname, "swagger.yaml"), "utf8")
);
app.use("/api", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
//CMD input to HTMl configs 

// for dynamic HTML

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"] 
  }
});

let logbuffer = [];
let lastLog = 0;

//redirect stdout to capture logs
const stdoutWrite = process.stdout.write;
process.stdout.write = (data) => {
  logbuffer.push(data);
  stdoutWrite.call(process.stdout, data);

  // makes only new logs release in browser
  if (logbuffer.length > lastLog) {
    const newLogs = logbuffer.slice(lastLog);
    io.emit('stdout', newLogs.join(''));
    lastLog = logbuffer.length;
  }
}

//sends the logs to the browser
io.on('connection', (socket) => {
  console.log('CMD live');
  console.log(" ");
  console.log(" __      __   _                    _            _                 _      ");
  console.log(" \\ \\    / ___| |__ ___ _ __  ___  | |_ ___   __| |_ __ _ __ _ ___| |_  _ ");
  console.log("  \\ \\/\\/ / -_| / _/ _ | '  \\/ -_) |  _/ _ \\ (_-|  _/ _` / _` / -_| | || | ");
  console.log("   \\_/\\_/\\___|_\\__\\___|_|_|_\\___|  \\__\\___/ /__/\\__\\__,_\\__, \\___|_|\\_, | ");
  console.log("                                                         |___/       |__/ ");
  console.log(" ");
  console.log("       ░░░▓██▒░░░░▒██▓░░░███░░░░░███▓░░░░▓██▒░░▒██▓░░░░░▓██░░░░░      ");
  console.log("    ░░░░░░███░░░░░▓██░░░▓██▒░░░░█████▒░░░░███░░░███▒░░░░▓██░░░░░░░    ");
  console.log("   ░░░░░░░███░░░░▒██▓░░░██▓░░░░███████▒░░░▓██▓░░░██▓░░░░▒██▒░░░░░░░   ");
  console.log("  ░░░░░░░▒██▒░░░░███░░░███░░░▒█████████▒░░░▓██▒░░▓██▒░░░▒███░░░░░░░░  ");
  console.log("  ░░░░░░░███░░░░▓██▒░░███▒░░▒███████████▓░░░███▒░░███▒░░░███▒░░░░░░░  ");
  console.log(" ░░░░░░░▒██▓░░░▓██▓░░███▒░░▓██████████████▒░░███░░░███░░░░██▓░░░░░░░░ ");
  console.log(" ░░░░░░░███░░░▒███░░███▒░▒██████████████████░░███▒░▒███░░░▓██▒░░░░░░░ ");
  console.log(" ░░░░░░▓██▒░░▒███░▒███▒▓██████████████████████░▓██▓░▓███░░▒███░░░░░░░ ");
  console.log(" ░░░░░▒███░░▒████████████████████████████████████████████░░▒██▓░░░░░░░▒ ");
  console.log(" ░░░░░█████▓██▓░▒▓███████▓                  ▓██████▓▓▒▒███▓████▓░░░░▒ ");
  console.log(" ░░░░░░▓█████▓░░░███▒                            ███▒░░░██████░░░░░░░▒ ");
  console.log(" ░░░░░▒█████░░░▒████                              ███▒░░░▓████▓░░░░░░▒ ");
  console.log(" ░░░░▒████▒░░░▒█████   ████████░      ████████    █████░░░▒████▓░░░░▒ ");
  console.log(" ░░░▒███▒░░░▒███████                             ░██████▓░░▒░▓██▓░░░░░▒ ");
  console.log(" ░░▒███▒░░▓█████████       ▒             ▒▒      ▒█████████▒▒▒███▓▒▒▒ ");
  console.log(" ▒████▓█████████████   ████████       ▓███████░  █████████████▓██████ ");
  console.log(" ▓███████████  ▒████░   ▒███████     ▓███████    █████  █████████████ ");
  console.log("      ▓███░       ▓██                           ▓██░       ████       ");
  console.log("      ▒████      ░███░                          ███▓░░    ▒████       ");
  console.log(" ▓███████████  ▒██████                         ░██████  █████████████ ");
  console.log(" ▓████████████████████▓                        ██████████████████████ ");
  console.log(" ░▒███▒▒████████████████      █████████       ███████████████▓░▓██▒░▒ ");
  console.log(" ░▒▓██▓▒▒███████████████▓     █████████      ████████████████░▒███▒▒▒ ");
  console.log(" ░▒▒███▒▒▓█████▓    ▓█████      ▒████      ▓██████   ███████▒▒▓██▓▒▒▒ ");
  console.log(" ░▒▒▓██▒░▒█████▓  ▒     ▓██▓              ████████     ████▓░▒███▒▒▒▒ ");
  console.log(" ░▒▒▓██▓▒▒█████▓  ████   ░███▓          ██████████  █  ░███▒▒▒███░▒▒▒ ");
  console.log(" ░▒▒▒███▒▒▒█████  █████  ░███████▓▓▓██████████████  █▓  ██▓░▒▓██▒▒▒▒▒ ");
  console.log(" ░▒▒▒███▒▒▒████▓  █████  ░████████████████████████  █░ ▒██▒▒▒███▒▒░▒▒ ");
  console.log(" ░▒▒▒▓██▓▒▒▓████░▓█████  ░████████████████████████  ██████▒▒▒███▒▒▒▒▒ ");
  console.log(" ░▒▒▒▒██▓▒▒▒███████████  ░█████████████████████     ██████▒▒▒███▒▒▒▒▒ ");
  console.log(" ░▒▒▒▒███▒▒▒████████     ░████████  █████████       █████▒▒▒▓██▓▒▒▒▒▒ ");
  console.log(" ░▒▒▒▒███▒▒▒██████▓      ██████        █████       ▓█████▒▒▒▓██▓▒▒▒▒░ ");
  console.log("  ▒▒▒▒███▒▒▒███████    ░██████████  ██████████▒░▓████████▒▒▒▓██▓▒▒▒▒  ");
  console.log("   ▒▒▒███▒▒▒▓█████████████████████  █████████████████████▒▒▒▓██▓▒▒▒░  ");
  console.log("    ▒▒███▒▒▒▓████████████████████████████████████████████▒▒▒▓██▓▒▒    ");
  console.log("      ▒█▓▒▒▒▓████████████████████████████████████████████▒▒▒▒██▓       ");

  socket.emit('stdout', logbuffer.join(''));

});

// clear the logs function 
app.post('/clear-logs', (req, res) => {
  logbuffer = [];
  res.json({success: true});
});

//Enddrtg
// /_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-


// Route to serve the main layout (layout.html) at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "layout.html"));
});

// Mount scraper routes
app.use("/scrape", scrapeProducts);

// Mount individual endpoint routes
app.use("/", uploadShow);
app.use("/", uploadTheatre);
app.use("/", exportFailedStructures);
app.use("/", getLatestFile);
app.use("/", fetchStructure);
app.use("/", fetchShowStructure);

// Serve the `dataOutput` folder for file downloads
app.use("/dataOutput", express.static(path.join(__dirname, "../dataOutput"), {
  setHeaders: (res, path) => {
    if (path.endsWith(".zip")) {
      res.setHeader("Content-Type", "application/zip");
    }
  }
}));

/// KEEP THIS AT THE BOTTOM!!!!
// Start the server
//_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Visit the app at http://localhost:${port}/`);
  console.log(`Swagger docs available at http://localhost:${port}/api`);
});