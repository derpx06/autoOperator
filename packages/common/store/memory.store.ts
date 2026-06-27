'use client';

import {
    MemoryCandidate,
    MemoryContextItem,
    MemoryRecord,
    MemoryScope,
    MemorySearchOptions,
    MemorySettings,
    MemoryType,
} from '@repo/ai/memory';
import Dexie, { Table } from 'dexie';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const DEFAULT_SETTINGS: MemorySettings = {
    enabled: true,
    autoLearn: true,
    styleMemoryEnabled: true,
    maxActiveMemories: 100,
    maxPromptLines: 100,
};

class MemoryDatabase extends Dexie {
    memories!: Table<MemoryRecord>;
    settings!: Table<{ id: string; value: MemorySettings }>;

    constructor() {
        super('MemoryDatabase');
        this.version(1).stores({
            memories: 'id, type, status, updatedAt, lastUsedAt',
            settings: 'id',
        });
        this.version(2).stores({
            memories: 'id, type, status, scope, scopeThreadId, scopeProjectId, updatedAt, lastUsedAt',
            settings: 'id',
        }).upgrade(async transaction => {
            const memories = transaction.table<MemoryRecord, string>('memories');
            const existing = await memories.toArray();
            await Promise.all(existing.map(memory => memories.put({
                ...memory,
                scope: memory.scope || 'global',
                sourceType: memory.sourceType || 'chat',
                conflictsWith: memory.conflictsWith || [],
            })));
        });
    }
}

const db = typeof window !== 'undefined' ? new MemoryDatabase() : undefined;

type State = {
    memories: MemoryRecord[];
    settings: MemorySettings;
    isLoaded: boolean;
};

type Actions = {
    loadMemories: () => Promise<void>;
    addMemory: (candidate: MemoryCandidate, source?: Partial<MemoryRecord>) => Promise<MemoryRecord | null>;
    addManualMemory: (input: {
        content: string;
        type: MemoryType;
        scope: MemoryScope;
        scopeThreadId?: string;
        scopeProjectId?: string;
    }) => Promise<MemoryRecord | null>;
    updateMemory: (id: string, patch: Partial<MemoryRecord>) => Promise<void>;
    resolveConflict: (id: string, action: 'keep-existing' | 'use-new' | 'delete-new') => Promise<void>;
    deleteMemory: (id: string) => Promise<void>;
    clearMemories: () => Promise<void>;
    searchMemories: (query: string, options?: MemorySearchOptions) => Promise<MemoryContextItem[]>;
    updateSettings: (patch: Partial<MemorySettings>) => Promise<void>;
    exportMemories: () => string;
};

const normalizeText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const tokenize = (value: string) =>
    normalizeText(value)
        .split(/[^a-z0-9]+/)
        .filter(token => token.length > 2);

const toContextItem = (memory: MemoryRecord): MemoryContextItem => ({
    id: memory.id,
    type: memory.type,
    content: memory.content,
    tags: memory.tags,
    keywords: memory.keywords,
    confidence: memory.confidence,
    scope: memory.scope || 'global',
});

const scoreMemory = (memory: MemoryRecord, query: string) => {
    if (memory.type === 'style') return 100;
    const queryTokens = new Set(tokenize(query));
    const memoryTokens = [
        ...tokenize(memory.content),
        ...memory.tags.flatMap(tokenize),
        ...memory.keywords.flatMap(tokenize),
    ];
    const matches = memoryTokens.filter(token => queryTokens.has(token)).length;
    return matches * 10 + memory.confidence * 5 + Math.min(memory.useCount, 5);
};

const shouldMerge = (existing: MemoryRecord, candidate: MemoryCandidate) => {
    if (existing.type !== candidate.type) return false;
    const existingText = normalizeText(existing.content);
    const candidateText = normalizeText(candidate.content);
    if (existingText === candidateText) return true;
    return existingText.includes(candidateText) || candidateText.includes(existingText);
};

