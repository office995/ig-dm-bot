function createDailyStats() {
  return {
    date: new Date().toISOString().slice(0, 10),
    totalInbound: 0,
    totalOutbound: 0,
    newContacts: 0,
    closes: 0,
    modelLeads: 0,
    escalations: 0,
    repliesReceived: 0,
  };
}

const dailyStats = createDailyStats();

function resetDailyStatsIfNeeded(logToElla) {
  const today = new Date().toISOString().slice(0, 10);

  if (dailyStats.date !== today) {
    if (typeof logToElla === 'function') {
      logToElla('info', 'daily_report', { ...dailyStats });
    }

    const fresh = createDailyStats();
    dailyStats.date = fresh.date;
    dailyStats.totalInbound = fresh.totalInbound;
    dailyStats.totalOutbound = fresh.totalOutbound;
    dailyStats.newContacts = fresh.newContacts;
    dailyStats.closes = fresh.closes;
    dailyStats.modelLeads = fresh.modelLeads;
    dailyStats.escalations = fresh.escalations;
    dailyStats.repliesReceived = fresh.repliesReceived;
  }
}

module.exports = {
  dailyStats,
  resetDailyStatsIfNeeded,
};