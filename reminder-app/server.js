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
    await admin.messaging().send({
      token,
      notification: { title, body }
    });
    console.log(`Notification sent to ${token.substring(0, 10)}...`);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

function scheduleAppointmentNotifications(apptId, apptData) {
  const apptTime = new Date(apptData.timestamp).getTime();
  const now = Date.now();
  
  // Clear any existing jobs for this appointment
  if (scheduledJobs[apptId]) {
    clearTimeout(scheduledJobs[apptId].oneMin);
    clearTimeout(scheduledJobs[apptId].thirtyMin);
  }

  // Schedule 1-minute notification
  scheduledJobs[apptId] = {
    oneMin: setTimeout(async () => {
      await sendNotification(
        apptData.fcmToken,
        "Appointment Booked",
        `Hello ${apptData.name}, your appointment is at ${new Date(apptTime).toLocaleString()}`
      );
    }, 60000), // Exactly 1 minute
    
    thirtyMin: setTimeout(async () => {
      await sendNotification(
        apptData.fcmToken,
        "Appointment Reminder",
        `Reminder: ${apptData.name}, your appointment is in 30 minutes`
      );
      await db.ref(`appointments/${apptId}/reminderSent`).set(true);
    }, Math.max(apptTime - now - 1800000, 0)) // Exactly 30 minutes before
  };
}

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
    scheduleAppointmentNotifications(newApptRef.key, appointment);

    // Immediate confirmation
    await sendNotification(
      fcmToken,
      "Appointment Confirmed",
      `Hi ${name}, your appointment is scheduled for ${new Date(timestamp).toLocaleString()}`
    );

    res.status(201).send({ success: true, id: newApptRef.key });
  } catch (error) {
    console.error("Error creating appointment:", error);
    res.status(500).send({ error: "Failed to create appointment" });
  }
});

app.get("/appointments", async (req, res) => {
  try {
    const snapshot = await db.ref("appointments").once("value");
    res.send(snapshot.val() || {});
  } catch (error) {
    console.error("Error getting appointments:", error);
    res.status(500).send({ error: "Failed to get appointments" });
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
