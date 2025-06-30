const { Client } = require("@notionhq/client");
const { google } = require("googleapis");
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

    this.personalCalendar = google.calendar({
      version: "v3",
      auth: this.personalAuth,
    });

    this.prsPersonalCalendarId = process.env.PRS_PERSONAL_CALENDAR_ID;
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
}

async function syncGitHubPersonal() {
  console.log("💻 GitHub Personal Sync\n");

  const notion = new NotionClient();
  const calendar = new CalendarClient();

  // Test connections
  const notionOk = await notion.testConnection();
  const calendarOk = await calendar.testConnection();

  if (!notionOk || !calendarOk) {
    console.log("❌ Connection failed. Check your .env file.");
    return;
  }

  // For now, let's get activities from last 7 days
  const weekEnd = new Date();
  const weekStart = new Date();
  weekStart.setDate(weekEnd.getDate() - 7);

  console.log(
    `\n📊 Syncing GitHub activities from ${weekStart.toDateString()} to ${weekEnd.toDateString()}`
  );

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

// Main execution
async function main() {
  console.log("🔄 Calendar Sync App\n");

  console.log("Available syncs:");
  console.log("1. GitHub Personal (only option for now)");

  // For now, just run GitHub personal
  await syncGitHubPersonal();
}

main().catch(console.error);
