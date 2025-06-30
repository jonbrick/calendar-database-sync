const NotionClient = require("./lib/notion-client.js");
const CalendarClient = require("./lib/calendar-client.js");
const {
  testConnections,
  getDateSelection,
  calculateSearchRange,
  calculateWeekSearchRange,
  closeReadline,
  askQuestion,
} = require("./lib/cli-utils.js");

// Create clients
const notion = new NotionClient();
const calendar = new CalendarClient();

async function main() {
  console.log("📅 GitHub Calendar Event Creator 2025\n");

  // Test connections
  await testConnections({ notion, calendar });

  console.log("📅 Which calendar(s) to update?");
  console.log("  1. Both calendars");
  console.log("  2. Work calendar only");
  console.log("  3. Personal calendar only");

  const calendarInput = await askQuestion("? Choose option (1, 2, or 3): ");

  if (calendarInput < 1 || calendarInput > 3) {
    console.log("❌ Invalid option. Please choose 1, 2, or 3.");
    process.exit(1);
  }

  // Get date selection using DRY code
  const { weekStart, weekEnd, dateRangeLabel, selectedDate, optionInput } =
    await getDateSelection();

  if (optionInput === "1") {
    console.log(
      `\n📊 Creating calendar events for Date ${selectedDate.toDateString()} (Eastern)`
    );
    console.log(`📅 Eastern Date: ${selectedDate.toDateString()}`);
    console.log(
      `📱 Calendar Date (UTC): ${selectedDate.toDateString()} (${
        selectedDate.toISOString().split("T")[0]
      })\n`
    );

    console.log("📋 Summary:");
    console.log("📊 Single day operation");
    console.log(`📅 Eastern Date: ${selectedDate.toDateString()}`);
    console.log(
      `📱 Calendar Date (UTC): ${selectedDate.toDateString()} (${
        selectedDate.toISOString().split("T")[0]
      })\n`
    );

    const searchRange = calculateSearchRange(selectedDate);
    console.log("🔍 Search Details:");
    console.log(`   EST date requested: ${selectedDate.toDateString()}`);
    console.log(
      `   EST day boundaries: ${searchRange.estStartOfDay.toLocaleString(
        "en-US",
        { timeZone: "America/New_York" }
      )} to ${searchRange.estEndOfDay.toLocaleString("en-US", {
        timeZone: "America/New_York",
      })}`
    );
    console.log(
      `   UTC search range: ${searchRange.startUTC.toISOString()} to ${searchRange.endUTC.toISOString()}\n`
    );

    const proceed = await askQuestion(
      "? Proceed with creating calendar events for this period? (y/n): "
    );
    if (proceed.toLowerCase() !== "y") {
      console.log("❌ Operation cancelled");
      process.exit(0);
    }

    console.log(
      `🔄 Fetching Notion dates ${
        selectedDate.toISOString().split("T")[0]
      } to ${
        selectedDate.toISOString().split("T")[0]
      } for Date ${selectedDate.toDateString()} - ${selectedDate.toDateString()}`
    );
  } else {
    console.log(`\n📊 Creating calendar events for ${dateRangeLabel}`);
    console.log(
      `📅 Date range: ${weekStart.toDateString()} - ${weekEnd.toDateString()}\n`
    );
  }

  // Get GitHub activities from Notion
  const githubActivities = await notion.getWorkoutsForWeek(weekStart, weekEnd);

  if (githubActivities.length === 0) {
    console.log(
      "📭 No GitHub activities found without calendar events for this period"
    );
    console.log("💡 Try running collect-github.js first to gather GitHub data");
    return;
  }

  if (optionInput === "1") {
    console.log(
      `🔄 Fetching GitHub activities from ${
        selectedDate.toISOString().split("T")[0]
      } to ${selectedDate.toISOString().split("T")[0]}`
    );
  }

  // Filter activities based on calendar choice
  let filteredActivities = githubActivities;
  if (calendarInput === "2") {
    filteredActivities = githubActivities.filter(
      (activity) => activity.projectType === "Work"
    );
    console.log(
      `🔍 Filtered to work activities only: ${filteredActivities.length} activities`
    );
  } else if (calendarInput === "3") {
    filteredActivities = githubActivities.filter(
      (activity) => activity.projectType === "Personal"
    );
    console.log(
      `🔍 Filtered to personal activities only: ${filteredActivities.length} activities`
    );
  }

  console.log(`🗓️ Found ${filteredActivities.length} GitHub activities\n`);

  console.log("🗓️ Processing GitHub activities:");
  filteredActivities.forEach((activity, index) => {
    const projectType = activity.projectType || "Personal"; // Default to Personal if not set
    if (optionInput === "1") {
      console.log(
        `  ${index + 1}. ${
          activity.repository
        } (${projectType}) - Date ${selectedDate.toDateString()}`
      );
    } else {
      console.log(
        `  ${index + 1}. ${activity.repository} (${projectType}) - ${
          activity.date
        }`
      );
    }
  });

  const finalConfirm = await askQuestion(
    "\n? Proceed with creating these calendar events? (y/n): "
  );

  if (finalConfirm.toLowerCase() !== "y") {
    console.log("❌ Operation cancelled");
    return;
  }

  closeReadline();

  console.log("\n🗓️ Creating calendar events:");
  let createdCount = 0;
  let workCount = 0;
  let personalCount = 0;

  for (const activity of filteredActivities) {
    try {
      // Transform activity to match expected format for calendar
      const calendarActivity = {
        repository: activity.repository,
        date: activity.date,
        commitsCount: activity.commitsCount,
        commitMessages: activity.commitMessages,
        prTitles: activity.prTitles || "",
        totalLinesAdded: activity.totalLinesAdded,
        totalLinesDeleted: activity.totalLinesDeleted,
        totalChanges: activity.totalLinesAdded + activity.totalLinesDeleted,
        projectType: activity.projectType || "Personal",
      };

      await calendar.createGitHubEvent(calendarActivity);
      await notion.markCalendarCreated(activity.id);
      createdCount++;

      // Count by type
      if (calendarActivity.projectType === "Work") {
        workCount++;
      } else {
        personalCount++;
      }

      if (optionInput === "1") {
        console.log(
          `✅ Processing Date ${selectedDate.toDateString()} from Notion Date ${
            activity.date
          }`
        );
        console.log(
          `✅ Created calendar event for Date: ${selectedDate.toDateString()} (Notion Date: ${
            activity.date
          })`
        );
        console.log(
          `✅ Created ${selectedDate.toDateString()}: ${
            activity.repository
          } | ${activity.commitsCount} commits | ${
            calendarActivity.totalChanges
          } changes`
        );
      } else {
        console.log(
          `✅ Created: ${activity.repository} (${calendarActivity.projectType})`
        );
      }
    } catch (error) {
      console.error(
        `❌ Failed to create calendar event for ${activity.repository}:`,
        error.message
      );
    }
  }

  console.log(`\n✅ Successfully created ${createdCount} calendar events!`);
  if (workCount > 0) {
    console.log(`🏢 Work calendar: ${workCount} events`);
  }
  if (personalCount > 0) {
    console.log(`🏠 Personal calendar: ${personalCount} events`);
  }
  console.log("🎯 Check your calendars to see the GitHub activities!");
}

main().catch(console.error);
