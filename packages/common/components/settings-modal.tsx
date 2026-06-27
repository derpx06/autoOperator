'use client';
import { useMcpToolsStore } from '@repo/common/store';
import { DialogFooter } from '@repo/ui';
import { Button } from '@repo/ui/src/components/button';
import { IconKey, IconSettings2, IconTrash } from '@tabler/icons-react';

import { Badge, Dialog, DialogContent, Input } from '@repo/ui';

import { useChatEditor } from '@repo/common/hooks';
import { Editor } from '@tiptap/react';
import { useState } from 'react';
import { SETTING_TABS, useAppStore } from '../store/app.store';
import { useChatStore } from '../store/chat.store';
import { ChatEditor } from './chat-input';
import { BYOKIcon, ToolIcon } from './icons';
import { ThemePicker } from './theme-toggle';
import {
    getProviderConfigs,
    saveProviderConfig,
    getDefaultProvider,
    setDefaultProvider,
    getDefaultModel,
    setDefaultModel,
    syncModels,
    testProvider,
    providerRegistry,
    ProviderConfig,
    ProviderType,
    maskApiKey
} from '@repo/ai/providers';
import {
    IconCheck,
    IconEye,
    IconEyeOff,
    IconLoader2,
    IconPlus,
    IconRefresh,
    IconSearch,
    IconX,
    IconPlug,
    IconAlertCircle,
    IconChevronDown,
    IconChevronUp,
    IconStar
} from '@tabler/icons-react';

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
            title: 'Providers',
            key: SETTING_TABS.PROVIDERS,
            component: <ProvidersSettings />,
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

