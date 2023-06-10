const express = require("express"); //requiring express
const app = express(); //app has all the properties of express
const server = require("http").Server(app); //creting http server
const io = require("socket.io")(server); //socket runs on this server
const { ExpressPeerServer } = require("peer"); //WebRTC api for real time media communication
const PORT = process.env.PORT || 8000; //port on which server runs

const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use(express.static("./assets")); //setting up static path
app.set("view engine", "ejs"); //setting up view engine
app.set("views", "./views"); //setting up view path
app.use("/", require("./routes/index"));

const stun = require("stun");

var Turn = require("node-turn");
const PORT_TURN = 3478 || 19302;
console.log("App Port: " + PORT_TURN);
var server_tu = new Turn({
  // set options
  authMech: "none",
  debugLevel: "DEBUG",
  listeningIps: ["0.0.0.0"],
  listeningPort: `${PORT_TURN}`,
  log: function (data) {
    console.log("LOG DONE" + data);
  },
});

server_tu.on("connection", function () {
  console.log("TURN server is now listening...");
  server_tu.start();
});

server_tu.on("listening", function () {
  console.log("TURN server is now listening...");
  server_tu.start();
});

server_tu.on("relay", function (relay) {
  console.log("Relay allocation created:", relay);
});

server_tu.start();

//socket handels users joining/leaving and messaging
io.on("connection", (socket) => {
  //request for joining room
  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId); //joining the mentioned room
    socket.broadcast.to(roomId).emit("user-connected", userId, userName);
    socket.on("send-message", (inputMsg, userName) => {
      io.to(roomId).emit("recieve-message", inputMsg, userName);
    });
    socket.on("disconnect", () => {
      socket.broadcast.to(roomId).emit("user-disconnected", userId, userName);
    });
  });
});

//running the server
server.listen(PORT, function (err) {
  if (err) {
    console.log(`Error :: ${err} occured while starting the server in index.js!`);
  }
  console.log(`Server is up and running on port ${PORT}`);
});
