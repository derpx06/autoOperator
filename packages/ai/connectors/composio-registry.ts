import { ComposioConnectorApp } from './types';

export const DEFAULT_COMPOSIO_USER_ID = 'default-user';

export const composioPopularApps: Omit<ComposioConnectorApp, 'status' | 'enabled'>[] = [
    {
        slug: 'github',
        name: 'GitHub',
        description: 'Read repositories, issues, pull requests, commits, and repository metadata.',
    },
    {
        slug: 'googledrive',
        name: 'Google Drive',
        description: 'Search and read Drive files connected through Google OAuth.',
    },
    {
        slug: 'gmail',
        name: 'Gmail',
        description: 'Search, read, draft, and send email through a connected Google account.',
    },
    {
        slug: 'slack',
        name: 'Slack',
        description: 'Search channels, read messages, and post updates in connected workspaces.',
    },
    {
        slug: 'notion',
        name: 'Notion',
        description: 'Search and read pages/databases from a connected Notion workspace.',
    },
    {
        slug: 'linear',
        name: 'Linear',
        description: 'Search and manage Linear issues, teams, and projects.',
    },
    {
        slug: 'jira',
        name: 'Jira',
        description: 'Search and update Jira issues and projects.',
    },
];
