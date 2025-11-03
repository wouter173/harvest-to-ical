export function parseTimeToDate(dateStr: string, timeStr: string): Date {
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

export function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function escapeICSText(text: string | null): string {
  if (!text) return "";
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

type EventSegment = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
};

export function createEventSegments(entryId: number, startDate: Date, endDate: Date, summary: string, description: string): EventSegment[] {
  const segments: EventSegment[] = [];

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

    segments.push({
      uid,
      start: new Date(currentStart),
      end: new Date(segmentEnd),
      summary,
      description,
    });

    currentStart = new Date(currentStart);
    currentStart.setDate(currentStart.getDate() + 1);
    currentStart.setHours(0, 0, 0, 0);
    dayCounter++;
  }

  return segments;
}

export function generateICSEvent(segment: EventSegment): string {
  return `BEGIN:VEVENT
UID:${segment.uid}
DTSTAMP:${formatDateToICS(new Date())}
DTSTART:${formatDateToICS(segment.start)}
DTEND:${formatDateToICS(segment.end)}
SUMMARY:${escapeICSText(segment.summary)}
DESCRIPTION:${segment.description}
END:VEVENT`;
}

export function generateICSCalendar(events: string[]): string {
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Harvest Time Tracker//EN
CALSCALE:GREGORIAN
${events.join("\n")}
END:VCALENDAR`;
}
