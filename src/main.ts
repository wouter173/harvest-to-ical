import express from "express";
import { getTimeSheet } from "./harvest";

const app = express();

function parseTimeToDate(dateStr: string, timeStr: string): Date {
  const timeLower = timeStr.toLowerCase();
  const isPM = timeLower.includes("pm");
  const isAM = timeLower.includes("am");

  const timeOnly = timeLower.replace(/[ap]m/, "");
  const [hoursStr, minutesStr] = timeOnly.split(":");

  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isPM && hours !== 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);

  return date;
}

function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeICSText(text: string | null): string {
  if (!text) return "";
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function createEventSegments(entryId: number, startDate: Date, endDate: Date, summary: string, description: string): string[] {
  const events: string[] = [];

  let actualEndDate = endDate;
  if (endDate < startDate) {
    actualEndDate = new Date(startDate);
    actualEndDate.setDate(actualEndDate.getDate() + 1);
    actualEndDate.setHours(endDate.getHours(), endDate.getMinutes(), endDate.getSeconds());
  }

  let currentStart = new Date(startDate);
  let dayCounter = 1;

  while (currentStart < actualEndDate) {
    const endOfCurrentDay = new Date(currentStart);
    endOfCurrentDay.setHours(23, 59, 59, 999);

    const segmentEnd = actualEndDate <= endOfCurrentDay ? actualEndDate : endOfCurrentDay;

    const isMultiDay = actualEndDate > endOfCurrentDay || dayCounter > 1;

    const uid = isMultiDay ? `harvest-${entryId}-day${dayCounter}@harvestapp.com` : `harvest-${entryId}@harvestapp.com`;

    events.push(`BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDateToICS(new Date())}
DTSTART:${formatDateToICS(currentStart)}
DTEND:${formatDateToICS(segmentEnd)}
SUMMARY:${escapeICSText(summary)}
DESCRIPTION:${description}
END:VEVENT`);

    currentStart = new Date(currentStart);
    currentStart.setDate(currentStart.getDate() + 1);
    currentStart.setHours(0, 0, 0, 0);
    dayCounter++;
  }

  return events;
}

app.get("/calendar.ics", async (req, res) => {
  try {
    const data = await getTimeSheet();

    const events = data.time_entries
      .flatMap((entry) => {
        const startDate = parseTimeToDate(entry.spent_date, entry.started_time!);
        const endDate = parseTimeToDate(entry.spent_date, entry.ended_time!);

        const clientName = entry.client?.name || "No Client";
        const projectName = entry.project?.name || "No Project";
        const taskName = entry.task?.name || "No Task";

        const notes = escapeICSText(entry.notes);

        const summary = `${projectName} - ${taskName}`;
        const description = notes ? `Notes: ${notes}\nClient: ${clientName}` : `Client: ${clientName}`;

        return createEventSegments(entry.id, startDate, endDate, summary, description);
      })
      .join("\n");

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Harvest Time Tracker//EN
CALSCALE:GREGORIAN
${events}
END:VCALENDAR`;

    res.setHeader("Content-Type", "text/calendar");
    res.send(icsContent);
  } catch (error) {
    console.error("Error generating calendar:", error);
    res.status(500).send("Error generating calendar");
  }
});

app.listen(3000, () => console.log("ICS feed running on http://localhost:3000/calendar.ics"));
