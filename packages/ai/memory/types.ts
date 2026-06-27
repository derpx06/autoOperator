export type MemoryType = 'style' | 'preference' | 'fact' | 'instruction';
export type MemoryStatus = 'active' | 'disabled' | 'archived' | 'conflict';
export type MemoryScope = 'global' | 'thread' | 'project';
export type MemorySourceType = 'chat' | 'manual';

export type MemoryRecord = {
    id: string;
    type: MemoryType;
    content: string;
    tags: string[];
    keywords: string[];
    confidence: number;
    status: MemoryStatus;
    scope: MemoryScope;
    scopeThreadId?: string;
    scopeProjectId?: string;
    sourceType: MemorySourceType;
    sourceThreadId?: string;
    sourceThreadItemId?: string;
    sourceQueryPreview?: string;
    sourceAnswerPreview?: string;
    conflictsWith?: string[];
    conflictReason?: string;
    createdAt: Date;
    updatedAt: Date;
    lastUsedAt?: Date;
    useCount: number;
};

export type MemoryCandidate = {
    type: MemoryType;
    content: string;
    tags: string[];
    keywords: string[];
    confidence: number;
    scopeSuggestion?: MemoryScope;
};

export type MemorySettings = {
    enabled: boolean;
    autoLearn: boolean;
    styleMemoryEnabled: boolean;
    maxActiveMemories: number;
    maxPromptLines: number;
};

export type MemoryContextItem = Pick<
    MemoryRecord,
    'id' | 'type' | 'content' | 'tags' | 'keywords' | 'confidence' | 'scope'
>;

export type MemoryExtractionInput = {
    query: string;
    answer: string;
    recentMessages?: Array<{ query?: string; answer?: string }>;
    existingMemories?: MemoryContextItem[];
};

export type MemorySearchOptions = {
    includeStyle?: boolean;
    limit?: number;
    threadId?: string;
    projectId?: string;
};
