const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
app.use(cors());

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const db = admin.database();

app.get("/check", async (req, res) => {
  try {
    const now = Date.now();
    const notifyBefore = 30 * 60 * 1000; // 30 minutes in ms

    const snapshot = await db.ref("appointments").once("value");
    const appointments = snapshot.val() || {};
    const updates = {};

    for (const id in appointments) {
      const appt = appointments[id];
      const time = new Date(appt.timestamp).getTime();

      if (
        !appt.reminderSent &&
        appt.fcmToken &&
        time - now <= notifyBefore &&
        time > now
      ) {
        // Send push notification
        await admin.messaging().send({
          token: appt.fcmToken,
          notification: {
            title: "Appointment Reminder",
            body: `Hi ${appt.name}, you have an appointment at ${appt.timestamp}`,
          },
        });
        updates[`appointments/${id}/reminderSent`] = true;
      }
    }

    await db.ref().update(updates);
    res.send("Notifications sent");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error sending notifications");
  }
});

app.get("/", (req, res) => {
  res.send("Appointment Reminder Backend is running.");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
