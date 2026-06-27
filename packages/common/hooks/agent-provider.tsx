import { extractMemories } from '@repo/ai/memory';
import { useWorkflowWorker } from '@repo/ai/worker';
import { ChatMode, ChatModeConfig } from '@repo/shared/config';
import { ThreadItem } from '@repo/shared/types';
import { buildCoreMessagesFromThreadItems, plausible } from '@repo/shared/utils';
import { nanoid } from 'nanoid';
import { useParams, useRouter } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useApiKeysStore, useAppStore, useChatStore, useMcpToolsStore, useMemoryStore } from '../store';
import { getProviderConfig } from '@repo/ai/providers';
import { getComposioToolConfig } from '@repo/ai/connectors';
import { resolveSearchProviderConfig } from '@repo/ai/search';
export type AgentContextType = {
    runAgent: (body: any) => Promise<void>;
    handleSubmit: (args: {
        formData: FormData;
        newThreadId?: string;
        existingThreadItemId?: string;
        newChatMode?: string;
        messages?: ThreadItem[];
        useWebSearch?: boolean;
        showSuggestions?: boolean;
    }) => Promise<void>;
    updateContext: (threadId: string, data: any) => void;
};

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider = ({ children }: { children: ReactNode }) => {
    const { threadId: currentThreadId } = useParams();
    const isSignedIn = true;
    const user = { id: 'default-user' };

    const {
        updateThreadItem,
        setIsGenerating,
        setAbortController,
        createThreadItem,
        setCurrentThreadItem,
        setCurrentSources,
        updateThread,
        chatMode,
        fetchRemainingCredits,
        customInstructions,
    } = useChatStore(state => ({
        updateThreadItem: state.updateThreadItem,
        setIsGenerating: state.setIsGenerating,
        setAbortController: state.setAbortController,
        createThreadItem: state.createThreadItem,
        setCurrentThreadItem: state.setCurrentThreadItem,
        setCurrentSources: state.setCurrentSources,
        updateThread: state.updateThread,
        chatMode: state.chatMode,
        fetchRemainingCredits: state.fetchRemainingCredits,
        customInstructions: state.customInstructions,
    }));
    const { push } = useRouter();

    const getSelectedMCP = useMcpToolsStore(state => state.getSelectedMCP);
    const apiKeys = useApiKeysStore(state => state.getAllKeys);
    const hasApiKeyForChatMode = useApiKeysStore(state => state.hasApiKeyForChatMode);
    const setShowSignInModal = useAppStore(state => state.setShowSignInModal);
    const loadMemories = useMemoryStore(state => state.loadMemories);

    // Fetch remaining credits when user changes
    useEffect(() => {
        fetchRemainingCredits();
        loadMemories();
    }, [user?.id, fetchRemainingCredits, loadMemories]);

    // In-memory store for thread items
    const threadItemMap = useMemo(() => new Map<string, ThreadItem>(), []);
    const pendingMemoryRuns = useRef(
        new Map<
            string,
            {
                query: string;
                threadId: string;
                threadItemId: string;
                projectId?: string;
                messages: ThreadItem[];
                selectedProviderId?: string;
                selectedModelId?: string;
                apiKey?: string;
                baseUrl?: string;
                answer: string;
            }
        >()
    );

    // Define common event types to reduce repetition
    const EVENT_TYPES = [
        'steps',
        'sources',
        'answer',
        'error',
        'status',
        'suggestions',
        'toolCalls',
        'toolResults',
        'object',
    ];

    // Helper: Update in-memory and store thread item
    const handleThreadItemUpdate = useCallback(
        (
            threadId: string,
            threadItemId: string,
            eventType: string,
            eventData: any,
            parentThreadItemId?: string,
            shouldPersistToDB: boolean = true
        ) => {
            console.log(
                'handleThreadItemUpdate',
                threadItemId,
                eventType,
                eventData,
                shouldPersistToDB
            );
            const prevItem = threadItemMap.get(threadItemId) ||
                useChatStore.getState().threadItems.find(item => item.id === threadItemId) ||
                ({} as ThreadItem);
            const updatedItem: ThreadItem = {
                ...prevItem,
                query: eventData?.query || prevItem.query || '',
                mode: eventData?.mode || prevItem.mode,
                threadId,
                parentId: parentThreadItemId || prevItem.parentId,
                id: threadItemId,
                object: eventData?.object || prevItem.object,
                createdAt: prevItem.createdAt || new Date(),
                updatedAt: new Date(),
                ...(eventType === 'answer'
                    ? {
                          answer: {
                              ...eventData.answer,
                              text: (prevItem.answer?.text || '') + eventData.answer.text,
                          },
                      }
                    : { [eventType]: eventData[eventType] }),
            };

            threadItemMap.set(threadItemId, updatedItem);
            updateThreadItem(threadId, { ...updatedItem, persistToDB: true });
        },
        [threadItemMap, updateThreadItem]
    );

    const learnMemoriesFromRun = useCallback(async (threadItemId: string, fallbackAnswer?: string) => {
        const run = pendingMemoryRuns.current.get(threadItemId);
        if (!run) return;
        const memoryState = useMemoryStore.getState();
        if (!memoryState.settings.autoLearn) {
            pendingMemoryRuns.current.delete(threadItemId);
            return;
        }

        try {
            const existingMemories = await memoryState.searchMemories(run.query, {
                includeStyle: true,
                limit: 8,
                threadId: run.threadId,
                projectId: run.projectId,
            });
            const candidates = await extractMemories({
                input: {
                    query: run.query,
                    answer: fallbackAnswer || run.answer,
                    recentMessages: run.messages.slice(-4).map(item => ({
                        query: item.query,
                        answer: item.answer?.text,
                    })),
                    existingMemories,
                },
                selectedProviderId: run.selectedProviderId,
                selectedModelId: run.selectedModelId,
                apiKey: run.apiKey,
                baseUrl: run.baseUrl,
            });
            for (const candidate of candidates) {
                await memoryState.addMemory(candidate, {
                    sourceThreadId: run.threadId,
                    sourceThreadItemId: run.threadItemId,
                    sourceQueryPreview: run.query,
                    sourceAnswerPreview: fallbackAnswer || run.answer,
                    scopeThreadId: run.threadId,
                    scopeProjectId: run.projectId,
                });
            }
        } catch (error) {
            console.warn('[memory] Failed to extract memories:', error);
        } finally {
            pendingMemoryRuns.current.delete(threadItemId);
        }
    }, []);

    const { startWorkflow, abortWorkflow } = useWorkflowWorker(
        useCallback(
            (data: any) => {
                if (
                    data?.threadId &&
                    data?.threadItemId &&
                    data.event &&
                    EVENT_TYPES.includes(data.event)
                ) {
                    handleThreadItemUpdate(
                        data.threadId,
                        data.threadItemId,
                        data.event,
                        data,
                        data.parentThreadItemId
                    );
                }

                if (data.type === 'done') {
                    setIsGenerating(false);
                    setTimeout(fetchRemainingCredits, 1000);
                    if (data?.threadItemId) {
                        const item = threadItemMap.get(data.threadItemId);
                        void learnMemoriesFromRun(data.threadItemId, item?.answer?.text);
                        threadItemMap.delete(data.threadItemId);
                    }
                }
            },
            [handleThreadItemUpdate, setIsGenerating, fetchRemainingCredits, threadItemMap, learnMemoriesFromRun]
        )
    );

    const runAgent = useCallback(
        async (body: any) => {
            const abortController = new AbortController();
            setAbortController(abortController);
            setIsGenerating(true);
            const startTime = performance.now();
            let completedAnswer = '';

            abortController.signal.addEventListener('abort', () => {
                console.info('Abort controller triggered');
                setIsGenerating(false);
                updateThreadItem(body.threadId, {
                    id: body.threadItemId,
                    status: 'ABORTED',
                    persistToDB: true,
                });
            });

            try {
                const response = await fetch('/api/completion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    credentials: 'include',
                    cache: 'no-store',
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    let errorText = await response.text();

                    if (response.status === 429 && isSignedIn) {
                        errorText =
                            'You have reached the daily limit of requests. Please try again tomorrow or Use your own API key.';
                    }

                    if (response.status === 429 && !isSignedIn) {
                        errorText =
                            'You have reached the daily limit of requests. Please sign in to enjoy more requests.';
                    }

                    setIsGenerating(false);
                    updateThreadItem(body.threadId, {
                        id: body.threadItemId,
                        status: 'ERROR',
                        error: errorText,
                        persistToDB: true,
                    });
                    console.error('Error response:', errorText);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                if (!response.body) {
                    throw new Error('No response body received');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let lastDbUpdate = Date.now();
                const DB_UPDATE_INTERVAL = 1000;
                let eventCount = 0;
                const streamStartTime = performance.now();

                let buffer = '';

                while (true) {
                    try {
                        const { value, done } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const messages = buffer.split('\n\n');
                        buffer = messages.pop() || '';

                        for (const message of messages) {
                            if (!message.trim()) continue;

                            const eventMatch = message.match(/^event: (.+)$/m);
                            const dataMatch = message.match(/^data: (.+)$/m);

                            if (eventMatch && dataMatch) {
                                const currentEvent = eventMatch[1];
                                eventCount++;

                                try {
                                    const data = JSON.parse(dataMatch[1]);
                                    if (
                                        EVENT_TYPES.includes(currentEvent) &&
                                        data?.threadId &&
                                        data?.threadItemId
                                    ) {
                                        if (currentEvent === 'answer') {
                                            completedAnswer =
                                                data.answer?.fullText ||
                                                `${completedAnswer}${data.answer?.text || ''}`;
                                        }
                                        const shouldPersistToDB =
                                            Date.now() - lastDbUpdate >= DB_UPDATE_INTERVAL;
                                        handleThreadItemUpdate(
                                            data.threadId,
                                            data.threadItemId,
                                            currentEvent,
                                            data,
                                            data.parentThreadItemId,
                                            shouldPersistToDB
                                        );
                                        if (shouldPersistToDB) {
                                            lastDbUpdate = Date.now();
                                        }
                                    } else if (currentEvent === 'done' && data.type === 'done') {
                                        setIsGenerating(false);
                                        const streamDuration = performance.now() - streamStartTime;
                                        console.log(
                                            'done event received',
                                            eventCount,
                                            `Stream duration: ${streamDuration.toFixed(2)}ms`
                                        );
                                        setTimeout(fetchRemainingCredits, 1000);
                                        if (data.threadItemId) {
                                            void learnMemoriesFromRun(data.threadItemId, completedAnswer);
                                            threadItemMap.delete(data.threadItemId);
                                        }
                                        if (data.status === 'error') {
                                            console.error('Stream error:', data.error);
                                        }
                                    }
                                } catch (jsonError) {
                                    console.warn(
                                        'JSON parse error for data:',
                                        dataMatch[1],
                                        jsonError
                                    );
                                }
                            }
                        }
                    } catch (readError) {
                        console.error('Error reading from stream:', readError);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }
                }
            } catch (streamError: any) {
                const totalTime = performance.now() - startTime;
                console.error(
                    'Fatal stream error:',
                    streamError,
                    `Total time: ${totalTime.toFixed(2)}ms`
                );
                setIsGenerating(false);
                if (streamError.name === 'AbortError') {
                    updateThreadItem(body.threadId, {
                        id: body.threadItemId,
                        status: 'ABORTED',
                        error: 'Generation aborted',
                    });
                } else if (streamError.message.includes('429')) {
                    updateThreadItem(body.threadId, {
                        id: body.threadItemId,
                        status: 'ERROR',
                        error: 'You have reached the daily limit of requests. Please try again tomorrow or Use your own API key.',
                    });
                } else {
                    updateThreadItem(body.threadId, {
                        id: body.threadItemId,
                        status: 'ERROR',
                        error: 'Something went wrong. Please try again.',
                    });
                }
            } finally {
                setIsGenerating(false);

                const totalTime = performance.now() - startTime;
                console.info(`Stream completed in ${totalTime.toFixed(2)}ms`);
            }
        },
        [
            setAbortController,
            setIsGenerating,
            updateThreadItem,
            handleThreadItemUpdate,
            fetchRemainingCredits,
            EVENT_TYPES,
            threadItemMap,
        ]
    );

    const handleSubmit = useCallback(
        async ({
            formData,
            newThreadId,
            existingThreadItemId,
            newChatMode,
            messages,
            useWebSearch,
            showSuggestions,
        }: {
            formData: FormData;
            newThreadId?: string;
            existingThreadItemId?: string;
            newChatMode?: string;
            messages?: ThreadItem[];
            useWebSearch?: boolean;
            showSuggestions?: boolean;
        }) => {
            const mode = (newChatMode || chatMode) as ChatMode;
            if (
                !isSignedIn &&
                !!ChatModeConfig[mode as keyof typeof ChatModeConfig]?.isAuthRequired
            ) {
                push('/sign-in');

                return;
            }

            const threadId = currentThreadId?.toString() || newThreadId;
            if (!threadId) return;

            // Update thread title
            updateThread({ id: threadId, title: formData.get('query') as string });

            const optimisticAiThreadItemId = existingThreadItemId || nanoid();
            const query = formData.get('query') as string;
            const imageAttachment = formData.get('imageAttachment') as string;

            const aiThreadItem: ThreadItem = {
                id: optimisticAiThreadItemId,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'QUEUED',
                threadId,
                query,
                imageAttachment,
                mode,
            };

            createThreadItem(aiThreadItem);
            setCurrentThreadItem(aiThreadItem);
            setIsGenerating(true);
            setCurrentSources([]);

            plausible.trackEvent('send_message', {
                props: {
                    mode,
                },
            });

            // Build core messages array
            const coreMessages = buildCoreMessagesFromThreadItems({
                messages: messages || [],
                query,
                imageAttachment,
            });

            const selectedProviderId = useChatStore.getState().selectedProviderId;
            const selectedModelId = useChatStore.getState().selectedModelId;
            let providerApiKey: string | undefined = undefined;
            let providerBaseUrl: string | undefined = undefined;

            if (selectedProviderId) {
                const config = getProviderConfig(selectedProviderId);
                if (config) {
                    providerApiKey = config.apiKey;
                    providerBaseUrl = config.baseUrl;
                }
            }

            aiThreadItem.metadata = {
                ...(aiThreadItem.metadata || {}),
                selectedProviderId: selectedProviderId || undefined,
                selectedModelId: selectedModelId || undefined,
            };
            updateThreadItem(threadId, {
                id: optimisticAiThreadItemId,
                metadata: aiThreadItem.metadata,
                persistToDB: true,
            });

            const projectId = useChatStore.getState().getCurrentThread()?.projectId;
            const memories = await useMemoryStore.getState().searchMemories(query, {
                includeStyle: true,
                limit: 7,
                threadId,
                projectId,
            });
            const searchProvider = resolveSearchProviderConfig();
            const composioConfig = getComposioToolConfig();
            pendingMemoryRuns.current.set(optimisticAiThreadItemId, {
                query,
                threadId,
                threadItemId: optimisticAiThreadItemId,
                projectId,
                messages: messages || [],
                selectedProviderId: selectedProviderId || undefined,
                selectedModelId: selectedModelId || undefined,
                apiKey: providerApiKey || undefined,
                baseUrl: providerBaseUrl || undefined,
                answer: '',
            });

            const isLocalProvider = selectedProviderId === 'ollama';
            const runClientSide = isLocalProvider || (!selectedProviderId && hasApiKeyForChatMode(mode));

            if (runClientSide) {
                const abortController = new AbortController();
                setAbortController(abortController);
                setIsGenerating(true);

                abortController.signal.addEventListener('abort', () => {
                    console.info('Abort signal received');
                    setIsGenerating(false);
                    abortWorkflow();
                    updateThreadItem(threadId, { id: optimisticAiThreadItemId, status: 'ABORTED' });
                });

                startWorkflow({
                    mode,
                    question: query,
                    threadId,
                    messages: coreMessages,
                    mcpConfig: getSelectedMCP(),
                    memories,
                    searchProvider,
                    composioConfig,
                    threadItemId: optimisticAiThreadItemId,
                    parentThreadItemId: '',
                    customInstructions,
                    apiKeys: apiKeys(),
                    selectedProviderId: selectedProviderId || undefined,
                    selectedModelId: selectedModelId || undefined,
                    apiKey: providerApiKey || undefined,
                    baseUrl: providerBaseUrl || undefined,
                });
            } else {
                runAgent({
                    mode: newChatMode || chatMode,
                    prompt: query,
                    threadId,
                    messages: coreMessages,
                    mcpConfig: getSelectedMCP(),
                    memories,
                    searchProvider,
                    composioConfig,
                    threadItemId: optimisticAiThreadItemId,
                    customInstructions,
                    parentThreadItemId: '',
                    webSearch: useWebSearch,
                    showSuggestions: showSuggestions ?? true,
                    selectedProviderId: selectedProviderId || undefined,
                    selectedModelId: selectedModelId || undefined,
                    apiKey: providerApiKey || undefined,
                    baseUrl: providerBaseUrl || undefined,
                });
            }
        },
        [
            isSignedIn,
            currentThreadId,
            chatMode,
            setShowSignInModal,
            updateThread,
            createThreadItem,
            setCurrentThreadItem,
            setIsGenerating,
            setCurrentSources,
            abortWorkflow,
            startWorkflow,
            customInstructions,
            getSelectedMCP,
            apiKeys,
            hasApiKeyForChatMode,
            updateThreadItem,
            runAgent,
        ]
    );

    const updateContext = useCallback(
        (threadId: string, data: any) => {
            console.info('Updating context', data);
            updateThreadItem(threadId, {
                id: data.threadItemId,
                parentId: data.parentThreadItemId,
                threadId: data.threadId,
                metadata: data.context,
            });
        },
        [updateThreadItem]
    );

    const contextValue = useMemo(
        () => ({
            runAgent,
            handleSubmit,
            updateContext,
        }),
        [runAgent, handleSubmit, updateContext]
    );

    return <AgentContext.Provider value={contextValue}>{children}</AgentContext.Provider>;
};

export const useAgentStream = (): AgentContextType => {
    const context = useContext(AgentContext);
    if (!context) {
        throw new Error('useAgentStream must be used within an AgentProvider');
    }
    return context;
};
