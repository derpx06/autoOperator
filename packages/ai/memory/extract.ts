import { z } from 'zod';
import { ModelEnum } from '../models';
import { generateObject } from '../workflow/utils';
import { MemoryCandidate, MemoryExtractionInput, MemoryType } from './types';

const memoryCandidateSchema = z.object({
    memories: z
        .array(
            z.object({
                type: z.enum(['style', 'preference', 'fact', 'instruction']),
                content: z.string().min(8).max(220),
                tags: z.array(z.string()).default([]),
                keywords: z.array(z.string()).default([]),
                confidence: z.number().min(0).max(1),
            })
        )
        .max(8),
});

const MIN_CONFIDENCE: Record<MemoryType, number> = {
    style: 0.75,
    preference: 0.85,
    fact: 0.9,
    instruction: 0.85,
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

const TRANSIENT_PATTERNS = [
    /for this (task|chat|message|conversation) only/i,
    /just for now/i,
    /temporary/i,
    /today only/i,
    /right now/i,
];

const SENSITIVE_PATTERNS = [
    /diagnos/i,
    /medical/i,
    /health condition/i,
    /legal case/i,
    /lawsuit/i,
    /bank account/i,
    /credit card/i,
    /social security/i,
];

export const isSafeMemoryCandidate = (candidate: MemoryCandidate) => {
    const text = `${candidate.content} ${candidate.tags.join(' ')} ${candidate.keywords.join(' ')}`;
    if (candidate.confidence < MIN_CONFIDENCE[candidate.type]) return false;
    if (SECRET_PATTERNS.some(pattern => pattern.test(text))) return false;
    if (TRANSIENT_PATTERNS.some(pattern => pattern.test(text))) return false;
    if (
        candidate.type !== 'instruction' &&
        SENSITIVE_PATTERNS.some(pattern => pattern.test(text))
    ) {
        return false;
    }
    return true;
};

export const normalizeMemoryCandidate = (candidate: MemoryCandidate): MemoryCandidate => ({
    type: candidate.type,
    content: candidate.content.trim().replace(/\s+/g, ' '),
    tags: Array.from(new Set((candidate.tags || []).map(tag => tag.trim().toLowerCase()).filter(Boolean))).slice(0, 8),
    keywords: Array.from(new Set((candidate.keywords || []).map(keyword => keyword.trim().toLowerCase()).filter(Boolean))).slice(0, 12),
    confidence: Math.max(0, Math.min(1, Number(candidate.confidence) || 0)),
});

export const extractMemories = async ({
    input,
    selectedProviderId,
    selectedModelId,
    apiKey,
    baseUrl,
    signal,
}: {
    input: MemoryExtractionInput;
    selectedProviderId?: string;
    selectedModelId?: string;
    apiKey?: string;
    baseUrl?: string;
    signal?: AbortSignal;
}): Promise<MemoryCandidate[]> => {
    if (!input.query?.trim() || !input.answer?.trim()) return [];

    const recentContext = (input.recentMessages || [])
        .slice(-4)
        .map(item => `User: ${item.query || ''}\nAssistant: ${item.answer || ''}`)
        .join('\n\n');
    const existing = (input.existingMemories || [])
        .map(memory => `- [${memory.type}] ${memory.content}`)
        .join('\n');

    const result = await generateObject({
        model: ModelEnum.GPT_4o_Mini,
        selectedProviderId,
        selectedModelId,
        apiKey,
        baseUrl,
        signal,
        schema: memoryCandidateSchema,
        prompt: `Extract durable user memories from this chat.

Rules:
- Save tone, writing style, preferences, stable facts, and explicit standing instructions.
- Do not save secrets, credentials, temporary task details, or sensitive health/legal/financial identity claims.
- Avoid duplicates of existing memories.
- Use concise first-person-neutral wording.
- Return an empty array when there is nothing durable to remember.

Existing memories:
${existing || 'None'}

Recent context:
${recentContext || 'None'}

Latest user:
${input.query}

Assistant answer:
${input.answer}`,
    });

    const candidates = Array.isArray(result?.memories) ? result.memories : [];
    return candidates.map(normalizeMemoryCandidate).filter(isSafeMemoryCandidate);
};
