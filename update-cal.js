const { Client } = require("@notionhq/client");
const { google } = require("googleapis");
const {
  testConnections,
  getDateSelection,
  closeReadline,
  askQuestion,
} = require("./lib/cli-utils.js");
require("dotenv").config();

class NotionClient {
  constructor() {
    this.notion = new Client({ auth: process.env.NOTION_TOKEN });
    this.prsDbId = process.env.NOTION_PRS_DATABASE_ID;
    this.workoutsDbId = process.env.NOTION_WORKOUTS_DATABASE_ID;
    this.sleepDbId = process.env.NOTION_SLEEP_DATABASE_ID;
  }

  async testConnection() {
    try {
      const response = await this.notion.databases.retrieve({
        database_id: this.prsDbId,
      });
      console.log("✅ Notion connection successful!");
      return true;
    } catch (error) {
      console.error("❌ Notion connection failed:", error.message);
      return false;
    }
  }

  async getGitHubActivitiesForWeek(weekStart, weekEnd) {
    try {
      const startDateStr = weekStart.toISOString().split("T")[0];
      const endDateStr = weekEnd.toISOString().split("T")[0];

      console.log(
        `🔄 Reading GitHub activities from ${startDateStr} to ${endDateStr}`
      );

      const response = await this.notion.databases.query({
        database_id: this.prsDbId,
        filter: {
          and: [
            {
              property: "Date",
              date: { on_or_after: startDateStr },
            },
            {
              property: "Date",
              date: { on_or_before: endDateStr },
            },
            {
              property: "Calendar Created",
              checkbox: { equals: false },
            },
          ],
        },
        sorts: [{ property: "Date", direction: "ascending" }],
      });

      console.log(
        `📊 Found ${response.results.length} GitHub activities without calendar events`
      );
      return this.transformNotionToActivities(response.results);
    } catch (error) {
      console.error("❌ Error reading GitHub activities:", error.message);
      return [];
    }
  }

