---
# **Team Meeting Scheduler**

A React-based web application that helps teams find the best meeting times by analyzing individual availability from a CSV schedule. The app provides **top meeting time recommendations** and allows **specific time availability queries**, making scheduling easier and more efficient.
---

## **Features**

✅ **CSV Upload for Team Schedules**

- Drag & drop or select a CSV file containing team member availability.
- Supported format:

  ```
  Name, Monday, Tuesday, Wednesday, Thursday, Friday
  Alice, 09:00-12:00;13:00-17:00, 10:00-12:00, ..., ...
  Bob, 08:00-11:00, 13:00-15:00, ..., ...
  ```

✅ **Schedule Preview**

- Displays a table of all team members and their daily availability.

✅ **Top Meeting Recommendations**

- Suggests the best time slots for meetings based on:

  - Maximum number of fully available participants.
  - Extended time slots if everyone remains available.

- Allows adjusting the **earliest start time**.
- Exports recommendations as a **CSV file**.

✅ **Specific Time Availability Query**

- Select a day and time range to check:

  - Who is **fully available**.
  - Who is **partially available**.
  - Who is **not available**.

- Exports query results as **CSV**.

✅ **Error Handling**

- Validates CSV format (requires `Name` and weekdays).
- Handles empty schedules and invalid files.

---

## **Tech Stack**

- **React** – UI framework
- **Lucide-react** – Icons
- **CSS** – Custom styling
- **FileReader API** – Reads and parses CSV files
- **Blob API** – Exports data as CSV

---

## **Installation & Setup**

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/meeting-scheduler.git
   cd meeting-scheduler
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the development server**

   ```bash
   npm start
   ```

4. Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## **CSV Format Details**

- The first row must be the header:

  ```
  Name, Monday, Tuesday, Wednesday, Thursday, Friday
  ```

- Availability format:

  - Multiple time slots per day separated by **semicolon (;)**.
  - Time range format: `HH:mm-HH:mm` (24-hour format).
  - Example:

    ```
    Alice, 09:00-12:00;13:00-17:00, 10:00-12:00, 09:30-11:00, , 14:00-16:00
    Bob, 08:00-11:00, 13:00-15:00, 09:00-12:00, 10:00-11:30, 09:00-10:00
    ```

---

## **How It Works**

### **1. Upload Team Schedule**

- Drag & drop or select your CSV file.
- Data is parsed into an array of schedules.

### **2. View Loaded Schedule**

- Preview the table of all team members and availability.

### **3. Get Top Recommendations**

- Click **Get Recommendations**.
- Adjust earliest start time if needed.
- Export recommendations as CSV.

### **4. Query Specific Time**

- Select **Day**, **Start Time**, and **End Time**.
- Check who is fully/partially/not available.
- Export results as CSV.

---

## **Exported CSV Examples**

### **Top Recommendations**

```
Day,Rank,Start Time,End Time,Duration,Fully Available Count,Fully Available Names
Monday,#1,09:00,11:00,2h,3,"Alice, Bob, Carol"
Monday,#2,11:00,12:00,1h,2,"Alice, Carol"
```

### **Specific Time Query**

```
Query Day,Query Time Range,Availability Status,Names
Monday,09:00 - 10:00,Fully Available,"Alice, Bob"
Monday,09:00 - 10:00,Partially Available,"Carol"
Monday,09:00 - 10:00,Not Available,"Dave"
```

---

## **Customization**

- Update `MeetingScheduler.css` for custom styling.
- Modify `TopRecommendations` logic to change scoring or ranking rules.

---

## **Future Enhancements**

- ✅ Add weekend support.
- ✅ Allow custom meeting duration.
- ✅ Add authentication for multi-user scenarios.
- ✅ Integrate with Google Calendar.

---

## **License**

This project is licensed under the **MIT License**.

---
