import { prisma } from "@/lib/db/prisma";

/**
 * What we got wrong before — handed to Andy before he writes and to every reviewer.
 * Recent (45 days): Blayke's edit/reject reasons and what reviews caught.
 * Permanent: `MISTAKE …` lessons recorded from errors that reached a customer.
 */
export async function getPastMistakes(limit = 20): Promise<string[]> {
  const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
  const rows = await prisma.workEvent.findMany({
    where: {
      note: { not: null },
      OR: [
        { event: { in: ["edits_requested", "rejected"] }, createdAt: { gte: since }, NOT: { note: { startsWith: "Cleanup:" } } },
        { event: "lesson", createdAt: { gte: since }, note: { startsWith: "REVIEW CAUGHT" } },
        { event: "lesson", note: { startsWith: "MISTAKE" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { event: true, note: true, createdAt: true },
  });
  return rows.map(
    (m) => `${m.createdAt.toISOString().slice(0, 10)} ${m.event === "lesson" ? "" : `Blayke ${m.event}: `}${m.note}`
  );
}
