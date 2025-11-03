import express from "express";
import { getTimeSheet } from "./harvest";
import { parseTimeToDate, createEventSegments, generateICSEvent, generateICSCalendar, escapeICSText } from "./ical";

const app = express();

app.get("/calendar.ics", async (req, res) => {
  if (req.query.token !== process.env.INTERNAL_TOKEN) {
    res.status(403).send("Forbidden");
    return;
  }

  try {
    const data = await getTimeSheet();

    const events = data.time_entries.flatMap((entry) => {
      const startDate = parseTimeToDate(entry.spent_date, entry.started_time!);
      const endDate = parseTimeToDate(entry.spent_date, entry.ended_time!);

      const clientName = entry.client?.name || "No Client";
      const projectName = entry.project?.name || "No Project";
      const taskName = entry.task?.name || "No Task";

      const notes = escapeICSText(entry.notes);

      const summary = `${projectName} - ${taskName}`;
      const description = notes ? `Notes: ${notes}\nClient: ${clientName}` : `Client: ${clientName}`;

      const segments = createEventSegments(entry.id, startDate, endDate, summary, description);

      return segments.map((segment) => generateICSEvent(segment));
    });

    const icsContent = generateICSCalendar(events);

    res.setHeader("Content-Type", "text/calendar");
    res.send(icsContent);
  } catch (error) {
    console.error("Error generating calendar:", error);
    res.status(500).send("Error generating calendar");
  }
});

app.get("/", (req, res) => {
  res.status(200).end("ICS feed is available at /calendar.ics");
});

app.listen(3000, () => console.log("ICS feed running on http://localhost:3000/calendar.ics"));
