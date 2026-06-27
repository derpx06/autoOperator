'use client';
import { DotSpinner } from '@repo/common/components';
import { useApiKeysStore, useChatStore } from '@repo/common/store';
import { CHAT_MODE_CREDIT_COSTS, ChatMode, ChatModeConfig } from '@repo/shared/config';
import {
    Button,
    cn,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    Kbd,
} from '@repo/ui';
import {
    IconArrowUp,
    IconAtom,
    IconChevronDown,
    IconNorthStar,
    IconPaperclip,
    IconPlayerStopFilled,
    IconWorld,
    IconPlug,
} from '@tabler/icons-react';
import { getProviderConfigs } from '@repo/ai/providers';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BYOKIcon, NewIcon } from '../icons';

export const chatOptions = [
    {
        label: 'Deep Research',
        description: 'In depth research on complex topic',
        value: ChatMode.Deep,
        icon: <IconAtom size={16} className="text-muted-foreground" strokeWidth={2} />,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.Deep],
    },
    {
        label: 'Pro Search',
        description: 'Pro search with web search',
        value: ChatMode.Pro,
        icon: <IconNorthStar size={16} className="text-muted-foreground" strokeWidth={2} />,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.Pro],
    },
];

export const modelOptions = [
    {
        label: 'Llama 4 Scout',
        value: ChatMode.LLAMA_4_SCOUT,
        // webSearch: true,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.LLAMA_4_SCOUT],
    },
    {
        label: 'GPT 4.1',
        value: ChatMode.GPT_4_1,
        // webSearch: true,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4_1],
    },
    {
        label: 'GPT 4.1 Mini',
        value: ChatMode.GPT_4_1_Mini,
        // webSearch: true,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4_1_Mini],
    },
    {
        label: 'GPT 4.1 Nano',
        value: ChatMode.GPT_4_1_Nano,
        // webSearch: true,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4_1_Nano],
    },
    {
        label: 'Gemini Flash 2.0',
        value: ChatMode.GEMINI_2_FLASH,
        // webSearch: true,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GEMINI_2_FLASH],
    },

    {
        label: 'GPT 4o Mini',
        value: ChatMode.GPT_4o_Mini,
        // webSearch: true,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4o_Mini],
    },

    {
        label: 'O4 Mini',
        value: ChatMode.O4_Mini,
        // webSearch: true,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.O4_Mini],
    },

    {
        label: 'Claude 3.5 Sonnet',
        value: ChatMode.CLAUDE_3_5_SONNET,
        // webSearch: true,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.CLAUDE_3_5_SONNET],
    },

    {
        label: 'Deepseek R1',
        value: ChatMode.DEEPSEEK_R1,
        // webSearch: true,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.DEEPSEEK_R1],
    },

    {
        label: 'Claude 3.7 Sonnet',
        value: ChatMode.CLAUDE_3_7_SONNET,
        // webSearch: true,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.CLAUDE_3_7_SONNET],
    },
];

export const AttachmentButton = () => {
    return (
        <Button
            size="icon"
            tooltip="Attachment (coming soon)"
            variant="ghost"
            className="gap-2"
            rounded="full"
            disabled
        >
            <IconPaperclip size={18} strokeWidth={2} className="text-muted-foreground" />
        </Button>
    );
};