  transformNotionToActivities(notionPages) {
    return notionPages.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        repository:
          props["Repository"]?.title?.[0]?.plain_text || "Unknown Repository",
        date: props["Date"]?.date?.start,
        commitsCount: props["Commits Count"]?.number || 0,
        projectType: props["Project Type"]?.select?.name || "Personal",
        commitMessages:
          props["Commit Messages"]?.rich_text?.[0]?.plain_text || "",
        prTitles: props["PR Titles"]?.rich_text?.[0]?.plain_text || "",
        totalLinesAdded: props["Lines Added"]?.number || 0,
        totalLinesDeleted: props["Lines Deleted"]?.number || 0,
        totalChanges:
          (props["Lines Added"]?.number || 0) +
          (props["Lines Deleted"]?.number || 0),
      };
    });
  }

  async markCalendarCreated(activityId) {
    try {
      await this.notion.pages.update({
        page_id: activityId,
        properties: {
          "Calendar Created": { checkbox: true },
        },
      });
    } catch (error) {
      console.error("❌ Error marking calendar created:", error.message);
    }
  }

  async getWorkoutsForWeek(weekStart, weekEnd) {
    try {
      const startDateStr = weekStart.toISOString().split("T")[0];
      const endDateStr = weekEnd.toISOString().split("T")[0];

      console.log(`🔄 Reading workouts from ${startDateStr} to ${endDateStr}`);

      const response = await this.notion.databases.query({
        database_id: this.workoutsDbId,
        filter: {
          and: [
            {
              property: "Date",
              date: { on_or_after: startDateStr },
            },
            {
              property: "Date",
              date: { on_or_before: endDateStr },
            },
            {
              property: "Calendar Created",
              checkbox: { equals: false },
            },
          ],
        },
        sorts: [{ property: "Date", direction: "ascending" }],
      });

      console.log(
        `📊 Found ${response.results.length} workouts without calendar events`
      );
      return this.transformNotionToWorkouts(response.results);
    } catch (error) {
      console.error("❌ Error reading workouts:", error.message);
      return [];
    }
  }

  transformNotionToWorkouts(notionPages) {
    return notionPages.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        activityName:
          props["Activity Name"]?.title?.[0]?.plain_text || "Workout",
        date: props["Date"]?.date?.start,
        activityType: props["Activity Type"]?.select?.name || "Workout",
        startTime: props["Start Time"]?.rich_text?.[0]?.plain_text || "",
        duration: props["Duration"]?.number || 0,
        distance: props["Distance"]?.number || 0,
      };
    });
  }

  async markWorkoutCalendarCreated(workoutId) {
    try {
      await this.notion.pages.update({
        page_id: workoutId,
        properties: {
          "Calendar Created": { checkbox: true },
        },
      });
    } catch (error) {
      console.error(
        "❌ Error marking workout calendar created:",
        error.message
      );
    }
  }

  async getSleepForWeek(weekStart, weekEnd) {
    try {
      const startDateStr = weekStart.toISOString().split("T")[0];
      const endDateStr = weekEnd.toISOString().split("T")[0];

      console.log(
        `🔄 Reading sleep records from ${startDateStr} to ${endDateStr}`
      );

      const response = await this.notion.databases.query({
        database_id: this.sleepDbId,
        filter: {
          and: [
            {
              property: "Night of Date",
              date: { on_or_after: startDateStr },
            },
            {
              property: "Night of Date",
              date: { on_or_before: endDateStr },
            },
            {
              property: "Calendar Created",
              checkbox: { equals: false },
            },
          ],
        },
        sorts: [{ property: "Night of Date", direction: "ascending" }],
      });

      console.log(
        `📊 Found ${response.results.length} sleep sessions without calendar events`
      );
      return this.transformNotionToSleep(response.results);
    } catch (error) {
      console.error("❌ Error reading sleep records:", error.message);
      return [];
    }
  }

  transformNotionToSleep(notionPages) {
    return notionPages.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        nightOf: props["Night of"]?.title?.[0]?.plain_text,
        nightOfDate: props["Night of Date"]?.date?.start,
        bedtime: props["Bedtime"]?.rich_text?.[0]?.plain_text,
        wakeTime: props["Wake Time"]?.rich_text?.[0]?.plain_text,
        sleepDuration: props["Sleep Duration"]?.number || 0,
        deepSleep: props["Deep Sleep"]?.number || 0,
        remSleep: props["REM Sleep"]?.number || 0,
        lightSleep: props["Light Sleep"]?.number || 0,
        efficiency: props["Efficiency"]?.number || 0,
        googleCalendar: props["Google Calendar"]?.select?.name || "Sleep In",
      };
    });
  }

  async markSleepCalendarCreated(sleepId) {
    try {
      await this.notion.pages.update({
        page_id: sleepId,
        properties: {
          "Calendar Created": { checkbox: true },
        },
      });
    } catch (error) {
      console.error("❌ Error marking sleep calendar created:", error.message);
    }
  }
}

class CalendarClient {
  constructor() {
    this.personalAuth = new google.auth.OAuth2(
      process.env.PERSONAL_GOOGLE_CLIENT_ID,
      process.env.PERSONAL_GOOGLE_CLIENT_SECRET
    );
    this.personalAuth.setCredentials({
      refresh_token: process.env.PERSONAL_GOOGLE_REFRESH_TOKEN,
    });

    // Work account auth
    this.workAuth = new google.auth.OAuth2(
      process.env.WORK_GOOGLE_CLIENT_ID,
      process.env.WORK_GOOGLE_CLIENT_SECRET
    );
    this.workAuth.setCredentials({
      refresh_token: process.env.WORK_GOOGLE_REFRESH_TOKEN,
    });

    this.personalCalendar = google.calendar({
      version: "v3",
      auth: this.personalAuth,
    });
    this.workCalendar = google.calendar({
      version: "v3",
      auth: this.workAuth,
    });

    this.prsPersonalCalendarId = process.env.PRS_PERSONAL_CALENDAR_ID;
    this.prsWorkCalendarId = process.env.PRS_WORK_CALENDAR_ID;
    this.fitnessCalendarId = process.env.FITNESS_CALENDAR_ID;
    this.normalWakeUpCalendarId = process.env.NORMAL_WAKE_UP_CALENDAR_ID;
    this.sleepInCalendarId = process.env.SLEEP_IN_CALENDAR_ID;
  }