const SECRET_PATTERNS = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /token/i,
    /bearer\s+[a-z0-9._-]+/i,
    /sk-[a-z0-9_-]{12,}/i,
    /[a-z0-9]{24,}\.[a-z0-9._-]{12,}/i,
];

const hasSecretLikeText = (value: string) => SECRET_PATTERNS.some(pattern => pattern.test(value));

const preview = (value?: string) => value?.trim().replace(/\s+/g, ' ').slice(0, 220);

const inferScope = (
    candidate: MemoryCandidate,
    source: Partial<MemoryRecord>
): MemoryScope => {
    if (source.scope) return source.scope;
    if (candidate.scopeSuggestion === 'project' && source.scopeProjectId) return 'project';
    if (candidate.scopeSuggestion === 'thread' && source.scopeThreadId) return 'thread';
    if (candidate.type === 'style' || candidate.type === 'preference') return 'global';
    const text = normalizeText(`${candidate.content} ${candidate.tags.join(' ')} ${candidate.keywords.join(' ')}`);
    if (candidate.type === 'instruction' && /\b(always|every time|by default)\b/.test(text)) return 'global';
    if (/\b(project|repo|repository|codebase|startup|client)\b/.test(text) && source.scopeProjectId) return 'project';
    if (source.scopeThreadId) return 'thread';
    return 'global';
};

const scopeMatches = (memory: MemoryRecord, options: MemorySearchOptions) => {
    const scope = memory.scope || 'global';
    if (scope === 'global') return true;
    if (scope === 'thread') return Boolean(options.threadId && memory.scopeThreadId === options.threadId);
    return Boolean(options.projectId && memory.scopeProjectId === options.projectId);
};

const scopesOverlap = (memory: MemoryRecord, scope: MemoryScope, source: Partial<MemoryRecord>) => {
    const existingScope = memory.scope || 'global';
    if (existingScope === 'global' || scope === 'global') return true;
    if (existingScope === 'thread' || scope === 'thread') {
        return Boolean(memory.scopeThreadId && source.scopeThreadId && memory.scopeThreadId === source.scopeThreadId);
    }
    return Boolean(memory.scopeProjectId && source.scopeProjectId && memory.scopeProjectId === source.scopeProjectId);
};

const OPPOSITION_GROUPS = [
    ['concise', 'brief', 'short', 'succinct'],
    ['detailed', 'thorough', 'long', 'verbose', 'exhaustive'],
    ['formal', 'professional'],
    ['casual', 'friendly', 'informal'],
    ['dark'],
    ['light'],
    ['always'],
    ['never'],
];

const hasOpposition = (left: string, right: string) => {
    const leftTokens = new Set(tokenize(left));
    const rightTokens = new Set(tokenize(right));
    for (let index = 0; index < OPPOSITION_GROUPS.length; index += 2) {
        const a = OPPOSITION_GROUPS[index] || [];
        const b = OPPOSITION_GROUPS[index + 1] || [];
        if (
            a.some(token => leftTokens.has(token)) && b.some(token => rightTokens.has(token)) ||
            b.some(token => leftTokens.has(token)) && a.some(token => rightTokens.has(token))
        ) {
            return true;
        }
    }
    return false;
};

const findConflict = (
    memories: MemoryRecord[],
    candidate: MemoryCandidate,
    scope: MemoryScope,
    source: Partial<MemoryRecord>
) => {
    const candidateTokens = new Set([
        ...tokenize(candidate.content),
        ...candidate.tags.flatMap(tokenize),
        ...candidate.keywords.flatMap(tokenize),
    ]);
    return memories.find(memory => {
        if (memory.status !== 'active' || memory.type !== candidate.type) return false;
        if (!scopesOverlap(memory, scope, source)) return false;
        const memoryTokens = [
            ...tokenize(memory.content),
            ...memory.tags.flatMap(tokenize),
            ...memory.keywords.flatMap(tokenize),
        ];
        const overlap = memoryTokens.filter(token => candidateTokens.has(token)).length;
        return overlap > 0 && hasOpposition(memory.content, candidate.content);
    });
};

