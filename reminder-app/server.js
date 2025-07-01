const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const fetch = require('node-fetch'); // Added for cron job

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const db = admin.database();

// Endpoint to check and send reminders
app.get("/check", async (req, res) => {
  try {
    const now = Date.now();
    const notifyBefore = 30 * 60 * 1000;

    const snapshot = await db.ref("appointments").once("value");
    const appointments = snapshot.val() || {};
    const updates = {};

    for (const id in appointments) {
      const appt = appointments[id];
      const apptTime = new Date(appt.timestamp).getTime();

      if (!appt.reminderSent && appt.fcmToken && apptTime - now <= notifyBefore && apptTime > now) {
        await admin.messaging().send({
          token: appt.fcmToken,
          notification: {
            title: "Appointment Reminder",
            body: `Hi ${appt.name}, your appointment is at ${new Date(apptTime).toLocaleString()}`,
          },
        });
        
        updates[`appointments/${id}/reminderSent`] = true;
        updates[`appointments/${id}/reminderSentAt`] = new Date().toISOString();
      }
    }

    await db.ref().update(updates);
    res.send({ success: true, message: "Reminders processed", count: Object.keys(updates).length });
  } catch (error) {
    console.error("Error in /check:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// Create new appointment
app.post("/appointments", async (req, res) => {
  try {
    const { name, timestamp, fcmToken } = req.body;

    if (!name || !timestamp || !fcmToken) {
      return res.status(400).send({ error: "Missing required fields" });
    }

    const newApptRef = db.ref("appointments").push();
    const appointment = {
      name,
      timestamp,
      fcmToken,
      reminderSent: false,
      createdAt: new Date().toISOString()
    };

    await newApptRef.set(appointment);

    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: "Appointment Confirmed",
        body: `Hi ${name}, your appointment is scheduled for ${new Date(timestamp).toLocaleString()}`
      }
    });

    res.status(201).send({ 
      success: true, 
      id: newApptRef.key,
      appointment
    });
  } catch (error) {
    console.error("Error creating appointment:", error);
    res.status(500).send({ error: "Failed to create appointment" });
  }
});

// Get all appointments
app.get("/appointments", async (req, res) => {
  try {
    const snapshot = await db.ref("appointments").once("value");
    res.send(snapshot.val() || {});
  } catch (error) {
    console.error("Error getting appointments:", error);
    res.status(500).send({ error: "Failed to get appointments" });
  }
});

// All other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  
  // Internal cron job
  setInterval(async () => {
    try {
      const response = await fetch(`http://localhost:${port}/check`);
      const data = await response.json();
      console.log("Scheduled check result:", data);
    } catch (err) {
      console.error("Scheduled check error:", err);
    }
  }, 60000);
});