  async testConnection() {
    try {
      const calendars = await this.personalCalendar.calendarList.list();
      console.log("✅ Google Calendar connection successful!");
      console.log(`📅 Found ${calendars.data.items.length} calendars`);
      return true;
    } catch (error) {
      console.error("❌ Calendar connection failed:", error.message);
      return false;
    }
  }

  async createGitHubEvent(activity) {
    try {
      // Use personal PRs calendar for personal repos
      const calendarId = this.prsPersonalCalendarId;

      // Create all-day event
      const eventDate = activity.date; // YYYY-MM-DD format
      const title = this.formatGitHubEventTitle(activity);
      const description = this.formatGitHubEventDescription(activity);

      const event = {
        summary: title,
        description: description,
        start: { date: eventDate },
        end: { date: eventDate },
      };

      const response = await this.personalCalendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });

      console.log(`✅ Created Personal GitHub calendar event: ${title}`);
      return response;
    } catch (error) {
      console.error("❌ Error creating GitHub calendar event:", error.message);
      throw error;
    }
  }

  async createWorkGitHubEvent(activity) {
    try {
      // Use work PRs calendar for work repos
      const calendarId = this.prsWorkCalendarId;

      // Create all-day event
      const eventDate = activity.date; // YYYY-MM-DD format
      const title = this.formatGitHubEventTitle(activity);
      const description = this.formatGitHubEventDescription(activity);

      const event = {
        summary: title,
        description: description,
        start: { date: eventDate },
        end: { date: eventDate },
      };

      const response = await this.workCalendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });

      console.log(`✅ Created Work GitHub calendar event: ${title}`);
      return response;
    } catch (error) {
      console.error(
        "❌ Error creating Work GitHub calendar event:",
        error.message
      );
      throw error;
    }
  }

  formatGitHubEventTitle(activity) {
    const repoName = activity.repository.split("/")[1] || activity.repository;
    const linesInfo =
      activity.totalChanges > 0
        ? ` (+${activity.totalLinesAdded}/-${activity.totalLinesDeleted} lines)`
        : "";
    return `${repoName}: ${activity.commitsCount} commits${linesInfo}`;
  }

  formatGitHubEventDescription(activity) {
    let description = `💻 ${activity.repository}\n`;
    description += `📊 ${activity.commitsCount} commits\n`;
    if (activity.totalChanges > 0) {
      description += `📈 +${activity.totalLinesAdded}/-${activity.totalLinesDeleted} lines\n`;
    }

    if (activity.prTitles && activity.prTitles.trim()) {
      description += `🔀 PR: ${activity.prTitles}\n`;
    } else {
      description += `🔀 PR: None\n`;
    }

    description += `\n📝 Commits:\n${activity.commitMessages}`;
    return description;
  }

  async createWorkoutEvent(workout) {
    try {
      // Parse the start time - handle both ISO strings and basic formats
      let startTime;
      if (workout.startTime && workout.startTime.includes("T")) {
        startTime = new Date(workout.startTime);
      } else {
        // Default to noon on the workout date
        startTime = new Date(workout.date + "T12:00:00");
      }

      const endTime = new Date(
        startTime.getTime() + (workout.duration || 30) * 60 * 1000
      );

      const title = this.formatWorkoutEventTitle(workout);
      const description = this.formatWorkoutEventDescription(workout);

      const event = {
        summary: title,
        description: description,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
      };

      const response = await this.personalCalendar.events.insert({
        calendarId: this.fitnessCalendarId,
        resource: event,
      });

      console.log(`✅ Created workout calendar event: ${title}`);
      return response;
    } catch (error) {
      console.error("❌ Error creating workout calendar event:", error.message);
      throw error;
    }
  }

  formatWorkoutEventTitle(workout) {
    if (workout.distance > 0) {
      return `${workout.activityType} - ${workout.distance} miles`;
    } else {
      return workout.activityName;
    }
  }

  formatWorkoutEventDescription(workout) {
    let description = `🏃‍♂️ ${workout.activityName}\n`;
    description += `⏱️ Duration: ${workout.duration} minutes\n`;

    if (workout.distance > 0) {
      description += `📏 Distance: ${workout.distance} miles\n`;
    }

    description += `📊 Activity Type: ${workout.activityType}`;
    return description;
  }

  async createSleepEvent(sleepRecord) {
    try {
      // Parse bedtime and wake time
      const bedtime = new Date(sleepRecord.bedtime);
      const wakeTime = new Date(sleepRecord.wakeTime);

      const title = this.formatSleepEventTitle(sleepRecord);
      const description = this.formatSleepEventDescription(sleepRecord);

      // Choose calendar based on wake time category
      const calendarId =
        sleepRecord.googleCalendar === "Normal Wake Up"
          ? this.normalWakeUpCalendarId
          : this.sleepInCalendarId;

      const event = {
        summary: title,
        description: description,
        start: { dateTime: bedtime.toISOString() },
        end: { dateTime: wakeTime.toISOString() },
      };

      const response = await this.personalCalendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });

      console.log(
        `✅ Created sleep calendar event: ${title} (${sleepRecord.googleCalendar})`
      );
      return response;
    } catch (error) {
      console.error("❌ Error creating sleep calendar event:", error.message);
      throw error;
    }
  }

  formatSleepEventTitle(sleepRecord) {
    return `Sleep - ${sleepRecord.sleepDuration}hrs (${sleepRecord.efficiency}% efficiency)`;
  }

  formatSleepEventDescription(sleepRecord) {
    let description = `😴 ${sleepRecord.nightOf}\n`;
    description += `⏱️ Duration: ${sleepRecord.sleepDuration} hours\n`;
    description += `📊 Efficiency: ${sleepRecord.efficiency}%\n\n`;

    description += `🛌 Sleep Stages:\n`;
    description += `• Deep Sleep: ${sleepRecord.deepSleep} min\n`;
    description += `• REM Sleep: ${sleepRecord.remSleep} min\n`;
    description += `• Light Sleep: ${sleepRecord.lightSleep} min\n\n`;

    return description;
  }
}

