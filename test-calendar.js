const { google } = require("googleapis");
require("dotenv").config();

async function testPersonalCalendar() {
  try {
    console.log("🔄 Testing personal Google Calendar connection...");

    // Set up auth
    const auth = new google.auth.OAuth2(
      process.env.PERSONAL_GOOGLE_CLIENT_ID,
      process.env.PERSONAL_GOOGLE_CLIENT_SECRET
    );

    auth.setCredentials({
      refresh_token: process.env.PERSONAL_GOOGLE_REFRESH_TOKEN,
    });

    // Test calendar access
    const calendar = google.calendar({ version: "v3", auth });
    const calendars = await calendar.calendarList.list();

    console.log("✅ Personal Google Calendar connection successful!");
    console.log(`📅 Found ${calendars.data.items.length} calendars`);

    // Show the specific calendars we care about
    const prsCal = calendars.data.items.find(
      (cal) => cal.id === process.env.PRS_PERSONAL_CALENDAR_ID
    );
    const fitnessCal = calendars.data.items.find(
      (cal) => cal.id === process.env.FITNESS_CALENDAR_ID
    );
    const normalWakeCal = calendars.data.items.find(
      (cal) => cal.id === process.env.NORMAL_WAKE_UP_CALENDAR_ID
    );
    const sleepInCal = calendars.data.items.find(
      (cal) => cal.id === process.env.SLEEP_IN_CALENDAR_ID
    );

    console.log("\n📋 Target calendars:");
    if (prsCal) console.log(`💻 PRs Personal: ${prsCal.summary}`);
    if (fitnessCal) console.log(`💪 Fitness: ${fitnessCal.summary}`);
    if (normalWakeCal) console.log(`☀️ Normal Wake: ${normalWakeCal.summary}`);
    if (sleepInCal) console.log(`🛌 Sleep In: ${sleepInCal.summary}`);

    return true;
  } catch (error) {
    console.error("❌ Calendar connection failed:", error.message);
    return false;
  }
}

testPersonalCalendar();
