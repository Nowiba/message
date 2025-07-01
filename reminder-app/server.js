const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();
const scheduledJobs = {};

async function sendNotification(token, title, body) {
  try {
    if (token.startsWith('huawei-') || token.startsWith('brave-')) {
      console.log('Skipping notification for fallback token');
      return;
    }
    
    await admin.messaging().send({
      token: token,
      notification: { title, body },
      android: { priority: 'high' },
      apns: { headers: { 'apns-priority': '10' } }
    });
    console.log(`Notification sent to ${token.substring(0, 10)}...`);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

function scheduleAppointmentNotifications(apptId, apptData) {
  const apptTime = new Date(apptData.timestamp);
  const now = new Date();
  
  // Clear existing jobs if any
  if (scheduledJobs[apptId]) {
    clearTimeout(scheduledJobs[apptId].oneMin);
    clearTimeout(scheduledJobs[apptId].thirtyMin);
  }

  // Schedule 1-minute notification
  const oneMinDelay = Math.max(60000 - (now - apptTime), 0);
  scheduledJobs[apptId] = {
    oneMin: setTimeout(async () => {
      await sendNotification(
        apptData.fcmToken,
        "Appointment Booked",
        `Hello ${apptData.name}, your appointment is at ${apptTime.toLocaleString()}`
      );
    }, oneMinDelay),
    
    thirtyMin: setTimeout(async () => {
      await sendNotification(
        apptData.fcmToken,
        "Appointment Reminder",
        `Reminder: ${apptData.name}, your appointment is in 30 minutes`
      );
      await db.ref(`appointments/${apptId}/reminderSent`).set(true);
    }, Math.max(apptTime - now - 1800000, 0))
  };
}

app.post("/appointments", async (req, res) => {
  try {
    const { name, timestamp, fcmToken } = req.body;
    
    if (!name || !timestamp || !fcmToken) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const apptTime = new Date(timestamp);
    if (apptTime <= new Date()) {
      return res.status(400).json({ error: "Appointment time must be in the future" });
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
    scheduleAppointmentNotifications(newApptRef.key, appointment);

    // Immediate confirmation
    await sendNotification(
      fcmToken,
      "Appointment Confirmed",
      `Hi ${name}, your appointment is scheduled for ${apptTime.toLocaleString()}`
    );

    return res.status(201).json({ 
      success: true, 
      id: newApptRef.key,
      message: "Appointment scheduled successfully"
    });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return res.status(500).json({ 
      error: "Failed to create appointment",
      details: error.message 
    });
  }
});

app.get("/appointments", async (req, res) => {
  try {
    const snapshot = await db.ref("appointments").once("value");
    res.json(snapshot.val() || {});
  } catch (error) {
    console.error("Error getting appointments:", error);
    res.status(500).json({ error: "Failed to get appointments" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
