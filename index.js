// const express = require("express"); //requiring express
// const app = express(); //app has all the properties of express
// const server = require("http").Server(app); //creting http server
// const io = require("socket.io")(server); //socket runs on this server
// const { ExpressPeerServer } = require("peer"); //WebRTC api for real time media communication
// const PORT = process.env.PORT || 8000; //port on which server runs

// const peerServer = ExpressPeerServer(server, {
//   debug: true,
// });

// app.use(express.static("./assets")); //setting up static path
// app.set("view engine", "ejs"); //setting up view engine
// app.set("views", "./views"); //setting up view path
// app.use("/", require("./routes/index"));

// const stun = require("stun");

// var Turn = require("node-turn");
// const PORT_TURN = 3478 || 19302;
// console.log("App Port: " + PORT_TURN);
// var server_tu = new Turn({
//   // set options
//   authMech: "none",
//   debugLevel: "DEBUG",
//   listeningIps: ["0.0.0.0"],
//   listeningPort: `${PORT_TURN}`,
//   log: function (data) {
//     console.log("LOG DONE" + data);
//   },
// });

// server_tu.on("connection", function () {
//   console.log("TURN server is now listening...");
//   server_tu.start();
// });

// server_tu.on("listening", function () {
//   console.log("TURN server is now listening...");
//   server_tu.start();
// });

// server_tu.on("relay", function (relay) {
//   console.log("Relay allocation created:", relay);
// });

// server_tu.start();

// //socket handels users joining/leaving and messaging
// io.on("connection", (socket) => {
//   //request for joining room
//   socket.on("join-room", (roomId, userId, userName) => {
//     socket.join(roomId); //joining the mentioned room
//     socket.broadcast.to(roomId).emit("user-connected", userId, userName);
//     socket.on("send-message", (inputMsg, userName) => {
//       io.to(roomId).emit("recieve-message", inputMsg, userName);
//     });
//     socket.on("disconnect", () => {
//       socket.broadcast.to(roomId).emit("user-disconnected", userId, userName);
//     });
//   });
// });

// //running the server
// server.listen(PORT, function (err) {
//   if (err) {
//     console.log(`Error :: ${err} occured while starting the server in index.js!`);
//   }
//   console.log(`Server is up and running on port ${PORT}`);
// });

const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const { RTCPeerConnection, RTCSessionDescription } = require("wrtc"); // Using wrtc for Node.js WebRTC support

// Serve static files (HTML, CSS, JS)
app.use(express.static("public"));

// Create STUN and TURN server configuration
const configuration = {
  iceServers: [
    { urls: "stun:stun.example.com" }, // Replace with your STUN server URL
    { urls: "turn:turn.example.com", username: "username", credential: "password" }, // Replace with your TURN server URL and credentials
  ],
};

// Handle WebSocket connections
io.on("connection", (socket) => {
  // Create a new RTCPeerConnection for each client
  const peerConnection = new RTCPeerConnection(configuration);

  // Handle signaling messages
  socket.on("signal", async (message) => {
    if (message.type === "offer") {
      // Set remote description and create an answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send the answer back to the sender
      socket.emit("signal", answer);
    } else if (message.type === "answer") {
      // Set remote description
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.candidate) {
      // Add ICE candidate to the RTCPeerConnection
      await peerConnection.addIceCandidate(message.candidate);
    }
  });

  // Listen for ICE candidates and send them to the client
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("signal", { candidate: event.candidate });
    }
  };

  // Listen for ice connection state change and handle it accordingly
  peerConnection.oniceconnectionstatechange = (event) => {
    if (peerConnection.iceConnectionState === "disconnected") {
      // Handle disconnection
    }
  };

  // Add media tracks and negotiate the connection

  // ... Code to add media tracks and handle stream negotiation goes here ...

  // Handle received ICE candidates
  socket.on("signal", async (message) => {
    if (message.candidate) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    }
  });

  // Add media tracks and negotiate the connection
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      // Add local media stream to the peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Create an offer and set it as the local description
      return peerConnection.createOffer();
    })
    .then((offer) => {
      return peerConnection.setLocalDescription(offer);
    })
    .then(() => {
      // Send the offer to the other peer
      io.to(socketId).emit("signal", peerConnection.localDescription);
    })
    .catch((error) => {
      console.error("Error accessing media devices:", error);
    });

  // Handle received offers and answers
  socket.on("signal", async (message) => {
    if (message.type === "offer") {
      // Set remote description and create an answer
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send the answer back to the sender
        io.to(socketId).emit("signal", peerConnection.localDescription);
      } catch (error) {
        console.error("Error setting remote description or creating answer:", error);
      }
    } else if (message.type === "answer") {
      // Set remote description
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
      } catch (error) {
        console.error("Error setting remote description:", error);
      }
    }
  });

  // Receive and display remote media streams
  peerConnection.ontrack = (event) => {
    const remoteStream = event.streams[0];

    // Display the remote stream in a video element with the 'remote-video' id
    const remoteVideoElement = document.getElementById("remote-video");
    remoteVideoElement.srcObject = remoteStream;
  };

  // Cleanup when the socket is disconnected
  socket.on("disconnect", () => {
    // Close the peer connection
    peerConnection.close();
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Signaling server is running on port ${PORT}`);
});
