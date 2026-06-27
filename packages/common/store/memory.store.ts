'use client';

import {
    MemoryCandidate,
    MemoryContextItem,
    MemoryRecord,
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
    updateMemory: (id: string, patch: Partial<MemoryRecord>) => Promise<void>;
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
                state.memories = memories.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
                state.settings = { ...DEFAULT_SETTINGS, ...(storedSettings?.value || {}) };
                state.isLoaded = true;
            });
        },

        addMemory: async (candidate, source = {}) => {
            if (!db || candidate.confidence < getThreshold(candidate.type)) return null;
            const active = get().memories.filter(memory => memory.status === 'active');
            const duplicate = active.find(memory => shouldMerge(memory, candidate));
            const now = new Date();

            if (duplicate) {
                const updated: MemoryRecord = {
                    ...duplicate,
                    content: candidate.content.length > duplicate.content.length ? candidate.content : duplicate.content,
                    confidence: Math.max(duplicate.confidence, candidate.confidence),
                    tags: Array.from(new Set([...duplicate.tags, ...candidate.tags])).slice(0, 8),
                    keywords: Array.from(new Set([...duplicate.keywords, ...candidate.keywords])).slice(0, 12),
                    updatedAt: now,
                };
                await db.memories.put(updated);
                set(state => {
                    state.memories = state.memories.map(memory => memory.id === updated.id ? updated : memory);
                });
                return updated;
            }

            if (active.length >= get().settings.maxActiveMemories) {
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
                status: 'active',
                sourceThreadId: source.sourceThreadId,
                sourceThreadItemId: source.sourceThreadItemId,
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
            const active = get().memories.filter(memory => memory.status === 'active');
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
