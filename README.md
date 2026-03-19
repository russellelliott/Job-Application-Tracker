# Job Application Tracker

A comprehensive desktop application built with Electron, React, and TypeScript to help you organize and track your job search process.

## Features

- **Dashboard Overview**: Get a quick snapshot of your job search progress, including submitted applications, upcoming interviews, and assessments.
- **Application Management**: Add, edit, and track the detailed status of each job application.
- **Timeline Tracking**: Record every step of the process from submission to interviews and offers.
- **Analytics**: Visualize your diverse application funnel with a Sankey diagram to understand your drop-off rates and pipeline health.
- **Schedule**: Keep track of upcoming due dates and interview times.

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App

To start the application in development mode:

```bash
npm start
```

This command will launch the Electron app along with the React renderer.

To package the application for production:

```bash
npm run package
```

## Application Screens

### 1. Dashboard
The main landing page provides high-level statistics:
- **Submitted**: Total number of applications submitted.
- **Drafts**: Applications you are preparing but haven't sent yet.
- **Today**: Applications submitted today.
- **Interviews**: Upcoming and total interview counts.
- **Assessments**: Upcoming and total assessment counts.
- **Offers**: Total offers received.

### 2. Applications Table
A detailed list of all your tracked jobs.
- **Columns**: Company, Role, Location, Source, Link, Status, Date.
- **Stagnant Highlights**: Rows turn yellow if there has been no activity for more than 14 days, prompting you to follow up.
- **Search**: Filter applications by company name or role title.

### 3. Add / Edit Application
Forms to input detailed information:
- **Company & Role Info**: Basic job details and URLs.
- **Source**: Track how you found the job (see Lead Options below).
- **Contacts**: Store recruiter or referral contact info (Name, Email, Phone, LinkedIn).
- **Timeline**: The core of the tracking system. Add events like "Application Submitted", "Interview 1", or "Assessment" to update the application's status.

### 4. Analytics
Visualizes your application funnel using a Sankey diagram.
- **Flow**: See the flow from Applications -> Assessments -> Interviews -> Outcomes.
- **Drop-offs**: Identify where applications are stalling or being rejected.

## Data Schema & Statuses

### Lead Options (Source)
When adding an application, you can specify the source to track which channels are most effective:
- **Cold Application**: Applied directly via company website or job board without prior contact.
- **Direct Connection**: Applied through a referral or personal network contact.
- **In-Person Event**: Met the company at a career fair, meetup, or conference.
- **Inbound Outreach**: A recruiter reached out to you first.

### Application Status
The status of an application is derived from the **most recent event** in its timeline.

| Status / Stage | Description |
| :--- | :--- |
| **Draft** | You are working on the application materials but haven't sent them yet. |
| **Application Submitted** | The application has been sent. This is the standard starting point. |
| **Assessment** | You have been asked to complete a take-home task or online assessment. Tracks `Due Date` and `Completed At`. |
| **Follow-up** | You sent a follow-up email or message to the company. |
| **Interview 1** | Usually a recruiter screen or initial phone call. |
| **Interview 2** | Technical or hiring manager interview (Unlockable after Interview 1). |
| **Interview 3** | Final rounds or onsite interviews (Unlockable after Interview 2). |
| **Other** | Any other custom event or status. |

### Timeline Events
Each event in the timeline captures specific data:
- **General Events**: `Date`, `Notes`.
- **Interviews**: Adds `Due Date` (the date of the interview).
- **Assessments**: Adds `Due Date` (deadline) and `Completed At` date.

## Technology Stack

- **Electron**: Desktop runtime.
- **React**: UI library.
- **TypeScript**: Type safety.
- **PouchDB**: Local database for storing application data.
- **Recharts**: For data visualization.
- **MUI (Material UI)**: Component library.
