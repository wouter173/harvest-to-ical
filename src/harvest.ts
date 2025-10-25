import z from "zod";

const HOST = process.env.HOST;
const HARVEST_TOKEN = process.env.HARVEST_TOKEN;
const HARVEST_ACCOUNT_ID = process.env.HARVEST_ACCOUNT_ID;

const from = "2025-10-01";

const responseSchema = z.object({
  time_entries: z.array(
    z.object({
      id: z.number(),
      spent_date: z.string(),
      notes: z.string().nullable(),
      started_time: z.string().nullable(),
      ended_time: z.string().nullable(),
      created_at: z.string(),
      updated_at: z.string(),
      client: z.object({ id: z.number(), name: z.string() }).nullable(),
      project: z.object({ id: z.number(), name: z.string() }).nullable(),
      task: z.object({ id: z.number(), name: z.string() }).nullable(),
      user: z.object({ id: z.number(), name: z.string() }).nullable(),
    })
  ),
});

export async function getTimeSheet() {
  const res = await fetch(`${HOST}/v2/time_entries?from=${from}`, {
    headers: {
      Authorization: `Bearer ${HARVEST_TOKEN}`,
      "Harvest-Account-Id": HARVEST_ACCOUNT_ID!,
    },
  });

  const json = await res.json();
  const data = responseSchema.parse(json);

  const filteredEntries = data.time_entries.filter((entry) => entry.started_time !== null && entry.ended_time !== null);

  return { ...data, time_entries: filteredEntries };
}
