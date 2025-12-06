/**
 * Get date ranges based on period and timezone
 * Handles timezone conversion properly for accurate filtering
 *
 * @param period - "today" | "weekly" | "earlier"
 * @param timeZone - User's timezone (e.g., "Asia/Kolkata" for India)
 * @returns MongoDB date query object
 */
export const getDateRangesByPeriod = (
  period: "today" | "weekly" | "earlier",
  timeZone: string = "Asia/Kolkata"
) => {
  // Get current date in user's timezone
  const now = new Date();
  const userNow = new Date(now.toLocaleString("en-US", { timeZone }));

  // Start of today in user's timezone
  const startOfToday = new Date(userNow);
  startOfToday.setHours(0, 0, 0, 0);

  // End of today in user's timezone
  const endOfToday = new Date(userNow);
  endOfToday.setHours(23, 59, 59, 999);

  // Start of week (Monday) in user's timezone
  const startOfWeek = new Date(userNow);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  // End of week (Sunday) in user's timezone
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Convert to UTC for MongoDB query
  const startOfTodayUTC = new Date(startOfToday.toISOString());
  const endOfTodayUTC = new Date(endOfToday.toISOString());
  const startOfWeekUTC = new Date(startOfWeek.toISOString());

  switch (period) {
    case "today":
      // Leads created today
      return {
        $gte: startOfTodayUTC,
        $lte: endOfTodayUTC,
      };

    case "weekly":
      // Leads created this week excluding today
      return {
        $gte: startOfWeekUTC,
        $lt: startOfTodayUTC,
      };

    case "earlier":
      // Leads created before this week
      return {
        $lt: startOfWeekUTC,
      };

    default:
      return {};
  }
};
