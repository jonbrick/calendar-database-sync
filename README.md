# GitHub Activity Sync

Automatically sync your GitHub development activities to Google Calendar with comprehensive data stored in Notion. Transform your coding work into visual calendar events with rich commit details, PR information, and project classification.

## What This Does

**Complete Development Pipeline:** Fetch GitHub commits → Store detailed data in Notion → Create rich calendar events on Google Calendar

**Smart Project Classification:** Automatically categorizes work vs personal repositories and routes to appropriate calendars

**Flexible Date Selection:** Choose between week-based processing or single date selection for precise activity collection

**PR Integration:** Captures pull request information and expands squashed commits into individual commit details

**Dual Calendar Support:** Routes work activities to work calendar, personal activities to personal calendar

## How It Works

### Two-Script System

1. **`collect-github.js`:** GitHub API → Notion database storage
2. **`update-github-cal.js`:** Notion data → Google Calendar events

### Data Flow

```
GitHub Commits → Weekly/Single Date Collection → Notion Database → Calendar Creation → Google Calendar
```

### Example Output

**Notion Database Record:**

```
Repository: cortexapps/brain-app
Date: June 26, 2025
Project Type: Work
Commits Count: 9
Commit Messages: Get demo working - need to update colors (10:15), Update symbol-neutral-muted... (10:20)
PR Titles: [DSGN-381] Create a11y-brand-subtle and apply to Switch (#10158)
Files Changed: 12
Lines Added: 150
Lines Deleted: 25
Total Changes: 175
Calendar Created: ✓
```

**Google Calendar Event:**

```
Title: brain-app: 9 commits (+150/-25 lines)
Time: June 26, 2025 (All Day)
Calendar: Work Calendar
Description:
💻 cortexapps/brain-app
📊 9 commits
📈 +150/-25 lines
🔀 PR: [DSGN-381] Create a11y-brand-subtle and apply to Switch (#10158)

📝 Commits:
Get demo working - need to update colors (10:15), Update symbol-neutral-muted... (10:20)
```

## Prerequisites

- Node.js 18+ installed
- GitHub account with commit activity
- Notion account and workspace
- Google account with Calendar access
- GitHub Personal Access Token

## Setup

### 1. GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Create new token:
   - **Note:** "GitHub Activity Tracker"
   - **Expiration:** No expiration (or set as needed)
   - **Scopes:** `repo` (for private repos), `read:user`
3. Copy the generated token

### 2. Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Create integration: "GitHub Activity Tracker"
3. Copy integration token
4. Create database with this schema:

| Property Name    | Type     | Options        |
| ---------------- | -------- | -------------- |
| Repository       | Title    | -              |
| Date             | Date     | -              |
| Project Type     | Select   | Work, Personal |
| Commits Count    | Number   | -              |
| Commit Messages  | Text     | -              |
| PR Titles        | Text     | -              |
| Files Changed    | Number   | -              |
| Lines Added      | Number   | -              |
| Lines Deleted    | Number   | -              |
| Total Changes    | Number   | -              |
| Calendar Created | Checkbox | Default: false |

5. Share database with your integration

### 3. Google Calendar API

1. Go to Google Cloud Console
2. Create project: "GitHub Activity Sync"
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials (Desktop application)
5. Use the OAuth helper script to get refresh token
6. Create dedicated work and personal calendars

### 4. Installation

```bash
# Clone/create project
mkdir github-sync
cd github-sync

# Install dependencies
npm install @notionhq/client googleapis node-fetch@2.7.0 dotenv

# Copy environment template
cp .env.example .env
```

### 5. Environment Configuration

Create `.env` file with your credentials:

```env
# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_USERNAME=your_github_username

# Notion Configuration
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id

# Google Calendar Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
WORK_CALENDAR_ID=your_work_calendar_id
PERSONAL_CALENDAR_ID=your_personal_calendar_id
```

## Usage

### Collect GitHub Activity Data

```bash
node collect-github.js
```

**Interactive Process:**

1. Tests GitHub and Notion connections
2. **Choose selection method:**
   - **Option 1:** Enter a specific Date (DD-MM-YY format)
   - **Option 2:** Select by week number (1-52 for 2025)
3. **For single date:** Enter date like "26-06-25" for June 26, 2025
4. **For week selection:** Shows available weeks, select week number (e.g., "25" for June 15-21)
5. Fetches all GitHub commits for selected period
6. Expands squashed PR commits into individual commits
7. Stores comprehensive data in Notion database

### Create Calendar Events

```bash
node update-github-cal.js
```

**Interactive Process:**

1. Tests Notion and Google Calendar connections
2. **Choose selection method:**
   - **Option 1:** Enter a specific Date (DD-MM-YY format)
   - **Option 2:** Select by week number (1-52 for 2025)
3. **For single date:** Enter date like "26-06-25" for June 26, 2025
4. **For week selection:** Shows available weeks, select week number
5. Reads GitHub activities from Notion (not yet calendared)
6. Creates detailed calendar events
7. Routes to appropriate calendar (Work/Personal)
8. Marks activities as "Calendar Created" in Notion

### Typical Workflow

```bash
# Option 1: Week-based workflow
node collect-github.js
# Choose option 2, enter: 25

node update-github-cal.js
# Choose option 2, enter: 25

# Option 2: Single date workflow
node collect-github.js
# Choose option 1, enter: 26-06-25

node update-github-cal.js
# Choose option 1, enter: 26-06-25
```

## Project Structure