export const ProvidersSettings = () => {
    const [configs, setConfigs] = useState<ProviderConfig[]>(() => getProviderConfigs());
    const [search, setSearch] = useState('');
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
    const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
    const [testingProvider, setTestingProvider] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, string>>({});
    const [newModelNames, setNewModelNames] = useState<Record<string, string>>({});
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

    const [defaultProvider, setDefProvider] = useState<string>(() => getDefaultProvider() || 'google');
    const [defaultModel, setDefModel] = useState<string>(() => getDefaultModel() || 'gemini-2.0-flash');

    const updateStore = useChatStore(state => state.setSelectedProviderId);
    const updateStoreModel = useChatStore(state => state.setSelectedModelId);

    const handleToggleEnable = (providerId: string, enabled: boolean) => {
        const config = configs.find(c => c.id === providerId);
        if (!config) return;
        const updated = { ...config, enabled, updatedAt: Date.now() };
        saveProviderConfig(updated);
        setConfigs(getProviderConfigs());
    };

    const handleSaveField = (providerId: string, field: 'apiKey' | 'baseUrl', value: string) => {
        const config = configs.find(c => c.id === providerId);
        if (!config) return;
        const updated = { ...config, [field]: value, updatedAt: Date.now() };
        saveProviderConfig(updated);
        setConfigs(getProviderConfigs());
    };

    const handleSync = async (providerId: string) => {
        const config = configs.find(c => c.id === providerId);
        if (!config) return;
        setSyncingProvider(providerId);
        try {
            const synced = await syncModels(config);
            const updated = {
                ...config,
                models: synced,
                defaultModel: synced[0] || config.defaultModel,
                updatedAt: Date.now()
            };
            saveProviderConfig(updated);
            setConfigs(getProviderConfigs());
            setTestResults(prev => ({ ...prev, [providerId]: `Synced ${synced.length} models` }));
        } catch (e: any) {
            setTestResults(prev => ({ ...prev, [providerId]: `Sync failed: ${e.message || e}` }));
        } finally {
            setSyncingProvider(null);
        }
    };

    const handleTest = async (providerId: string) => {
        const config = configs.find(c => c.id === providerId);
        if (!config) return;
        setTestingProvider(providerId);
        try {
            const testModelId = config.defaultModel || config.models[0] || '';
            const res = await testProvider(config, testModelId);
            setTestResults(prev => ({ ...prev, [providerId]: `Status: ${res}` }));
        } catch (e: any) {
            setTestResults(prev => ({ ...prev, [providerId]: `Status: Error - ${e.message || e}` }));
        } finally {
            setTestingProvider(null);
        }
    };

    const handleAddModel = (providerId: string) => {
        const name = newModelNames[providerId]?.trim();
        if (!name) return;
        const config = configs.find(c => c.id === providerId);
        if (!config) return;
        if (config.models.includes(name)) return;
        const updated = {
            ...config,
            models: [...config.models, name],
            updatedAt: Date.now()
        };
        saveProviderConfig(updated);
        setConfigs(getProviderConfigs());
        setNewModelNames(prev => ({ ...prev, [providerId]: '' }));
    };

    const handleDeleteModel = (providerId: string, model: string) => {
        const config = configs.find(c => c.id === providerId);
        if (!config) return;
        const updated = {
            ...config,
            models: config.models.filter((m: string) => m !== model),
            updatedAt: Date.now()
        };
        saveProviderConfig(updated);
        setConfigs(getProviderConfigs());
    };

    const handleSetDefaultProvider = (providerId: string) => {
        setDefaultProvider(providerId);
        setDefProvider(providerId);
        // Fallback default model for the new default provider
        const config = configs.find(c => c.id === providerId);
        if (config) {
            const model = config.defaultModel || config.models[0] || '';
            setDefaultModel(model);
            setDefModel(model);
            updateStoreModel(model);
        }
        updateStore(providerId);
    };

    const handleSetDefaultModel = (model: string) => {
        setDefaultModel(model);
        setDefModel(model);
        updateStoreModel(model);
    };

    const toggleShowKey = (providerId: string) => {
        setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
    };

    // Filter providers
    const filteredConfigs = configs.filter(config =>
        config.name.toLowerCase().includes(search.toLowerCase()) ||
        config.type.toLowerCase().includes(search.toLowerCase())
    );

    // Get current default provider models
    const defaultProviderConfig = configs.find(c => c.id === defaultProvider);
    const availableDefaultModels = defaultProviderConfig?.models || [];

    return (
        <div className="flex flex-col gap-6 pb-6">
            <div className="flex flex-col gap-1">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                    BYOK Provider Hub <BYOKIcon />
                </h2>
                <p className="text-muted-foreground text-xs leading-relaxed">
                    Configure your AI provider credentials. API keys are stored only in your browser database and never logged.
                </p>
            </div>

            {/* Global Default Config */}
            <div className="bg-secondary/40 border-border/80 flex flex-col gap-4 rounded-2xl border p-4">
                <h3 className="text-sm font-semibold tracking-tight">Global Workspace Defaults</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-muted-foreground text-xs font-medium">Default Provider</label>
                        <select
                            value={defaultProvider}
                            onChange={(e) => handleSetDefaultProvider(e.target.value)}
                            className="bg-background border-border text-foreground h-9 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                            {configs.filter(c => c.enabled).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-muted-foreground text-xs font-medium">Default Model</label>
                        <select
                            value={defaultModel}
                            onChange={(e) => handleSetDefaultModel(e.target.value)}
                            className="bg-background border-border text-foreground h-9 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                            {availableDefaultModels.map((m: string) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Search and List */}
            <div className="flex flex-col gap-3">
                <div className="relative">
                    <IconSearch size={15} className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search AI providers..."
                        className="pl-9 h-9 text-sm"
                    />
                </div>

                <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                    {filteredConfigs.map(config => {
                        const isExpanded = expandedProvider === config.id;
                        const isEnabled = config.enabled;
                        const registryEntry = providerRegistry[config.type];

                        return (
                            <div
                                key={config.id}
                                className={`border border-border/70 rounded-xl transition-all duration-200 ${
                                    isEnabled ? 'bg-secondary/20' : 'bg-secondary/5 opacity-70'
                                }`}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-3.5">
                                    <div
                                        className="flex flex-1 items-center gap-3 cursor-pointer select-none"
                                        onClick={() => setExpandedProvider(isExpanded ? null : config.id)}
                                    >
                                        <div className="bg-brand/10 text-brand flex size-8 items-center justify-center rounded-lg">
                                            <IconPlug size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold flex items-center gap-2">
                                                {config.name}
                                                {defaultProvider === config.id && (
                                                    <span className="text-[10px] font-medium bg-brand/15 text-brand px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                        <IconStar size={10} className="fill-brand" /> Default
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">
                                                {config.isLocal ? 'Local Provider' : 'BYOK Cloud'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleToggleEnable(config.id, !isEnabled)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                isEnabled ? 'bg-brand' : 'bg-muted'
                                            }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block size-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                                                    isEnabled ? 'translate-x-4' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                        <button
                                            onClick={() => setExpandedProvider(isExpanded ? null : config.id)}
                                            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                                        >
                                            {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Body */}
                                {isExpanded && (
                                    <div className="border-t border-border/50 p-4 flex flex-col gap-4 bg-background/50 rounded-b-xl">
                                        {/* API Key */}
                                        {registryEntry?.requiresApiKey && (
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-semibold">API Key</label>
                                                    {registryEntry.requiresApiKey && (
                                                        <span className="text-[10px] text-muted-foreground">Required</span>
                                                    )}
                                                </div>
                                                <div className="relative flex items-center">
                                                    <Input
                                                        type={showKeys[config.id] ? 'text' : 'password'}
                                                        value={config.apiKey || ''}
                                                        onChange={(e) => handleSaveField(config.id, 'apiKey', e.target.value)}
                                                        placeholder="Enter your API key"
                                                        className="h-8 text-xs pr-8"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleShowKey(config.id)}
                                                        className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                                                    >
                                                        {showKeys[config.id] ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Base URL */}
                                        {registryEntry?.supportsBaseUrl && (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold">Base URL</label>
                                                <Input
                                                    type="text"
                                                    value={config.baseUrl || ''}
                                                    onChange={(e) => handleSaveField(config.id, 'baseUrl', e.target.value)}
                                                    placeholder={registryEntry.defaultBaseUrl || 'http://localhost:8080'}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        )}

                                        {/* Model management */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-semibold">Models</label>
                                            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto border border-border/40 p-2 rounded-lg bg-background/30 no-scrollbar">
                                                {config.models.map((m: string) => (
                                                    <span
                                                        key={m}
                                                        className="inline-flex items-center gap-1 bg-secondary/80 text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-md border border-border/30"
                                                    >
                                                        {m}
                                                        <button
                                                            onClick={() => handleDeleteModel(config.id, m)}
                                                            className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                                                        >
                                                            <IconX size={10} />
                                                        </button>
                                                    </span>
                                                ))}
                                                {config.models.length === 0 && (
                                                    <span className="text-muted-foreground text-[10px] italic">No models configured</span>
                                                )}
                                            </div>

                                            {/* Add/Sync buttons */}
                                            <div className="flex gap-2 items-center mt-1">
                                                <div className="flex-1 relative flex items-center">
                                                    <Input
                                                        type="text"
                                                        value={newModelNames[config.id] || ''}
                                                        onChange={(e) => setNewModelNames(prev => ({ ...prev, [config.id]: e.target.value }))}
                                                        placeholder="Add custom model ID..."
                                                        className="h-8 text-xs pr-8"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleAddModel(config.id);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleAddModel(config.id)}
                                                        className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 transition-colors p-0.5"
                                                    >
                                                        <IconPlus size={14} />
                                                    </button>
                                                </div>

                                                {registryEntry?.supportsModelSync && (
                                                    <Button
                                                        variant="bordered"
                                                        size="xs"
                                                        className="h-8 rounded-lg shrink-0 px-2.5"
                                                        onClick={() => handleSync(config.id)}
                                                        disabled={syncingProvider === config.id}
                                                    >
                                                        {syncingProvider === config.id ? (
                                                            <IconLoader2 size={12} className="animate-spin mr-1" />
                                                        ) : (
                                                            <IconRefresh size={12} className="mr-1" />
                                                        )}
                                                        Sync
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Testing Connection */}
                                        <div className="border-t border-border/30 pt-3.5 flex items-center justify-between gap-4">
                                            <Button
                                                variant="bordered"
                                                size="xs"
                                                className="h-7 rounded-lg"
                                                onClick={() => handleTest(config.id)}
                                                disabled={testingProvider === config.id}
                                            >
                                                {testingProvider === config.id ? (
                                                    <IconLoader2 size={12} className="animate-spin mr-1" />
                                                ) : (
                                                    <IconPlug size={12} className="mr-1" />
                                                )}
                                                Test Connection
                                            </Button>

                                            {testResults[config.id] && (
                                                <span className={`text-[10px] font-semibold flex items-center gap-1.5 ${
                                                    testResults[config.id].includes('Connected') || testResults[config.id].includes('Synced')
                                                        ? 'text-emerald-500'
                                                        : 'text-rose-500'
                                                }`}>
                                                    {testResults[config.id].includes('Connected') || testResults[config.id].includes('Synced') ? (
                                                        <IconCheck size={12} />
                                                    ) : (
                                                        <IconAlertCircle size={12} />
                                                    )}
                                                    {testResults[config.id]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
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
