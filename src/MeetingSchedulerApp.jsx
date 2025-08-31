import React, { useState } from "react";
import { Upload, Download, Clock, Users, Calendar, Star } from "lucide-react";
import "./MeetingScheduler.css";

// CSV Parser Component
const CSVUploader = ({ onDataParsed, onError }) => {
  const [isDragging, setIsDragging] = useState(false);

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header and one data row");
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    if (headers.length < 6 || !headers.includes("Name")) {
      throw new Error(
        "CSV must have Name, Monday, Tuesday, Wednesday, Thursday, Friday columns"
      );
    }

    const schedules = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",").map((cell) => cell.trim());
      if (row.length >= 6 && row[0]) {
        const schedule = {
          name: row[0],
          Monday: row[1] || "",
          Tuesday: row[2] || "",
          Wednesday: row[3] || "",
          Thursday: row[4] || "",
          Friday: row[5] || "",
        };
        schedules.push(schedule);
      }
    }

    if (schedules.length === 0) {
      throw new Error("No valid schedule data found");
    }

    return schedules;
  };

  const handleFileUpload = (file) => {
    if (!file.name.endsWith(".csv")) {
      onError("Please upload a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const schedules = parseCSV(e.target.result);
        onDataParsed(schedules);
      } catch (error) {
        onError(error.message);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="uploader-container">
      <div
        className={`upload-area ${isDragging ? "dragging" : ""}`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
      >
        <Upload className="upload-icon" size={48} />
        <p className="upload-title">Upload Team Schedule CSV</p>
        <p className="upload-subtitle">
          Format: Name, Monday, Tuesday, Wednesday, Thursday, Friday
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={(e) =>
            e.target.files[0] && handleFileUpload(e.target.files[0])
          }
          className="file-input"
          id="csvInput"
        />
        <label htmlFor="csvInput" className="upload-button">
          Choose CSV File
        </label>
      </div>
    </div>
  );
};

// Schedule Parser Utility
const parseTimeSlots = (daySchedule) => {
  if (!daySchedule || daySchedule.trim() === "") return [];

  return daySchedule
    .split(";")
    .map((slot) => {
      const [start, end] = slot.trim().split("-");
      if (!start || !end) return null;

      const startMinutes = timeToMinutes(start.trim());
      const endMinutes = timeToMinutes(end.trim());

      if (startMinutes >= endMinutes) return null;

      return { start: startMinutes, end: endMinutes };
    })
    .filter((slot) => slot !== null);
};

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + (minutes || 0);
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
};

// Top Recommendations Component
const TopRecommendations = ({ schedules }) => {
  const [startingTime, setStartingTime] = useState("09:00");
  const [recommendations, setRecommendations] = useState([]);

  const timeOptions = [];
  for (let h = 7; h <= 18; h++) {
    timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
    timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
  }

  const findTopRecommendations = () => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const startingMinutes = timeToMinutes(startingTime);
    const dayResults = {};

    days.forEach((day) => {
      const userSlots = schedules.map((user) => ({
        name: user.name,
        slots: parseTimeSlots(user[day]),
      }));

      const timeSlots = [];

      // Generate all possible 30-minute slots from starting time to 18:30
      for (let start = startingMinutes; start < 18 * 60 + 30; start += 30) {
        let end = start + 30;

        // Try to extend the slot as long as people remain available
        while (end <= 18 * 60 + 30) {
          const availability = checkAvailability(userSlots, start, end);

          if (availability.fullyAvailable.length > 0) {
            // Check if we can extend this slot
            const nextSlotAvailability = checkAvailability(
              userSlots,
              start,
              end + 30
            );
            const canExtend =
              nextSlotAvailability.fullyAvailable.length ===
                availability.fullyAvailable.length &&
              JSON.stringify(nextSlotAvailability.fullyAvailable.sort()) ===
                JSON.stringify(availability.fullyAvailable.sort());

            if (canExtend && end + 30 <= 18 * 60 + 30) {
              end += 30;
              continue;
            } else {
              // Add this time block to results
              timeSlots.push({
                day,
                start: minutesToTime(start),
                end: minutesToTime(end),
                duration: `${(end - start) / 60}h`,
                score:
                  availability.fullyAvailable.length * 10 +
                  availability.partiallyAvailable.length,
                ...availability,
              });
              break;
            }
          } else {
            break;
          }
        }
      }

      // Sort by score (fully available people count * 10 + partially available count) and take top 2
      timeSlots.sort((a, b) => b.score - a.score);
      dayResults[day] = timeSlots.slice(0, 2);
    });

    setRecommendations(dayResults);
  };

  const checkAvailability = (userSlots, meetingStart, meetingEnd) => {
    const fullyAvailable = [];
    const partiallyAvailable = [];
    const notAvailable = [];

    userSlots.forEach((user) => {
      if (user.slots.length === 0) {
        notAvailable.push(user.name);
        return;
      }

      let isFullyAvailable = false;
      let isPartiallyAvailable = false;

      user.slots.forEach((slot) => {
        // Check full availability
        if (slot.start <= meetingStart && slot.end >= meetingEnd) {
          isFullyAvailable = true;
        }

        // Check partial availability
        const overlapStart = Math.max(slot.start, meetingStart);
        const overlapEnd = Math.min(slot.end, meetingEnd);
        const overlapDuration = Math.max(0, overlapEnd - overlapStart);

        if (overlapDuration >= 30) {
          isPartiallyAvailable = true;
        }
      });

      if (isFullyAvailable) {
        fullyAvailable.push(user.name);
      } else if (isPartiallyAvailable) {
        partiallyAvailable.push(user.name);
      } else {
        notAvailable.push(user.name);
      }
    });

    return { fullyAvailable, partiallyAvailable, notAvailable };
  };

  const exportRecommendations = () => {
    if (Object.keys(recommendations).length === 0) return;

    const csvContent = [
      "Day,Rank,Start Time,End Time,Duration,Fully Available Count,Fully Available Names",
    ];

    Object.entries(recommendations).forEach(([day, slots]) => {
      slots.forEach((slot, index) => {
        csvContent.push(
          [
            day,
            `#${index + 1}`,
            slot.start,
            slot.end,
            slot.duration,
            slot.fullyAvailable.length,
            `"${slot.fullyAvailable.join(", ")}"`,
          ].join(",")
        );
      });
    });

    const blob = new Blob([csvContent.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "top-meeting-recommendations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="recommendations-container">
      <div className="recommendations-card">
        <h2 className="section-title">
          <Star className="title-icon" />
          Top Meeting Recommendations
        </h2>

        <div className="controls-grid">
          <div className="control-group">
            <label className="control-label">Earliest Start Time</label>
            <select
              value={startingTime}
              onChange={(e) => setStartingTime(e.target.value)}
              className="control-select"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <button onClick={findTopRecommendations} className="primary-button">
              Get Recommendations
            </button>
          </div>

          {Object.keys(recommendations).length > 0 && (
            <div className="control-group">
              <button onClick={exportRecommendations} className="export-button">
                <Download className="button-icon" size={16} />
                Export CSV
              </button>
            </div>
          )}
        </div>

        {Object.keys(recommendations).length > 0 && (
          <div className="days-grid">
            {Object.entries(recommendations).map(([day, slots]) => (
              <div key={day} className="day-card">
                <h3 className="day-title">{day}</h3>

                {slots.length > 0 ? (
                  <div className="slots-container">
                    {slots.map((slot, index) => (
                      <div key={index} className="slot-card">
                        <div className="slot-header">
                          <div className="rank-badge">#{index + 1}</div>
                          <span className="duration-badge">
                            {slot.duration}
                          </span>
                        </div>

                        <div className="time-display">
                          {slot.start} - {slot.end}
                        </div>

                        <div className="availability-stats">
                          <div className="stat-row stat-green">
                            <span>✓ Fully Available</span>
                            <span className="stat-count">
                              {slot.fullyAvailable.length}
                            </span>
                          </div>

                          {slot.partiallyAvailable.length > 0 && (
                            <div className="stat-row stat-yellow">
                              <span>◐ Partially Available</span>
                              <span className="stat-count">
                                {slot.partiallyAvailable.length}
                              </span>
                            </div>
                          )}

                          {slot.notAvailable.length > 0 && (
                            <div className="stat-row stat-red">
                              <span>✗ Not Available</span>
                              <span className="stat-count">
                                {slot.notAvailable.length}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="names-section">
                          {slot.fullyAvailable.length > 0 && (
                            <div className="names-group names-green">
                              <strong>Available:</strong>{" "}
                              {slot.fullyAvailable.join(", ")}
                            </div>
                          )}
                          {slot.partiallyAvailable.length > 0 && (
                            <div className="names-group names-yellow">
                              <strong>Partial:</strong>{" "}
                              {slot.partiallyAvailable.join(", ")}
                            </div>
                          )}
                          {slot.notAvailable.length > 0 && (
                            <div className="names-group names-red">
                              <strong>Unavailable:</strong>{" "}
                              {slot.notAvailable.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-times">
                    <Clock className="no-times-icon" size={40} />
                    <p>No optimal times found</p>
                    <p className="no-times-subtitle">
                      Try adjusting start time
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Specific Time Query Component
const TimeQuery = ({ schedules }) => {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [queryResults, setQueryResults] = useState(null);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timeOptions = [];
  for (let h = 7; h <= 18; h++) {
    timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
    timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
  }

  const queryAvailability = () => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (startMinutes >= endMinutes) {
      alert("End time must be after start time");
      return;
    }

    const userSlots = schedules.map((user) => ({
      name: user.name,
      slots: parseTimeSlots(user[selectedDay]),
    }));

    const availability = checkAvailability(userSlots, startMinutes, endMinutes);
    setQueryResults({
      day: selectedDay,
      timeRange: `${startTime} - ${endTime}`,
      ...availability,
    });
  };

  const checkAvailability = (userSlots, meetingStart, meetingEnd) => {
    const fullyAvailable = [];
    const partiallyAvailable = [];
    const notAvailable = [];

    userSlots.forEach((user) => {
      if (user.slots.length === 0) {
        notAvailable.push(user.name);
        return;
      }

      let isFullyAvailable = false;
      let isPartiallyAvailable = false;

      user.slots.forEach((slot) => {
        // Check full availability
        if (slot.start <= meetingStart && slot.end >= meetingEnd) {
          isFullyAvailable = true;
        }

        // Check partial availability (at least 30 minutes overlap)
        const overlapStart = Math.max(slot.start, meetingStart);
        const overlapEnd = Math.min(slot.end, meetingEnd);
        const overlapDuration = Math.max(0, overlapEnd - overlapStart);

        if (overlapDuration >= 30) {
          isPartiallyAvailable = true;
        }
      });

      if (isFullyAvailable) {
        fullyAvailable.push(user.name);
      } else if (isPartiallyAvailable) {
        partiallyAvailable.push(user.name);
      } else {
        notAvailable.push(user.name);
      }
    });

    return { fullyAvailable, partiallyAvailable, notAvailable };
  };

  const exportQueryResults = () => {
    if (!queryResults) return;

    const csvContent = [
      "Query Day,Query Time Range,Availability Status,Names",
      `${queryResults.day},${
        queryResults.timeRange
      },Fully Available,"${queryResults.fullyAvailable.join(", ")}"`,
      `${queryResults.day},${
        queryResults.timeRange
      },Partially Available,"${queryResults.partiallyAvailable.join(", ")}"`,
      `${queryResults.day},${
        queryResults.timeRange
      },Not Available,"${queryResults.notAvailable.join(", ")}"`,
    ];

    const blob = new Blob([csvContent.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `availability-query-${queryResults.day}-${startTime}-${endTime}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="query-container">
      <div className="query-card">
        <h2 className="section-title">
          <Calendar className="title-icon" />
          Query Specific Time Availability
        </h2>

        <div className="query-controls">
          <div className="control-group">
            <label className="control-label">Day</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="control-select"
            >
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">Start Time</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="control-select"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">End Time</label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="control-select"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <button onClick={queryAvailability} className="query-button">
              Check Availability
            </button>
          </div>

          {queryResults && (
            <div className="control-group">
              <button onClick={exportQueryResults} className="export-button">
                <Download className="button-icon" size={16} />
                Export
              </button>
            </div>
          )}
        </div>

        {queryResults && (
          <div className="query-results">
            <h3 className="results-title">
              Availability for {queryResults.day} {queryResults.timeRange}
            </h3>

            <div className="results-grid">
              <div className="result-card result-green">
                <h4 className="result-header">
                  <Users className="result-icon" size={16} />
                  Fully Available ({queryResults.fullyAvailable.length})
                </h4>
                <div className="result-names">
                  {queryResults.fullyAvailable.length > 0
                    ? queryResults.fullyAvailable.join(", ")
                    : "None"}
                </div>
              </div>

              <div className="result-card result-yellow">
                <h4 className="result-header">
                  <Users className="result-icon" size={16} />
                  Partially Available ({queryResults.partiallyAvailable.length})
                </h4>
                <div className="result-names">
                  {queryResults.partiallyAvailable.length > 0
                    ? queryResults.partiallyAvailable.join(", ")
                    : "None"}
                </div>
              </div>

              <div className="result-card result-red">
                <h4 className="result-header">
                  <Users className="result-icon" size={16} />
                  Not Available ({queryResults.notAvailable.length})
                </h4>
                <div className="result-names">
                  {queryResults.notAvailable.length > 0
                    ? queryResults.notAvailable.join(", ")
                    : "None"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Schedule Preview Component
const SchedulePreview = ({ schedules }) => {
  if (schedules.length === 0) return null;

  return (
    <div className="preview-container">
      <div className="preview-card">
        <h2 className="section-title">
          <Users className="title-icon" />
          Loaded Schedules ({schedules.length} people)
        </h2>

        <div className="table-container">
          <table className="schedule-table">
            <thead className="table-header">
              <tr>
                <th>Name</th>
                <th>Monday</th>
                <th>Tuesday</th>
                <th>Wednesday</th>
                <th>Thursday</th>
                <th>Friday</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule, index) => (
                <tr key={index} className="table-row">
                  <td className="name-cell">{schedule.name}</td>
                  <td className="schedule-cell">{schedule.Monday || "—"}</td>
                  <td className="schedule-cell">{schedule.Tuesday || "—"}</td>
                  <td className="schedule-cell">{schedule.Wednesday || "—"}</td>
                  <td className="schedule-cell">{schedule.Thursday || "—"}</td>
                  <td className="schedule-cell">{schedule.Friday || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const MeetingSchedulerApp = () => {
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState("");

  const handleDataParsed = (parsedSchedules) => {
    setSchedules(parsedSchedules);
    setError("");
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setSchedules([]);
  };

  return (
    <div className="app-container">
      <div className="app-content">
        <div className="app-header">
          <h1 className="app-title">Team Meeting Scheduler</h1>
          <p className="app-subtitle">
            Get top meeting recommendations and check specific time availability
          </p>
        </div>

        <CSVUploader onDataParsed={handleDataParsed} onError={handleError} />

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {schedules.length > 0 && (
          <>
            <SchedulePreview schedules={schedules} />
            <TopRecommendations schedules={schedules} />
            <TimeQuery schedules={schedules} />
          </>
        )}

        {schedules.length === 0 && !error && (
          <div className="welcome-section">
            <div className="welcome-card">
              <Calendar className="welcome-icon" size={64} />
              <h3 className="welcome-title">
                Ready to Schedule Your Team Meeting?
              </h3>
              <p className="welcome-text">
                Upload your team's schedule CSV to get started with smart
                meeting recommendations
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingSchedulerApp;