```
github-sync/
├── README.md
├── package.json
├── .env.example
├── .gitignore
├── collect-github.js          # Script 1: Data collection (week or single date)
├── update-github-cal.js       # Script 2: Calendar creation (week or single date)
└── lib/
    ├── github-client.js       # GitHub API interface
    ├── notion-client.js       # Notion database operations
    ├── calendar-client.js     # Google Calendar operations
    └── week-utils.js          # Week calculation utilities
```

## Dependencies

**Core Dependencies:**

- `@notionhq/client` - Notion API integration
- `googleapis` - Google Calendar API
- `node-fetch@2.7.0` - HTTP requests for GitHub API
- `dotenv` - Environment variable management

**Key Features:**

- Automatic commit search and PR detection
- Squashed commit expansion for work repositories
- Timezone conversion (UTC to Eastern Time)
- Interactive command-line interface
- Comprehensive error handling

## Week Numbering System

- **Week 1:** December 29, 2024 - January 4, 2025 (includes Jan 1)
- **Week 2:** January 5 - January 11, 2025
- **Week 25:** June 15 - June 21, 2025
- **Week 52:** December 21 - December 27, 2025

Weeks run Sunday through Saturday with Week 1 starting on the Sunday before January 1st.

## Advanced Features

### Smart Project Classification

- **Work Repositories:** Automatically detected as `cortexapps/*` repositories
- **Personal Repositories:** All other repositories classified as personal
- **Calendar Routing:** Work activities → Work calendar, Personal activities → Personal calendar

### PR Integration

- **PR Detection:** Automatically finds pull requests associated with commits
- **Squashed Commit Expansion:** Expands work repository squashed commits into individual commits
- **PR Information:** Captures PR titles, numbers, and states
- **Rich Descriptions:** Includes PR context in calendar event descriptions

### Enhanced Data Collection

- **Commit Search:** Uses GitHub's commit search API for comprehensive coverage
- **Work Repository Scanning:** Additional scanning of work repositories for missed commits
- **Deduplication:** Prevents duplicate commits across different collection methods
- **Timezone Handling:** Automatic UTC to Eastern Time conversion

## Testing

### Test Individual Components

```bash
# Test GitHub connection
node -e "const GitHubClient = require('./lib/github-client.js'); const client = new GitHubClient(); client.testConnection();"

# Test Notion connection
node -e "const NotionClient = require('./lib/notion-client.js'); const client = new NotionClient(); client.testConnection();"

# Test Google Calendar connection
node -e "const CalendarClient = require('./lib/calendar-client.js'); const client = new CalendarClient(); client.testConnection();"

# Test week calculations
node -e "const { getWeekBoundaries } = require('./lib/week-utils.js'); console.log('Week 25:', getWeekBoundaries(2025, 25));"
```

## Troubleshooting

### Common Issues

**GitHub Token Issues:**

- Verify personal access token has correct scopes
- Check token expiration
- Ensure username matches your GitHub account

**GitHub API Missing Commits:**

- Some commits may not appear in search API
- Work repository scanning provides additional coverage
- Check if commits are in private repositories

**Notion Database Access:**

- Verify integration is shared with database
- Check database ID in environment variables
- Ensure property names match exactly

**Google Calendar Permission:**

- Verify work and personal calendar IDs are correct
- Check OAuth scopes include calendar write access
- Ensure calendars exist and are writable

**Project Type Classification:**

- Work repositories must start with `cortexapps/`
- Personal repositories are all others
- Check repository naming conventions

**Calendar Routing Issues:**

- Verify `WORK_CALENDAR_ID` and `PERSONAL_CALENDAR_ID` are set
- Check calendar IDs are valid and accessible
- Ensure project type is being read correctly from Notion

### Data Recovery

- **Missing commits:** Re-run collect-github.js for affected weeks/dates
- **API sync issues:** Work repository scanning provides backup coverage
- **Duplicate calendar events:** Script checks for existing events
- **Wrong week data:** Verify week number calculation
- **Timezone issues:** Automatic UTC to Eastern Time conversion

## Maintenance

### Weekly Tasks

- Run data collection for previous week or specific dates
- Create calendar events for collected data
- Verify events appear correctly on appropriate calendars
- Check for any missing commits

### Token Management

- **GitHub tokens:** Personal access tokens with appropriate scopes
- **Google tokens:** Long-lived refresh tokens
- **Notion tokens:** No expiration

### Database Management

- **Lock Notion database** to prevent structure changes
- **Export data** monthly for backup
- **Monitor rate limits** for all APIs

## Rate Limits & Performance

### API Limits

- **GitHub:** 5000 requests/hour for authenticated requests
- **Notion:** 3 requests/second
- **Google Calendar:** 1000 requests/100 seconds

### Optimization

- **Batch processing:** Process full weeks at once
- **Incremental updates:** Only process new activities
- **Efficient filtering:** Use date ranges and status flags

## Privacy & Data

### Data Storage

- **GitHub activity data:** Stored in personal Notion workspace
- **API tokens:** Stored locally in .env (never committed)
- **Calendar events:** Created in personal Google Calendars

### Data Control

- **Full ownership:** All data remains in your accounts
- **Export capability:** Notion data can be exported anytime
- **Revocable access:** API permissions can be revoked anytime

## Contributing

This is a personal tracking system, but improvements welcome:

- Enhanced error handling and recovery
- Additional GitHub metrics integration
- Better timezone handling for travel
- Automated token refresh workflows

## License

MIT License - Use this code for your own personal development tracking needs.

---

**Built with:** GitHub API, Notion API, Google Calendar API, Node.js  
**Time saved:** Automated development activity calendar creation! 🎉