async function syncGitHubWork(weekStart, weekEnd, selectedDate, optionInput) {
  console.log("💼 GitHub Work Sync\n");

  const notion = new NotionClient();
  const calendar = new CalendarClient();

  // Test connections
  await testConnections({ notion, calendar });

  if (optionInput === "1") {
    console.log(
      `\n📊 Syncing Work GitHub activities for Date ${selectedDate.toDateString()}`
    );
  } else {
    console.log(
      `\n📊 Syncing Work GitHub activities from ${weekStart.toDateString()} to ${weekEnd.toDateString()}`
    );
  }

  const activities = await notion.getGitHubActivitiesForWeek(
    weekStart,
    weekEnd
  );

  if (activities.length === 0) {
    console.log("📭 No GitHub activities found without calendar events");
    return;
  }

  // Filter to work repos only
  const workActivities = activities.filter(
    (activity) => activity.projectType === "Work"
  );

  console.log(
    `🔍 Found ${workActivities.length} work GitHub activities to sync`
  );

  let createdCount = 0;
  for (const activity of workActivities) {
    try {
      await calendar.createWorkGitHubEvent(activity);
      await notion.markCalendarCreated(activity.id);
      createdCount++;
      console.log(
        `✅ Synced: ${activity.repository} (${activity.commitsCount} commits)`
      );
    } catch (error) {
      console.error(`❌ Failed to sync ${activity.repository}:`, error.message);
    }
  }

  console.log(
    `\n✅ Successfully synced ${createdCount} work GitHub activities!`
  );
}

