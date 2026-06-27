export type MemoryType = 'style' | 'preference' | 'fact' | 'instruction';
export type MemoryStatus = 'active' | 'disabled' | 'archived';

export type MemoryRecord = {
    id: string;
    type: MemoryType;
    content: string;
    tags: string[];
    keywords: string[];
    confidence: number;
    status: MemoryStatus;
    sourceThreadId?: string;
    sourceThreadItemId?: string;
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
    'id' | 'type' | 'content' | 'tags' | 'keywords' | 'confidence'
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
};
