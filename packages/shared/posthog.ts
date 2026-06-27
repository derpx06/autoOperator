import { PostHog } from 'posthog-node';
import { v4 as uuidv4 } from 'uuid';

let client: PostHog | null = null;

function getClient() {
    if (!client && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
            host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        });
    }
    return client;
}

export enum EVENT_TYPES {
    WORKFLOW_SUMMARY = 'workflow_summary',
}

export type PostHogEvent = {
    event: EVENT_TYPES;
    userId: string;
    properties: Record<string, any>;
};

export const posthog = {
    capture: (event: PostHogEvent) => {
        const phClient = getClient();
        if (phClient) {
            phClient.capture({
                distinctId: event?.userId || uuidv4(),
                event: event.event,
                properties: event.properties,
            });
        }
    },
    flush: () => {
        const phClient = getClient();
        if (phClient) {
            phClient.flush();
        }
    },
};