async function syncGitHubPersonal(
  weekStart,
  weekEnd,
  selectedDate,
  optionInput
) {
  console.log("💻 GitHub Personal Sync\n");

  const notion = new NotionClient();
  const calendar = new CalendarClient();

  // Test connections
  await testConnections({ notion, calendar });

  if (optionInput === "1") {
    console.log(
      `\n📊 Syncing GitHub activities for Date ${selectedDate.toDateString()}`
    );
  } else {
    console.log(
      `\n📊 Syncing GitHub activities from ${weekStart.toDateString()} to ${weekEnd.toDateString()}`
    );
  }

  const activities = await notion.getGitHubActivitiesForWeek(
    weekStart,
    weekEnd
  );

  if (activities.length === 0) {
    console.log("📭 No GitHub activities found without calendar events");
    return;
  }

  // Filter to personal repos only for now
  const personalActivities = activities.filter(
    (activity) => activity.projectType === "Personal"
  );

  console.log(
    `🔍 Found ${personalActivities.length} personal GitHub activities to sync`
  );

  let createdCount = 0;
  for (const activity of personalActivities) {
    try {
      await calendar.createGitHubEvent(activity);
      await notion.markCalendarCreated(activity.id);
      createdCount++;
      console.log(
        `✅ Synced: ${activity.repository} (${activity.commitsCount} commits)`
      );
    } catch (error) {
      console.error(`❌ Failed to sync ${activity.repository}:`, error.message);
    }
  }

  console.log(`\n✅ Successfully synced ${createdCount} GitHub activities!`);
}

async function syncWorkouts(weekStart, weekEnd, selectedDate, optionInput) {
  console.log("💪 Workout Sync\n");

  const notion = new NotionClient();
  const calendar = new CalendarClient();

  // Test connections
  await testConnections({ notion, calendar });

  if (optionInput === "1") {
    console.log(
      `\n📊 Syncing workouts for Date ${selectedDate.toDateString()}`
    );
  } else {
    console.log(
      `\n📊 Syncing workouts from ${weekStart.toDateString()} to ${weekEnd.toDateString()}`
    );
  }

  const workouts = await notion.getWorkoutsForWeek(weekStart, weekEnd);

  if (workouts.length === 0) {
    console.log("📭 No workouts found without calendar events");
    return;
  }

  console.log(`🔍 Found ${workouts.length} workouts to sync`);

  let createdCount = 0;
  for (const workout of workouts) {
    try {
      await calendar.createWorkoutEvent(workout);
      await notion.markWorkoutCalendarCreated(workout.id);
      createdCount++;
      console.log(
        `✅ Synced: ${workout.activityName} (${workout.activityType})`
      );
    } catch (error) {
      console.error(
        `❌ Failed to sync ${workout.activityName}:`,
        error.message
      );
    }
  }

  console.log(`\n✅ Successfully synced ${createdCount} workouts!`);
}

async function syncSleep(weekStart, weekEnd, selectedDate, optionInput) {
  console.log("😴 Sleep Sync\n");

  const notion = new NotionClient();
  const calendar = new CalendarClient();

  // Test connections
  await testConnections({ notion, calendar });

  if (optionInput === "1") {
    console.log(`\n📊 Syncing sleep for Date ${selectedDate.toDateString()}`);
  } else {
    console.log(
      `\n📊 Syncing sleep from ${weekStart.toDateString()} to ${weekEnd.toDateString()}`
    );
  }

  const sleepRecords = await notion.getSleepForWeek(weekStart, weekEnd);

  if (sleepRecords.length === 0) {
    console.log("📭 No sleep records found without calendar events");
    return;
  }

  console.log(`🔍 Found ${sleepRecords.length} sleep records to sync`);

  let createdCount = 0;
  for (const sleepRecord of sleepRecords) {
    try {
      await calendar.createSleepEvent(sleepRecord);
      await notion.markSleepCalendarCreated(sleepRecord.id);
      createdCount++;
      console.log(
        `✅ Synced: ${sleepRecord.nightOf} (${sleepRecord.sleepDuration}hrs)`
      );
    } catch (error) {
      console.error(`❌ Failed to sync ${sleepRecord.nightOf}:`, error.message);
    }
  }

  console.log(`\n✅ Successfully synced ${createdCount} sleep records!`);
}

