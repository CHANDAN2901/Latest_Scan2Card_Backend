# Scan2Card – Product Requirements Document (PRD)

## 1. Overview

Scan2Card is a digital lead‑collection application used during events. It helps exhibitors scan attendee cards using OCR and instantly store their details. The system improves event lead management by removing manual data entry.

## 2. User Types

There are four user roles:

### **1. Super Admin**

* Creates and manages exhibitors.
* Oversees overall system activity.

### **2. Exhibitor**

* Creates events.
* Generates licence keys for each event.
* Shares licence keys with team managers or end users so they can join the event.

### **3. Team Manager**

* Manages the team members participating in the event.
* Coordinates scanning and lead collection across the team.

### **4. End User**

* Scans attendee cards using OCR.
* Saves the lead data into the event system.

## 3. Core Features

### **1. Event Creation (Exhibitor)**

* Create and edit events.
* Generate licence keys tied to events.
* Assign licence keys to users.

### **2. OCR‑Based Card Scanning (End User)**

* Scan attendee cards.
* Extract data such as name, phone number, email, etc.
* Store the data in the system.

### **3. Lead Management**

* Exhibitors and team managers can view all collected leads.
* Leads can be exported for marketing and follow‑ups.

### **4. User Access Management**

* Super Admin manages exhibitors.
* Exhibitors manage their event participants.
* Licence keys control access.

## 3.5 Independent Lead Collection (End User)

* End users can scan and collect leads even without joining any event.
* No exhibitor or team manager is required.
* Leads collected independently are saved under the user's personal lead list.

## 4. Workflow Summary

1. Super Admin creates an Exhibitor.
2. Exhibitor creates an event.
3. Exhibitor generates a licence key.
4. Team Manager or End User uses the licence key to join the event.
5. End User scans attendee cards using OCR.
6. Lead data is saved and visible to the exhibitor for future use.

## 5. Goal of the App

The main purpose of Scan2Card is to make lead collection fast, accurate, and digital. Exhibitors can focus on engaging with attendees while the system automatically captures and stores all essential information.
