import cron from "node-cron";
import MeetingModel from "../models/meeting.model";
import UserModel from "../models/user.model";
import LeadsModel from "../models/leads.model";
import { sendNotificationToDevice, sendNotificationToMultipleDevices } from "../services/firebase.service";

/**
 * Meeting Reminder Cron Job
 *
 * Runs every 15 minutes to check for upcoming meetings and send reminders
 * Sends notifications 1 hour before the meeting starts
 */

const REMINDER_WINDOW_MINUTES = 60; // Send reminder 1 hour before meeting

export const startMeetingReminderCron = () => {
  // Run every 15 minutes: */15 * * * *
  // For testing, use every minute: * * * * *
  const cronSchedule = "*/15 * * * *"; // Every 15 minutes

  cron.schedule(cronSchedule, async () => {
    try {
      console.log("🔔 Running meeting reminder cron job...");

      const now = new Date();
      const reminderTime = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

      // Find meetings that:
      // 1. Start within the next 60 minutes
      // 2. Are scheduled (not completed/cancelled)
      // 3. Have notifyAttendees enabled
      // 4. Haven't had a reminder sent yet
      // 5. Are not deleted
      const upcomingMeetings = await MeetingModel.find({
        startAt: {
          $gte: now,
          $lte: reminderTime,
        },
        meetingStatus: "scheduled",
        notifyAttendees: true,
        reminderSent: false,
        isDeleted: false,
      })
        .populate("userId", "firstName lastName fcmTokens")
        .populate("leadId", "details");

      console.log(`📅 Found ${upcomingMeetings.length} meetings requiring reminders`);

      for (const meeting of upcomingMeetings) {
        try {
          const user = meeting.userId as any;
          const lead = meeting.leadId as any;

          if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
            console.log(`⚠️  User ${user?._id} has no FCM tokens registered`);
            continue;
          }

          // Calculate time until meeting
          const timeUntilMeeting = meeting.startAt.getTime() - now.getTime();
          const minutesUntil = Math.round(timeUntilMeeting / (1000 * 60));

          // Get lead name
          const leadName = lead?.details?.name || lead?.details?.firstName || "Unknown";

          // Create notification payload
          const notificationTitle = "📅 Meeting Reminder";
          const notificationBody = `Your meeting "${meeting.title}" with ${leadName} starts in ${minutesUntil} minutes`;

          const notification = {
            title: notificationTitle,
            body: notificationBody,
            data: {
              type: "meeting_reminder",
              meetingId: meeting._id.toString(),
              leadId: lead?._id?.toString() || "",
              leadName,
              meetingTitle: meeting.title,
              startAt: meeting.startAt.toISOString(),
              meetingMode: meeting.meetingMode,
              location: meeting.location || "",
              minutesUntil: minutesUntil.toString(),
            },
          };

          // Send notification to all user's devices
          const result = await sendNotificationToMultipleDevices(user.fcmTokens, notification);

          if (result.successCount > 0) {
            // Mark reminder as sent
            meeting.reminderSent = true;
            await meeting.save();

            console.log(
              `✅ Sent meeting reminder to ${user.firstName} ${user.lastName} (${result.successCount}/${user.fcmTokens.length} devices)`
            );
          } else {
            console.error(
              `❌ Failed to send reminder for meeting ${meeting._id} to user ${user._id}`
            );
          }
        } catch (error: any) {
          console.error(`❌ Error processing meeting ${meeting._id}:`, error.message);
        }
      }

      console.log("✅ Meeting reminder cron job completed");
    } catch (error: any) {
      console.error("❌ Meeting reminder cron job failed:", error.message);
    }
  });

  console.log("✅ Meeting reminder cron job started (runs every 15 minutes)");
};

/**
 * Alternative: On-demand reminder checker
 * Can be called manually or triggered by other events
 */
export const checkAndSendMeetingReminders = async () => {
  try {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

    const upcomingMeetings = await MeetingModel.find({
      startAt: {
        $gte: now,
        $lte: reminderTime,
      },
      meetingStatus: "scheduled",
      notifyAttendees: true,
      reminderSent: false,
      isDeleted: false,
    })
      .populate("userId", "firstName lastName fcmTokens")
      .populate("leadId", "details");

    const results = {
      total: upcomingMeetings.length,
      sent: 0,
      failed: 0,
    };

    for (const meeting of upcomingMeetings) {
      const user = meeting.userId as any;
      const lead = meeting.leadId as any;

      if (!user?.fcmTokens || user.fcmTokens.length === 0) {
        results.failed++;
        continue;
      }

      const timeUntilMeeting = meeting.startAt.getTime() - now.getTime();
      const minutesUntil = Math.round(timeUntilMeeting / (1000 * 60));
      const leadName = lead?.details?.name || lead?.details?.firstName || "Unknown";

      const notification = {
        title: "📅 Meeting Reminder",
        body: `Your meeting "${meeting.title}" with ${leadName} starts in ${minutesUntil} minutes`,
        data: {
          type: "meeting_reminder",
          meetingId: meeting._id.toString(),
          leadId: lead?._id?.toString() || "",
          leadName,
          meetingTitle: meeting.title,
          startAt: meeting.startAt.toISOString(),
          meetingMode: meeting.meetingMode,
          location: meeting.location || "",
          minutesUntil: minutesUntil.toString(),
        },
      };

      const result = await sendNotificationToMultipleDevices(user.fcmTokens, notification);

      if (result.successCount > 0) {
        meeting.reminderSent = true;
        await meeting.save();
        results.sent++;
      } else {
        results.failed++;
      }
    }

    return results;
  } catch (error: any) {
    console.error("❌ Check meeting reminders failed:", error.message);
    throw error;
  }
};

export default startMeetingReminderCron;
