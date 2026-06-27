import { MemoryContextItem } from './types';

const TYPE_LABELS = {
    style: 'Style',
    preference: 'Preference',
    fact: 'Fact',
    instruction: 'Instruction',
};

export const buildMemoryPromptSection = (
    memories: MemoryContextItem[] | undefined,
    maxLines: number = 100
) => {
    if (!memories?.length) return '';

    const lines = memories
        .slice(0, Math.max(1, Math.min(maxLines, 100)))
        .map(memory => `- ${TYPE_LABELS[memory.type]}: ${memory.content}`);

    return `\n\nUser memory:\nUse these memories silently to personalize the response. Do not mention memory unless the user asks. If the current user message conflicts with a memory, follow the current user message.\n${lines.join('\n')}`;
};
