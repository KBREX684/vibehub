import type { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { mockPmfEvents, mockSubscriptions, mockWorkspacePreferences } from "@/lib/data/mock-data";
import { getPrisma, useMockData } from "@/lib/repositories/repository-shared";

export interface V11PmfDashboard {
  windowDays: number;
  windowStart: string;
  generatedAt: string;
  totals: {
    activeUsers: number;
    complianceEnabledUsers: number;
    usersWithLedgerExports: number;
    proUsers: number;
  };
  rates: {
    complianceEnabledRate: number;
    monthlyLedgerExportRate: number;
    proConversionRate: number;
  };
  eventBreakdown: Array<{
    event: string;
    count: number;
  }>;
}

export async function recordPmfEvent(params: {
  userId: string;
  event: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}) {
  if (useMockData) {
    const row = {
      id: randomUUID(),
      userId: params.userId,
      event: params.event,
      metadata: params.metadata,
      createdAt: (params.createdAt ?? new Date()).toISOString(),
    };
    mockPmfEvents.push(row);
    return row;
  }

  const db = await getPrisma();
  return db.pmfEvent.create({
    data: {
      userId: params.userId,
      event: params.event,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
      createdAt: params.createdAt ?? new Date(),
    },
  });
}

function pct(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export async function getV11PmfDashboard(windowDays = 30): Promise<V11PmfDashboard> {
  const generatedAt = new Date();
  const windowStart = new Date(generatedAt.getTime() - windowDays * 86400000);

  if (useMockData) {
    const activeUsers = Array.from(
      new Set(
        mockPmfEvents
          .filter((event) => new Date(event.createdAt) >= windowStart)
          .map((event) => event.userId)
      )
    );
    const complianceEnabledUsers = activeUsers.filter((userId) => {
      const pref = mockWorkspacePreferences.find((item) => item.workspaceId === `personal:${userId}`);
      return pref?.aigcAutoStamp !== false;
    }).length;
    const usersWithLedgerExports = new Set(
      mockPmfEvents
        .filter((event) => event.event === "ledger.exported" && new Date(event.createdAt) >= windowStart)
        .map((event) => event.userId)
    ).size;
    const proUsers = activeUsers.filter((userId) =>
      mockSubscriptions.some((sub) => sub.userId === userId && sub.tier === "pro")
    ).length;
    const counts = new Map<string, number>();
    for (const event of mockPmfEvents) {
      if (new Date(event.createdAt) < windowStart) continue;
      counts.set(event.event, (counts.get(event.event) ?? 0) + 1);
    }
    return {
      windowDays,
      windowStart: windowStart.toISOString(),
      generatedAt: generatedAt.toISOString(),
      totals: {
        activeUsers: activeUsers.length,
        complianceEnabledUsers,
        usersWithLedgerExports,
        proUsers,
      },
      rates: {
        complianceEnabledRate: pct(complianceEnabledUsers, activeUsers.length),
        monthlyLedgerExportRate: pct(usersWithLedgerExports, activeUsers.length),
        proConversionRate: pct(proUsers, activeUsers.length),
      },
      eventBreakdown: [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([event, count]) => ({ event, count })),
    };
  }

  const db = await getPrisma();
  const activeRows = await db.ledgerEntry.findMany({
    where: {
      signedAt: { gte: windowStart },
      actorType: "user",
    },
    select: { actorId: true },
    distinct: ["actorId"],
  });
  const activeUsers = activeRows.map((row) => row.actorId);
  const [complianceEnabledUsers, exportRows, proUsers, groupedEvents] = await Promise.all([
    activeUsers.length === 0
      ? Promise.resolve(0)
      : db.workspace.count({
          where: {
            kind: "personal",
            userId: { in: activeUsers },
            aigcAutoStamp: true,
          },
        }),
    activeUsers.length === 0
      ? Promise.resolve([])
      : db.pmfEvent.findMany({
          where: {
            createdAt: { gte: windowStart },
            event: "ledger.exported",
            userId: { in: activeUsers },
          },
          select: { userId: true },
          distinct: ["userId"],
        }),
    activeUsers.length === 0
      ? Promise.resolve(0)
      : db.userSubscription.count({
          where: {
            userId: { in: activeUsers },
            tier: "pro",
          },
        }),
    db.pmfEvent.groupBy({
      by: ["event"],
      where: { createdAt: { gte: windowStart } },
      _count: { _all: true },
    }),
  ]);

  return {
    windowDays,
    windowStart: windowStart.toISOString(),
    generatedAt: generatedAt.toISOString(),
    totals: {
      activeUsers: activeUsers.length,
      complianceEnabledUsers,
      usersWithLedgerExports: exportRows.length,
      proUsers,
    },
    rates: {
      complianceEnabledRate: pct(complianceEnabledUsers, activeUsers.length),
      monthlyLedgerExportRate: pct(exportRows.length, activeUsers.length),
      proConversionRate: pct(proUsers, activeUsers.length),
    },
    eventBreakdown: groupedEvents
      .map((row: { event: string; _count: { _all: number } }) => ({ event: row.event, count: row._count._all }))
      .sort(
        (a: { event: string; count: number }, b: { event: string; count: number }) =>
          b.count - a.count || a.event.localeCompare(b.event)
      ),
  };
}
