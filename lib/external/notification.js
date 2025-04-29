// utils/sendNotification.js
import * as Notifications from "expo-notifications";
import { getuserNotificationToken } from "../query/user";

export const sendPushNotification = async ( title, body) => {
  const token = await getuserNotificationToken();

  console.log("Notification token:", token);
  console.log("Notification title:", title);
  console.log("Notification body:", body);
  
  const message = {
    to: token,
    sound: "default",
    title: title,
    body: body,
    data: { customData: "optionalDataHere" },
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const data = await response.json();
    console.log("Push notification sent:", data);
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};



export const sendnotificationother = async (token, title, body) => {
 

  const message = {
    to: token,
    sound: "default",
    title: title,
    body: body,
    data: { customData: "optionalDataHere" },
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const data = await response.json();
    console.log("Push notification sent:", data);
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};