// Main execution
async function main() {
  console.log("🔄 Calendar Sync App\n");
  console.log("Available syncs:");
  console.log("1. GitHub Personal");
  console.log("2. GitHub Work");
  console.log("3. Workouts");
  console.log("4. Sleep");
  console.log("5. All (GitHub Personal + GitHub Work + Workouts + Sleep)");

  const choice = await askQuestion("\n? Choose sync type (1-5): ");

  // Get date selection using the unified CLI utilities
  const { weekStart, weekEnd, dateRangeLabel, selectedDate, optionInput } =
    await getDateSelection();

  // Confirmation step
  console.log("\n📋 Summary:");

  if (optionInput === "1") {
    console.log(`📊 Single day operation`);
    console.log(`📅 Date: ${selectedDate.toDateString()}`);
    console.log(
      `🗓️ Calendar Date: ${selectedDate.toDateString()} (${
        selectedDate.toISOString().split("T")[0]
      })`
    );
  } else {
    const totalDays = Math.ceil((weekEnd - weekStart) / (1000 * 60 * 60 * 24));
    console.log(`📊 Total days: ${totalDays} days`);
    console.log(
      `📅 Date range: ${weekStart.toDateString()} - ${weekEnd.toDateString()}`
    );
  }

  // Show which sync type will run
  const syncTypes = {
    1: "GitHub Personal",
    2: "GitHub Work",
    3: "Workouts",
    4: "Sleep",
    5: "All (GitHub Personal + GitHub Work + Workouts + Sleep)",
  };
  console.log(`🔄 Sync type: ${syncTypes[choice]}`);

  const confirm = await askQuestion(
    "\n? Proceed with creating calendar events for this period? (y/n): "
  );

  if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
    console.log("❌ Operation cancelled.");
    closeReadline();
    return;
  }

  closeReadline();

  if (optionInput === "1") {
    console.log(`\n📊 Processing ${dateRangeLabel}`);
  } else {
    console.log(
      `\n📊 Processing ${dateRangeLabel}: ${weekStart.toDateString()} - ${weekEnd.toDateString()}`
    );
  }

  switch (choice) {
    case "1":
      await syncGitHubPersonal(weekStart, weekEnd, selectedDate, optionInput);
      break;
    case "2":
      await syncGitHubWork(weekStart, weekEnd, selectedDate, optionInput);
      break;
    case "3":
      await syncWorkouts(weekStart, weekEnd, selectedDate, optionInput);
      break;
    case "4":
      await syncSleep(weekStart, weekEnd, selectedDate, optionInput);
      break;
    case "5":
      console.log("🔄 Running all syncs...\n");
      await syncGitHubPersonal(weekStart, weekEnd, selectedDate, optionInput);
      console.log("\n" + "=".repeat(50) + "\n");
      await syncGitHubWork(weekStart, weekEnd, selectedDate, optionInput);
      console.log("\n" + "=".repeat(50) + "\n");
      await syncWorkouts(weekStart, weekEnd, selectedDate, optionInput);
      console.log("\n" + "=".repeat(50) + "\n");
      await syncSleep(weekStart, weekEnd, selectedDate, optionInput);
      break;
    default:
      console.log("❌ Invalid choice. Please run again and choose 1-5.");
  }
}

main().catch(console.error);
