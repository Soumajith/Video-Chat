# Video Calling App

A simple browser-based **video calling application** built using **React**, **WebRTC**, and **Socket.IO**.
Users can join a room and make peer-to-peer video calls with real-time signaling handled by a Node.js backend.

---

## Features

* Real-time video & audio calling
* WebRTC peer-to-peer connection
* Socket.IO signaling
* Room-based connection
* TURN/STUN support (for NAT traversal)
* Deployed frontend + backend

---

## Tech Stack

**Frontend:** React, ReactPlayer
**Backend:** Node.js, Socket.IO
**WebRTC:** RTCPeerConnection, ICE negotiation
**Deployment:**

* Frontend → Vercel
* Backend → Render

---

## Project Structure

```
client     → React frontend  
server     → Node.js + Socket.IO signaling server  
```

---

## Running Locally

### Backend

```bash
cd server
npm install
npm start
```

### Frontend

```bash
cd client
npm install
npm start
```

---

## Live Deployment

* **Frontend:** [https://video-chat-jade-two.vercel.app](https://video-chat-jade-two.vercel.app)
* **Backend:** [https://video-chat-server-ca7m.onrender.com](https://video-chat-server-ca7m.onrender.com)

---