const getThreshold = (type: MemoryType) => {
    if (type === 'style') return 0.75;
    if (type === 'fact') return 0.9;
    return 0.85;
};

const createId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const useMemoryStore = create<State & Actions>()(
    immer((set, get) => ({
        memories: [],
        settings: DEFAULT_SETTINGS,
        isLoaded: false,

        loadMemories: async () => {
            if (!db) return;
            const [memories, storedSettings] = await Promise.all([
                db.memories.toArray(),
                db.settings.get('memory-settings'),
            ]);
            set(state => {
                state.memories = memories
                    .map(memory => ({
                        ...memory,
                        scope: memory.scope || 'global',
                        sourceType: memory.sourceType || 'chat',
                        conflictsWith: memory.conflictsWith || [],
                    }))
                    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
                state.settings = { ...DEFAULT_SETTINGS, ...(storedSettings?.value || {}) };
                state.isLoaded = true;
            });
        },

        addMemory: async (candidate, source = {}) => {
            if (!db || candidate.confidence < getThreshold(candidate.type)) return null;
            if (hasSecretLikeText(`${candidate.content} ${candidate.tags.join(' ')} ${candidate.keywords.join(' ')}`)) return null;
            const active = get().memories.filter(memory => memory.status === 'active');
            const scope = inferScope(candidate, source);
            const scopedSource = {
                ...source,
                scope,
                scopeThreadId: source.scopeThreadId || source.sourceThreadId,
            };
            const duplicate = active.find(memory => scopesOverlap(memory, scope, scopedSource) && shouldMerge(memory, candidate));
            const now = new Date();

            if (duplicate) {
                const updated: MemoryRecord = {
                    ...duplicate,
                    content: candidate.content.length > duplicate.content.length ? candidate.content : duplicate.content,
                    confidence: Math.max(duplicate.confidence, candidate.confidence),
                    tags: Array.from(new Set([...duplicate.tags, ...candidate.tags])).slice(0, 8),
                    keywords: Array.from(new Set([...duplicate.keywords, ...candidate.keywords])).slice(0, 12),
                    sourceThreadId: source.sourceThreadId || duplicate.sourceThreadId,
                    sourceThreadItemId: source.sourceThreadItemId || duplicate.sourceThreadItemId,
                    sourceQueryPreview: preview(source.sourceQueryPreview) || duplicate.sourceQueryPreview,
                    sourceAnswerPreview: preview(source.sourceAnswerPreview) || duplicate.sourceAnswerPreview,
                    updatedAt: now,
                };
                await db.memories.put(updated);
                set(state => {
                    state.memories = state.memories.map(memory => memory.id === updated.id ? updated : memory);
                });
                return updated;
            }

            const conflict = findConflict(get().memories, candidate, scope, scopedSource);

            if (!conflict && active.length >= get().settings.maxActiveMemories) {
                const lowest = [...active]
                    .filter(memory => memory.type !== 'style')
                    .sort((a, b) => a.confidence + a.useCount - (b.confidence + b.useCount))[0];
                if (lowest) await get().updateMemory(lowest.id, { status: 'archived' });
            }

            const record: MemoryRecord = {
                id: createId(),
                type: candidate.type,
                content: candidate.content,
                tags: candidate.tags,
                keywords: candidate.keywords,
                confidence: candidate.confidence,
                status: conflict ? 'conflict' : 'active',
                scope,
                scopeThreadId: scope === 'thread' ? scopedSource.scopeThreadId : undefined,
                scopeProjectId: scope === 'project' ? scopedSource.scopeProjectId : undefined,
                sourceType: source.sourceType || 'chat',
                sourceThreadId: source.sourceThreadId,
                sourceThreadItemId: source.sourceThreadItemId,
                sourceQueryPreview: preview(source.sourceQueryPreview),
                sourceAnswerPreview: preview(source.sourceAnswerPreview),
                conflictsWith: conflict ? [conflict.id] : [],
                conflictReason: conflict
                    ? `Conflicts with active ${conflict.type} memory: "${conflict.content}"`
                    : undefined,
                createdAt: now,
                updatedAt: now,
                useCount: 0,
            };
            await db.memories.put(record);
            set(state => {
                state.memories.unshift(record);
            });
            return record;
        },

        addManualMemory: async input => {
            const content = input.content.trim().replace(/\s+/g, ' ');
            if (!content || hasSecretLikeText(content)) return null;
            return get().addMemory(
                {
                    type: input.type,
                    content,
                    tags: ['manual'],
                    keywords: tokenize(content).slice(0, 12),
                    confidence: 1,
                    scopeSuggestion: input.scope,
                },
                {
                    sourceType: 'manual',
                    scope: input.scope,
                    scopeThreadId: input.scopeThreadId,
                    scopeProjectId: input.scopeProjectId,
                }
            );
        },

        updateMemory: async (id, patch) => {
            if (!db) return;
            const current = get().memories.find(memory => memory.id === id);
            if (!current) return;
            const updated = { ...current, ...patch, updatedAt: new Date() };
            await db.memories.put(updated);
            set(state => {
                state.memories = state.memories.map(memory => memory.id === id ? updated : memory);
            });
        },

        resolveConflict: async (id, action) => {
            const current = get().memories.find(memory => memory.id === id);
            if (!current || current.status !== 'conflict') return;

            if (action === 'delete-new') {
                await get().deleteMemory(id);
                return;
            }

            if (action === 'keep-existing') {
                await get().updateMemory(id, { status: 'archived' });
                return;
            }

            await Promise.all((current.conflictsWith || []).map(conflictId =>
                get().updateMemory(conflictId, { status: 'disabled' })
            ));
            await get().updateMemory(id, { status: 'active', conflictReason: undefined, conflictsWith: [] });
        },

        deleteMemory: async id => {
            if (!db) return;
            await db.memories.delete(id);
            set(state => {
                state.memories = state.memories.filter(memory => memory.id !== id);
            });
        },

        clearMemories: async () => {
            if (!db) return;
            await db.memories.clear();
            set(state => {
                state.memories = [];
            });
        },

        searchMemories: async (query, options = {}) => {
            const settings = get().settings;
            if (!settings.enabled) return [];
            const active = get().memories.filter(memory => memory.status === 'active' && scopeMatches(memory, options));
            const style = options.includeStyle === false || !settings.styleMemoryEnabled
                ? []
                : active.filter(memory => memory.type === 'style').slice(0, 5);
            const relevant = active
                .filter(memory => memory.type !== 'style')
                .map(memory => ({ memory, score: scoreMemory(memory, query) }))
                .filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, options.limit || 7)
                .map(item => item.memory);
            const selected = [...style, ...relevant].slice(0, 12);
            const now = new Date();
            await Promise.all(selected.map(memory => db?.memories.update(memory.id, {
                lastUsedAt: now,
                useCount: memory.useCount + 1,
            })));
            set(state => {
                state.memories = state.memories.map(memory =>
                    selected.some(item => item.id === memory.id)
                        ? { ...memory, lastUsedAt: now, useCount: memory.useCount + 1 }
                        : memory
                );
            });
            return selected.map(toContextItem);
        },

        updateSettings: async patch => {
            if (!db) return;
            const value = { ...get().settings, ...patch };
            await db.settings.put({ id: 'memory-settings', value });
            set(state => {
                state.settings = value;
            });
        },

        exportMemories: () => JSON.stringify({
            settings: get().settings,
            memories: get().memories,
            exportedAt: new Date().toISOString(),
        }, null, 2),
    }))
);
