const { Client } = require("@notionhq/client");
require("dotenv").config();

async function testSleepQuery() {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const sleepDbId = process.env.NOTION_SLEEP_DATABASE_ID;

  // Week 3: Jan 12-18, 2025
  const startDate = "2025-01-12";
  const endDate = "2025-01-18";

  console.log(
    `\n📊 Querying sleep records for Night of Date: ${startDate} to ${endDate}\n`
  );

  try {
    const response = await notion.databases.query({
      database_id: sleepDbId,
      filter: {
        and: [
          {
            property: "Night of Date",
            date: { on_or_after: startDate },
          },
          {
            property: "Night of Date",
            date: { on_or_before: endDate },
          },
        ],
      },
      sorts: [{ property: "Night of Date", direction: "ascending" }],
    });

    console.log(`Found ${response.results.length} records:\n`);

    response.results.forEach((page, index) => {
      const props = page.properties;
      const nightOfDate = props["Night of Date"]?.date?.start;
      const nightOf = props["Night of"]?.title?.[0]?.plain_text || "Unknown";

      console.log(`${index + 1}. ${nightOf} (${nightOfDate})`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testSleepQuery();