export const ChatModeButton = () => {
    const chatMode = useChatStore(state => state.chatMode);
    const setChatMode = useChatStore(state => state.setChatMode);
    const selectedProviderId = useChatStore(state => state.selectedProviderId);
    const selectedModelId = useChatStore(state => state.selectedModelId);
    const setSelectedProviderId = useChatStore(state => state.setSelectedProviderId);
    const setSelectedModelId = useChatStore(state => state.setSelectedModelId);

    const [isChatModeOpen, setIsChatModeOpen] = useState(false);
    const isChatPage = usePathname().startsWith('/chat');

    const configs = getProviderConfigs();
    const activeConfigs = configs.filter(c => c.enabled && c.models?.length > 0);
    const currentProvider = activeConfigs.find(c => c.id === selectedProviderId);

    const selectedOption =
        (isChatPage
            ? [...chatOptions, ...modelOptions].find(option => option.value === chatMode)
            : [...modelOptions].find(option => option.value === chatMode)) ?? modelOptions[0];

    useEffect(() => {
        if (selectedProviderId && currentProvider) return;
        const firstProvider = activeConfigs[0];
        if (!firstProvider) {
            if (selectedProviderId) setSelectedProviderId(null);
            if (selectedModelId) setSelectedModelId(null);
            return;
        }
        setSelectedProviderId(firstProvider.id);
        setSelectedModelId(firstProvider.defaultModel || firstProvider.models[0]);
    }, [activeConfigs, currentProvider, selectedModelId, selectedProviderId, setSelectedModelId, setSelectedProviderId]);

    return (
        <DropdownMenu open={isChatModeOpen} onOpenChange={setIsChatModeOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant={'secondary'} size="xs" className="font-sans">
                    {selectedProviderId && selectedModelId ? (
                        <>
                            <IconPlug size={14} className="text-blue-500 mr-1 animate-pulse" />
                            <span className="capitalize">{currentProvider?.name || selectedProviderId}</span>: {selectedModelId}
                        </>
                    ) : (
                        <>
                            {selectedOption?.icon}
                            {selectedOption?.label}
                        </>
                    )}
                    <IconChevronDown size={14} strokeWidth={2} />
                </Button>
            </DropdownMenuTrigger>
            <ChatModeOptions
                chatMode={chatMode}
                setChatMode={setChatMode}
                selectedProviderId={selectedProviderId}
                selectedModelId={selectedModelId}
                setSelectedProviderId={setSelectedProviderId}
                setSelectedModelId={setSelectedModelId}
                activeConfigs={activeConfigs}
            />
        </DropdownMenu>
    );
};

export const WebSearchButton = () => {
    const useWebSearch = useChatStore(state => state.useWebSearch);
    const setUseWebSearch = useChatStore(state => state.setUseWebSearch);
    const chatMode = useChatStore(state => state.chatMode);
    const hasApiKeyForChatMode = useApiKeysStore(state => state.hasApiKeyForChatMode);

    if (!ChatModeConfig[chatMode]?.webSearch && !hasApiKeyForChatMode(chatMode)) return null;

    return (
        <Button
            size={useWebSearch ? 'sm' : 'icon-sm'}
            tooltip="Web Search"
            variant={useWebSearch ? 'secondary' : 'ghost'}
            className={cn('gap-2', useWebSearch && 'bg-blue-500/10 text-blue-500')}
            onClick={() => setUseWebSearch(!useWebSearch)}
        >
            <IconWorld
                size={16}
                strokeWidth={2}
                className={cn(useWebSearch ? '!text-blue-500' : 'text-muted-foreground')}
            />
            {useWebSearch && <p className="text-xs">Web</p>}
        </Button>
    );
};

export const NewLineIndicator = () => {
    const editor = useChatStore(state => state.editor);
    const hasTextInput = !!editor?.getText();

    if (!hasTextInput) return null;

    return (
        <p className="flex flex-row items-center gap-1 text-xs text-gray-500">
            use <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for new line
        </p>
    );
};

export const GeneratingStatus = () => {
    return (
        <div className="text-muted-foreground flex flex-row items-center gap-1 px-2 text-xs">
            <DotSpinner /> Generating...
        </div>
    );
};

export const ChatModeOptions = ({
    chatMode,
    setChatMode,
    selectedProviderId,
    selectedModelId,
    setSelectedProviderId,
    setSelectedModelId,
    activeConfigs,
}: {
    chatMode: ChatMode;
    setChatMode: (chatMode: ChatMode) => void;
    selectedProviderId: string | null;
    selectedModelId: string | null;
    setSelectedProviderId: (id: string | null) => void;
    setSelectedModelId: (id: string | null) => void;
    activeConfigs: any[];
}) => {
    const isSignedIn = true;
    const isChatPage = usePathname().startsWith('/chat');
    const { push } = useRouter();
    return (
        <DropdownMenuContent
            align="start"
            side="bottom"
            className="no-scrollbar max-h-[350px] w-[300px] overflow-y-auto"
        >
            {isChatPage && (
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Advanced Mode</DropdownMenuLabel>
                    {chatOptions.map(option => (
                        <DropdownMenuItem
                            key={option.label}
                            onSelect={() => {
                                if (ChatModeConfig[option.value]?.isAuthRequired && !isSignedIn) {
                                    push('/sign-in');
                                    return;
                                }
                                setSelectedProviderId(null);
                                setSelectedModelId(null);
                                setChatMode(option.value);
                            }}
                            className="h-auto"
                        >
                            <div className="flex w-full flex-row items-start gap-1.5 px-1.5 py-1.5">
                                <div className="flex flex-col gap-0 pt-1">{option.icon}</div>

                                <div className="flex flex-col gap-0">
                                    {<p className="m-0 text-sm font-medium">{option.label}</p>}
                                    {option.description && (
                                        <p className="text-muted-foreground text-xs font-light">
                                            {option.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex-1" />
                                {ChatModeConfig[option.value]?.isNew && <NewIcon />}
                            </div>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
            )}

            {activeConfigs.length > 0 && (
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Enabled Providers</DropdownMenuLabel>
                    {activeConfigs.map(provider => (
                        <div key={provider.id} className="border-b border-border/40 last:border-0 pb-1">
                            <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider capitalize">
                                {provider.name}
                            </div>
                            {provider.models.map((modelId: string) => {
                                const isSelected = selectedProviderId === provider.id && selectedModelId === modelId;
                                return (
                                    <DropdownMenuItem
                                        key={modelId}
                                        onSelect={() => {
                                            setSelectedProviderId(provider.id);
                                            setSelectedModelId(modelId);
                                        }}
                                        className="h-auto"
                                    >
                                        <div className="flex w-full flex-row items-center gap-2.5 px-1.5 py-1">
                                            <div className="flex flex-col gap-0">
                                                <p className={cn("text-sm font-medium", isSelected && "text-blue-500")}>
                                                    {modelId}
                                                </p>
                                            </div>
                                            <div className="flex-1" />
                                            {isSelected && <span className="text-blue-500 text-xs font-semibold mr-1">Active</span>}
                                            <BYOKIcon />
                                        </div>
                                    </DropdownMenuItem>
                                );
                            })}
                        </div>
                    ))}
                </DropdownMenuGroup>
            )}
        </DropdownMenuContent>
    );
};

export const SendStopButton = ({
    isGenerating,
    isChatPage,
    stopGeneration,
    hasTextInput,
    sendMessage,
}: {
    isGenerating: boolean;
    isChatPage: boolean;
    stopGeneration: () => void;
    hasTextInput: boolean;
    sendMessage: () => void;
}) => {
    return (
        <div className="flex flex-row items-center gap-2">
            <AnimatePresence mode="wait" initial={false}>
                {isGenerating && !isChatPage ? (
                    <motion.div
                        key="stop-button"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            size="icon-sm"
                            variant="default"
                            onClick={stopGeneration}
                            tooltip="Stop Generation"
                        >
                            <IconPlayerStopFilled size={14} strokeWidth={2} />
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="send-button"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            size="icon-sm"
                            tooltip="Send Message"
                            variant={hasTextInput ? 'default' : 'secondary'}
                            disabled={!hasTextInput || isGenerating}
                            onClick={() => {
                                sendMessage();
                            }}
                        >
                            <IconArrowUp size={16} strokeWidth={2} />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
