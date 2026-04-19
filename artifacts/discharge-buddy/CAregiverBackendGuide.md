# Caregiver Backend Integration Guide

This guide outlines the necessary backend endpoints and logic required to support the Caregiver features in the Discharge-Buddy app.

## 1. Linked Patients
**Endpoint**: `GET /api/caregiver/patients`  
**Description**: Returns a list of patients linked to the authenticated caregiver.

### Expected Response
```json
{
  "patients": [
    {
      "id": "string",
      "name": "string",
      "age": "number",
      "condition": "string",
      "dischargeDate": "ISO8601 string",
      "medicines": [...],
      "symptomLogs": [...],
      "followUps": [...],
      "emergencyContact": "string"
    }
  ]
}
```

---

## 2. Reminders (Nudges)
**Endpoint**: `POST /api/caregiver/remind`  
**Description**: Triggers a push notification to the patient.

### Expected Request
```json
{
  "patientId": "string",
  "type": "Medicine | Symptom | Hydration | Check-in",
  "message": "string (optional)"
}
```

### Backend Logic
1. Verify the caregiver is linked to the patient.
2. Send a push notification to the patient's registered device(s) using Firebase Cloud Messaging (FCM).

---

## 3. Messaging (SMS/WhatsApp)
**Endpoint**: `POST /api/caregiver/message`  
**Description**: Sends a message to the patient via SMS or WhatsApp.

### Expected Request
```json
{
  "patientId": "string",
  "text": "string",
  "channel": "sms | whatsapp"
}
```

### Backend Logic
1. Retrieve the patient's phone number from the database.
2. Use a service like **Twilio** or **Vonage** to send the message.
3. Log the message in the chat history.

---

## 4. Emergency Alerts
**Endpoint**: `POST /api/caregiver/alert`  
**Description**: Triggers a high-priority alert.

### Expected Request
```json
{
  "patientId": "string",
  "level": "High | Emergency"
}
```

### Backend Logic
1. **High**: Send high-priority push notifications and automated SMS to the patient and their emergency contacts.
2. **Emergency**: In addition to notifications, trigger any automated emergency protocols (e.g., notifying a call center if available).

---

## 5. Security Note
All endpoints must be protected by authentication. Ensure that a caregiver can only access data and trigger actions for patients they are explicitly linked to in the database.
