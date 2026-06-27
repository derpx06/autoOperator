'use client';
import { useMcpToolsStore } from '@repo/common/store';
import { DialogFooter } from '@repo/ui';
import { Button } from '@repo/ui/src/components/button';
import { IconKey, IconSettings2, IconTrash } from '@tabler/icons-react';

import { Badge, Dialog, DialogContent, Input } from '@repo/ui';

import { useChatEditor } from '@repo/common/hooks';
import { Editor } from '@tiptap/react';
import { useState } from 'react';
import { ApiKeys, useApiKeysStore } from '../store/api-keys.store';
import { SETTING_TABS, useAppStore } from '../store/app.store';
import { useChatStore } from '../store/chat.store';
import { ChatEditor } from './chat-input';
import { BYOKIcon, ToolIcon } from './icons';
import { ThemePicker } from './theme-toggle';

export const SettingsModal = () => {
    const isSettingOpen = useAppStore(state => state.isSettingsOpen);
    const setIsSettingOpen = useAppStore(state => state.setIsSettingsOpen);
    const settingTab = useAppStore(state => state.settingTab);
    const setSettingTab = useAppStore(state => state.setSettingTab);

    const settingMenu = [
        {
            icon: <IconSettings2 size={15} strokeWidth={2} />,
            title: 'Customize',
            key: SETTING_TABS.PERSONALIZATION,
            component: <PersonalizationSettings />,
        },
        {
            icon: <IconKey size={15} strokeWidth={2} />,
            title: 'API Keys',
            key: SETTING_TABS.API_KEYS,
            component: <ApiKeySettings />,
        },
    ];

    return (
        <Dialog open={isSettingOpen} onOpenChange={() => setIsSettingOpen(false)}>
            <DialogContent
                ariaTitle="Settings"
                className="h-full max-h-[580px] !max-w-[720px] overflow-x-hidden rounded-2xl p-0 shadow-2xl"
            >
                <div className="no-scrollbar relative flex h-full max-w-full flex-col overflow-hidden">
                    {/* Header */}
                    <div className="border-border/60 flex items-center gap-3 border-b px-6 py-4">
                        <div className="bg-brand/10 flex size-7 items-center justify-center rounded-lg">
                            <IconSettings2 size={15} strokeWidth={2} className="text-brand" />
                        </div>
                        <h3 className="text-base font-semibold tracking-tight">Settings</h3>
                    </div>

                    <div className="flex flex-1 flex-row overflow-hidden">
                        {/* Sidebar nav */}
                        <div className="border-border/60 flex w-[160px] shrink-0 flex-col gap-0.5 border-r p-3">
                            {settingMenu.map(setting => {
                                const isActive = settingTab === setting.key;
                                return (
                                    <button
                                        key={setting.key}
                                        onClick={() => setSettingTab(setting.key)}
                                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                                            isActive
                                                ? 'bg-brand/10 text-brand'
                                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                        }`}
                                    >
                                        <span
                                            className={`flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                                isActive ? 'bg-brand/20 text-brand' : ''
                                            }`}
                                        >
                                            {setting.icon}
                                        </span>
                                        {setting.title}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content area */}
                        <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto p-6">
                            {settingMenu.find(setting => setting.key === settingTab)?.component}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export const MCPSettings = () => {
    const [isAddToolDialogOpen, setIsAddToolDialogOpen] = useState(false);
    const { mcpConfig, addMcpConfig, removeMcpConfig, updateSelectedMCP, selectedMCP } =
        useMcpToolsStore();

    return (
        <div className="flex w-full flex-col gap-6 overflow-x-hidden">
            <div className="flex flex-col">
                <h2 className="flex items-center gap-1 text-base font-medium">MCP Tools</h2>
                <p className="text-muted-foreground text-xs">
                    Connect your MCP tools. This will only work with your own API keys.
                </p>
            </div>
            <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-medium">
                    Connected Tools{' '}
                    <Badge
                        variant="secondary"
                        className="text-brand inline-flex items-center gap-1 rounded-full bg-transparent"
                    >
                        <span className="bg-brand inline-block size-2 rounded-full"></span>
                        {mcpConfig && Object.keys(mcpConfig).length} Connected
                    </Badge>
                </p>
                {mcpConfig &&
                    Object.keys(mcpConfig).length > 0 &&
                    Object.keys(mcpConfig).map(key => (
                        <div
                            key={key}
                            className="bg-secondary divide-border border-border flex h-12 w-full flex-1 flex-row items-center gap-2 divide-x-2 rounded-xl border px-2.5 py-2"
                        >
                            <div className="flex w-full flex-row items-center gap-2">
                                <ToolIcon /> <Badge>{key}</Badge>
                                <p className="text-muted-foreground line-clamp-1 flex-1 text-sm">
                                    {mcpConfig[key]}
                                </p>
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    tooltip="Delete Tool"
                                    onClick={() => {
                                        removeMcpConfig(key);
                                    }}
                                >
                                    <IconTrash
                                        size={14}
                                        strokeWidth={2}
                                        className="text-muted-foreground"
                                    />
                                </Button>
                            </div>
                        </div>
                    ))}

                <Button
                    size="sm"
                    rounded="full"
                    className="mt-2 self-start"
                    onClick={() => setIsAddToolDialogOpen(true)}
                >
                    Add Tool
                </Button>
            </div>

            <div className="mt-6 border-t border-dashed pt-6">
                <p className="text-muted-foreground text-xs">Learn more about MCP:</p>
                <div className="mt-2 flex flex-col gap-2 text-sm">
                    <a
                        href="https://mcp.composio.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center hover:underline"
                    >
                        Browse Composio MCP Directory →
                    </a>
                    <a
                        href="https://www.anthropic.com/news/model-context-protocol"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center hover:underline"
                    >
                        Read MCP Documentation →
                    </a>
                </div>
            </div>

            <AddToolDialog
                isOpen={isAddToolDialogOpen}
                onOpenChange={setIsAddToolDialogOpen}
                onAddTool={addMcpConfig}
            />
        </div>
    );
};

type AddToolDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAddTool: (tool: Record<string, string>) => void;
};

const AddToolDialog = ({ isOpen, onOpenChange, onAddTool }: AddToolDialogProps) => {
    const [mcpToolName, setMcpToolName] = useState('');
    const [mcpToolUrl, setMcpToolUrl] = useState('');
    const [error, setError] = useState('');
    const { mcpConfig } = useMcpToolsStore();

    const handleAddTool = () => {
        if (!mcpToolName.trim()) {
            setError('Tool name is required');
            return;
        }

        if (!mcpToolUrl.trim()) {
            setError('Tool URL is required');
            return;
        }

        if (mcpConfig && mcpConfig[mcpToolName]) {
            setError('A tool with this name already exists');
            return;
        }

        setError('');

        onAddTool({
            [mcpToolName]: mcpToolUrl,
        });

        setMcpToolName('');
        setMcpToolUrl('');
        onOpenChange(false);
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setError('');
            setMcpToolName('');
            setMcpToolUrl('');
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent ariaTitle="Add MCP Tool" className="!max-w-md rounded-2xl">
                <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold">Add New MCP Tool</h3>

                    {error && <p className="text-destructive text-sm font-medium">{error}</p>}

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Tool Name</label>
                        <Input
                            placeholder="Tool Name"
                            value={mcpToolName}
                            onChange={e => {
                                const key = e.target.value?.trim().toLowerCase().replace(/ /g, '-');
                                setMcpToolName(key);
                                if (error) setError('');
                            }}
                        />
                        <p className="text-muted-foreground text-xs">
                            Will be automatically converted to lowercase with hyphens
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Tool Server URL</label>
                        <Input
                            placeholder="https://your-mcp-server.com"
                            value={mcpToolUrl}
                            onChange={e => {
                                setMcpToolUrl(e.target.value);
                                if (error) setError('');
                            }}
                        />
                        <p className="text-muted-foreground text-xs">
                            Example: https://your-mcp-server.com
                        </p>
                    </div>
                </div>
                <DialogFooter className="border-border mt-4 border-t pt-4">
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="bordered"
                            rounded={'full'}
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleAddTool} rounded="full">
                            Add Tool
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export const ApiKeySettings = () => {
    const apiKeys = useApiKeysStore(state => state.getAllKeys());
    const setApiKey = useApiKeysStore(state => state.setKey);
    const [isEditing, setIsEditing] = useState<string | null>(null);

    const apiKeyList = [
        {
            name: 'OpenAI',
            key: 'OPENAI_API_KEY' as keyof ApiKeys,
            value: apiKeys.OPENAI_API_KEY,
            url: 'https://platform.openai.com/api-keys',
            color: 'from-emerald-500/10 to-transparent',
            dot: 'bg-emerald-500',
        },
        {
            name: 'Anthropic',
            key: 'ANTHROPIC_API_KEY' as keyof ApiKeys,
            value: apiKeys.ANTHROPIC_API_KEY,
            url: 'https://console.anthropic.com/settings/keys',
            color: 'from-orange-500/10 to-transparent',
            dot: 'bg-orange-500',
        },
        {
            name: 'Google Gemini',
            key: 'GEMINI_API_KEY' as keyof ApiKeys,
            value: apiKeys.GEMINI_API_KEY,
            url: 'https://ai.google.dev/api',
            color: 'from-blue-500/10 to-transparent',
            dot: 'bg-blue-500',
        },
    ];

    const handleSave = (keyName: keyof ApiKeys, value: string) => {
        setApiKey(keyName, value);
        setIsEditing(null);
    };

    const getMaskedKey = (key: string) => {
        if (!key) return '';
        return '••••••••••••' + key.slice(-4);
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                    API Keys <BYOKIcon />
                </h2>
                <p className="text-muted-foreground text-xs leading-relaxed">
                    Keys are stored locally in your browser and never sent to our servers.
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {apiKeyList.map(apiKey => (
                    <div
                        key={apiKey.key}
                        className={`border-border/70 bg-gradient-to-br ${apiKey.color} rounded-xl border p-4`}
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`size-2 rounded-full ${apiKey.dot}`} />
                                <span className="text-sm font-semibold">{apiKey.name}</span>
                            </div>
                            <a
                                href={apiKey.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand text-xs hover:underline"
                            >
                                Get key →
                            </a>
                        </div>

                        <div className="flex items-center gap-2">
                            {isEditing === apiKey.key ? (
                                <>
                                    <div className="flex-1">
                                        <Input
                                            value={apiKey.value || ''}
                                            placeholder={`Enter ${apiKey.name} API key`}
                                            className="h-8 text-sm"
                                            onChange={e => setApiKey(apiKey.key, e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={() => handleSave(apiKey.key, apiKey.value || '')}
                                    >
                                        Save
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="bg-background/60 flex flex-1 items-center gap-2 rounded-lg border px-3 py-1.5">
                                        {apiKey.value ? (
                                            <span className="font-mono text-xs flex-1">
                                                {getMaskedKey(apiKey.value)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground flex-1 text-xs">
                                                No key set
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        variant={'bordered'}
                                        size="sm"
                                        className="shrink-0"
                                        onClick={() => setIsEditing(apiKey.key)}
                                    >
                                        {apiKey.value ? 'Change' : 'Add'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MAX_CHAR_LIMIT = 6000;

export const PersonalizationSettings = () => {
    const customInstructions = useChatStore(state => state.customInstructions);
    const setCustomInstructions = useChatStore(state => state.setCustomInstructions);

    const { editor } = useChatEditor({
        charLimit: MAX_CHAR_LIMIT,
        defaultContent: customInstructions,
        placeholder: 'Enter your custom instructions',
        enableEnter: true,
        onUpdate(props: { editor: Editor }) {
            setCustomInstructions(props.editor.getText());
        },
    });

    return (
        <div className="flex flex-col gap-6 pb-3">
            {/* Theme picker */}
            <ThemePicker />

            {/* Custom instructions */}
            <div className="border-border/60 flex flex-col gap-2 border-t pt-5">
                <div>
                    <h3 className="text-sm font-semibold">Custom AI Instructions</h3>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                        These instructions are prepended to every conversation.
                    </p>
                </div>
                <div className="border-border/70 shadow-subtle-sm mt-1 rounded-xl border p-3">
                    <ChatEditor editor={editor} />
                </div>
            </div>
        </div>
    );
};
