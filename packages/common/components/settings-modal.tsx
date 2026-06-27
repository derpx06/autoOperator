'use client';
import { useMcpToolsStore, useMemoryStore } from '@repo/common/store';
import { DialogFooter } from '@repo/ui';
import { Button } from '@repo/ui/src/components/button';
import { IconKey, IconSettings2, IconTrash } from '@tabler/icons-react';

import { Badge, Dialog, DialogContent, Input } from '@repo/ui';

import { useChatEditor } from '@repo/common/hooks';
import { Editor } from '@tiptap/react';
import { useEffect, useMemo, useState } from 'react';
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
import { MemoryScope, MemoryType } from '@repo/ai/memory';
import {
    ComposioConnectorConfig,
    ComposioTool,
    getComposioConfig,
    maskComposioApiKey,
    saveComposioConfig,
    saveComposioTools,
} from '@repo/ai/connectors';
import {
    SearchProviderConfig,
    getDefaultSearchProvider,
    getSearchProviderConfigs,
    maskApiKey as maskSearchApiKey,
    saveSearchProviderConfig,
    searchProviderRegistry,
    setDefaultSearchProvider,
    testSearchProvider,
} from '@repo/ai/search';
import { MCPServerConfig, MCPTransportType } from '@repo/ai/tools';
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
    IconStar,
    IconBrain,
    IconDatabase,
    IconShieldLock,
    IconWorldSearch,
    IconLink
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
        {
            icon: <IconWorldSearch size={15} strokeWidth={2} />,
            title: 'Search',
            key: SETTING_TABS.SEARCH,
            component: <SearchSettings />,
        },
        {
            icon: <IconLink size={15} strokeWidth={2} />,
            title: 'Connectors',
            key: SETTING_TABS.CONNECTORS,
            component: <ConnectorsSettings />,
        },
        {
            icon: <IconPlug size={15} strokeWidth={2} />,
            title: 'MCP Tools',
            key: SETTING_TABS.MCP_TOOLS,
            component: <MCPSettings />,
        },
        {
            icon: <IconBrain size={15} strokeWidth={2} />,
            title: 'Memory',
            key: SETTING_TABS.MEMORY,
            component: <MemorySettings />,
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
    const [search, setSearch] = useState('');
    const [registryServers, setRegistryServers] = useState<any[]>([]);
    const [registryStats, setRegistryStats] = useState({ total: 0, remoteCount: 0, packageOnlyCount: 0 });
    const [isSearching, setIsSearching] = useState(false);
    const [selectedRegistryServer, setSelectedRegistryServer] = useState<any | null>(null);
    const [manualName, setManualName] = useState('');
    const [manualUrl, setManualUrl] = useState('');
    const [manualTransport, setManualTransport] = useState<MCPTransportType>('streamable-http');
    const [manualError, setManualError] = useState('');
    const { servers, addServer, updateServer, removeServer } = useMcpToolsStore();

    useEffect(() => {
        const controller = new AbortController();
        setIsSearching(true);
        const timeout = window.setTimeout(async () => {
            try {
                const response = await fetch(
                    `/api/mcp/registry/search?q=${encodeURIComponent(search)}`,
                    { signal: controller.signal }
                );
                const data = await response.json();
                setRegistryServers(data.servers || []);
                setRegistryStats({
                    total: data.total || data.servers?.length || 0,
                    remoteCount: data.remoteCount || 0,
                    packageOnlyCount: data.packageOnlyCount || 0,
                });
            } catch (error: any) {
                if (error.name !== 'AbortError') setRegistryServers([]);
            } finally {
                setIsSearching(false);
            }
        }, 250);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [search]);

    const connectedNames = useMemo(
        () => new Set(servers.map(server => server.name.toLowerCase())),
        [servers]
    );
    const popularSearches = ['github', 'google', 'drive', 'slack', 'notion', 'linear'];

    const createManualServer = async () => {
        const name = manualName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (!name) {
            setManualError('Server name is required');
            return;
        }
        if (!manualUrl.trim()) {
            setManualError('Server URL is required');
            return;
        }
        if (connectedNames.has(name)) {
            setManualError('A server with this name already exists');
            return;
        }

        addServer({
            id: name,
            name,
            title: manualName.trim(),
            url: manualUrl.trim(),
            transport: manualTransport,
            enabled: true,
            source: 'manual',
        });
        setManualName('');
        setManualUrl('');
        setManualError('');
    };

    const testServer = async (server: MCPServerConfig) => {
        updateServer(server.id, { lastTestedAt: Date.now() });
        const response = await fetch('/api/mcp/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ server }),
        });
        const result = await response.json();
        if (result.ok) {
            updateServer(server.id, {
                toolCount: result.tools?.length || 0,
                lastTestedAt: Date.now(),
            });
        }
        return result;
    };

    return (
        <div className="flex w-full flex-col gap-6 overflow-x-hidden pb-6">
            <div className="flex flex-col">
                <h2 className="flex items-center gap-1 text-base font-medium">MCP Tools</h2>
                <p className="text-muted-foreground text-xs">
                    Discover public MCP servers, configure remote connections, and choose which tools are available in chat.
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <p className="text-muted-foreground text-xs font-medium">Discover Servers</p>
                        <Badge variant="outline">{registryStats.remoteCount} remote</Badge>
                        <Badge variant="outline">{registryStats.packageOnlyCount} local packages</Badge>
                    </div>
                    {isSearching && <IconLoader2 size={14} className="animate-spin text-muted-foreground" />}
                </div>
                <div className="relative">
                    <IconSearch size={15} className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search official MCP registry..."
                        className="h-9 pl-9 text-sm"
                    />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {popularSearches.map(term => (
                        <Button key={term} size="xs" variant="bordered" rounded="full" onClick={() => setSearch(term)}>
                            {term}
                        </Button>
                    ))}
                </div>
                <p className="text-muted-foreground text-xs">
                    Remote servers can be added directly. Local package servers like many GitHub, Google Drive, and desktop integrations use stdio/OAuth and are shown for install reference.
                </p>
                <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
                    {registryServers.map(server => {
                        const remote = server.remotes?.[0];
                        const addable = !!remote?.url;
                        const firstPackage = server.packages?.[0];
                        return (
                            <div key={`${server.name}-${server.version}`} className="border-border/70 bg-secondary/20 rounded-xl border p-3">
                                <div className="flex items-start gap-3">
                                    <ToolIcon />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-medium">{server.title}</p>
                                            {remote?.type && <Badge variant="secondary">{remote.type}</Badge>}
                                            {firstPackage && <Badge variant="outline">{firstPackage.registryType || 'package'}</Badge>}
                                            {!addable && <Badge variant="outline">Local stdio</Badge>}
                                        </div>
                                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{server.description || server.name}</p>
                                        {!addable && firstPackage && (
                                            <p className="text-muted-foreground mt-1 truncate font-mono text-[11px]">
                                                {firstPackage.identifier}{firstPackage.version ? `@${firstPackage.version}` : ''} via {firstPackage.transport || 'stdio'}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        size="xs"
                                        rounded="full"
                                        variant={addable ? 'default' : 'bordered'}
                                        disabled={!addable}
                                        onClick={() => setSelectedRegistryServer(server)}
                                    >
                                        {addable ? 'Configure' : 'Local only'}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                    {!isSearching && registryServers.length === 0 && (
                        <div className="border-border/70 text-muted-foreground rounded-xl border border-dashed p-5 text-center text-sm">
                            No registry servers found.
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-medium">Connected Servers <Badge variant="secondary">{servers.length}</Badge></p>
                {servers.map(server => (
                    <div key={server.id} className="border-border/70 bg-secondary/20 rounded-xl border p-3">
                        <div className="flex items-center gap-2">
                            <ToolIcon />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{server.title || server.name}</p>
                                <p className="text-muted-foreground truncate text-xs">{server.url}</p>
                            </div>
                            <Badge variant="secondary">{server.transport}</Badge>
                            {typeof server.toolCount === 'number' && <Badge variant="outline">{server.toolCount} tools</Badge>}
                            <Button
                                size="xs"
                                variant={server.enabled ? 'secondary' : 'bordered'}
                                rounded="full"
                                onClick={() => updateServer(server.id, { enabled: !server.enabled })}
                            >
                                {server.enabled ? 'Enabled' : 'Disabled'}
                            </Button>
                            <Button size="xs" variant="ghost" rounded="full" onClick={() => testServer(server)}>
                                Test
                            </Button>
                            <Button size="xs" variant="ghost" tooltip="Delete Server" onClick={() => removeServer(server.id)}>
                                <IconTrash size={14} strokeWidth={2} />
                            </Button>
                        </div>
                    </div>
                ))}
                {servers.length === 0 && (
                    <div className="border-border/70 text-muted-foreground rounded-xl border border-dashed p-5 text-center text-sm">
                        No MCP servers connected.
                    </div>
                )}
            </div>

            <div className="border-border/70 bg-secondary/20 flex flex-col gap-3 rounded-xl border p-4">
                <p className="text-sm font-medium">Manual Server</p>
                {manualError && <p className="text-destructive text-xs">{manualError}</p>}
                <div className="grid grid-cols-[1fr_1fr_150px_auto] gap-2">
                    <Input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Server name" className="h-9" />
                    <Input value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="https://server.example/mcp" className="h-9" />
                    <select
                        value={manualTransport}
                        onChange={e => setManualTransport(e.target.value as MCPTransportType)}
                        className="bg-background border-border text-foreground h-9 rounded-lg border px-2 text-sm"
                    >
                        <option value="streamable-http">Streamable HTTP</option>
                        <option value="sse">SSE</option>
                    </select>
                    <Button rounded="full" size="sm" onClick={createManualServer}>Add</Button>
                </div>
            </div>

            <ConfigureRegistryServerDialog
                server={selectedRegistryServer}
                existingNames={connectedNames}
                onOpenChange={open => !open && setSelectedRegistryServer(null)}
                onAdd={addServer}
            />
        </div>
    );
};

const ConfigureRegistryServerDialog = ({
    server,
    existingNames,
    onOpenChange,
    onAdd,
}: {
    server: any | null;
    existingNames: Set<string>;
    onOpenChange: (open: boolean) => void;
    onAdd: (server: MCPServerConfig) => void;
}) => {
    const remote = server?.remotes?.[0];
    const [headers, setHeaders] = useState<Record<string, string>>({});
    const [testResult, setTestResult] = useState<string>('');
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        setHeaders({});
        setTestResult('');
    }, [server?.name]);

    if (!server || !remote) return null;

    const id = server.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const config: MCPServerConfig = {
        id,
        name: id,
        title: server.title,
        url: remote.url,
        transport: remote.type,
        enabled: true,
        source: 'registry',
        headers: Object.fromEntries(Object.entries(headers).filter(([, value]) => value.trim())),
        registryName: server.name,
        registryVersion: server.version,
        description: server.description,
    };

    const missingRequiredHeader = (remote.headers || []).some(
        (header: any) => header.required && !headers[header.name]?.trim()
    );

    const handleTest = async () => {
        if (missingRequiredHeader) {
            setTestResult('Fill required headers before testing.');
            return;
        }
        setIsTesting(true);
        setTestResult('');
        try {
            const response = await fetch('/api/mcp/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ server: config }),
            });
            const result = await response.json();
            setTestResult(result.ok ? `Connected: ${result.tools?.length || 0} tools` : result.error || 'Connection failed');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Dialog open={!!server} onOpenChange={onOpenChange}>
            <DialogContent ariaTitle="Configure MCP Server" className="!max-w-md rounded-2xl">
                <div className="flex flex-col gap-4">
                    <div>
                        <h3 className="text-lg font-bold">{server.title}</h3>
                        <p className="text-muted-foreground text-sm">{server.description}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Remote URL</label>
                        <Input value={remote.url} readOnly />
                    </div>

                    {(remote.headers || []).map((header: any) => (
                        <div key={header.name} className="flex flex-col gap-2">
                            <label className="text-sm font-medium">{header.name}</label>
                            <Input
                                type={header.secret ? 'password' : 'text'}
                                value={headers[header.name] || ''}
                                onChange={e => setHeaders(prev => ({ ...prev, [header.name]: e.target.value }))}
                                placeholder={header.placeholder || header.description || header.name}
                            />
                            {header.description && <p className="text-muted-foreground text-xs">{header.description}</p>}
                        </div>
                    ))}

                    {existingNames.has(id) && <p className="text-destructive text-sm">This server is already connected.</p>}
                    {testResult && <p className="text-muted-foreground text-sm">{testResult}</p>}
                </div>
                <DialogFooter className="border-border mt-4 border-t pt-4">
                    <div className="flex justify-end gap-2">
                        <Button variant="bordered" rounded="full" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button variant="bordered" rounded="full" onClick={handleTest} disabled={isTesting}>
                            {isTesting && <IconLoader2 size={14} className="animate-spin" />}
                            Test Connection
                        </Button>
                        <Button
                            onClick={() => {
                                onAdd(config);
                                onOpenChange(false);
                            }}
                            rounded="full"
                            disabled={existingNames.has(id) || missingRequiredHeader}
                        >
                            Add Server
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export const MemorySettings = () => {
    const {
        memories,
        settings,
        loadMemories,
        updateSettings,
        addManualMemory,
        updateMemory,
        resolveConflict,
        deleteMemory,
        clearMemories,
        exportMemories,
    } = useMemoryStore();
    const currentThread = useChatStore(state => state.currentThread);
    const [filter, setFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | MemoryType>('all');
    const [scopeFilter, setScopeFilter] = useState<'all' | MemoryScope>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
    const [manualContent, setManualContent] = useState('');
    const [manualType, setManualType] = useState<MemoryType>('preference');
    const [manualScope, setManualScope] = useState<MemoryScope>('global');
    const [manualMessage, setManualMessage] = useState('');
    const [sourceMemoryId, setSourceMemoryId] = useState<string | null>(null);
    const [editing, setEditing] = useState<Record<string, string>>({});

    useEffect(() => {
        loadMemories();
    }, [loadMemories]);

    useEffect(() => {
        if (manualScope === 'project' && !currentThread?.projectId) {
            setManualScope('global');
        }
    }, [currentThread?.projectId, manualScope]);

    const activeCount = memories.filter(memory => memory.status === 'active').length;
    const disabledCount = memories.filter(memory => memory.status === 'disabled' || memory.status === 'archived').length;
    const conflictCount = memories.filter(memory => memory.status === 'conflict').length;
    const lastLearned = memories[0]?.updatedAt;
    const filtered = memories.filter(memory => {
        if (typeFilter !== 'all' && memory.type !== typeFilter) return false;
        if (scopeFilter !== 'all' && (memory.scope || 'global') !== scopeFilter) return false;
        if (statusFilter !== 'all' && memory.status !== statusFilter) return false;
        if (!filter.trim()) return true;
        const haystack = `${memory.type} ${memory.status} ${memory.scope || 'global'} ${memory.content} ${memory.tags.join(' ')} ${memory.keywords.join(' ')}`.toLowerCase();
        return haystack.includes(filter.toLowerCase());
    });
    const conflicts = filtered.filter(memory => memory.status === 'conflict');
    const visibleMemories = filtered.filter(memory => memory.status !== 'conflict');
    const groups = {
        style: visibleMemories.filter(memory => memory.type === 'style'),
        preference: visibleMemories.filter(memory => memory.type === 'preference'),
        fact: visibleMemories.filter(memory => memory.type === 'fact'),
        instruction: visibleMemories.filter(memory => memory.type === 'instruction'),
    };
    const sourceMemory = sourceMemoryId ? memories.find(memory => memory.id === sourceMemoryId) : null;

    const downloadExport = () => {
        const blob = new Blob([exportMemories()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `llmchat-memories-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const handleManualSave = async () => {
        setManualMessage('');
        const record = await addManualMemory({
            content: manualContent,
            type: manualType,
            scope: manualScope,
            scopeThreadId: currentThread?.id,
            scopeProjectId: currentThread?.projectId,
        });
        if (!record) {
            setManualMessage('Memory was not saved. Avoid empty text or secrets like keys, tokens, and passwords.');
            return;
        }
        setManualContent('');
        setManualMessage(record.status === 'conflict' ? 'Saved for conflict review.' : 'Memory saved.');
    };

    const renderMemory = (memory: (typeof memories)[number]) => {
        const draft = editing[memory.id] ?? memory.content;
        const isEditing = memory.id in editing;
        const conflictTargets = (memory.conflictsWith || [])
            .map(id => memories.find(item => item.id === id))
            .filter(Boolean);
        return (
            <div key={memory.id} className="border-border/70 bg-secondary/20 rounded-xl border p-3">
                <div className="flex items-start gap-3">
                    <IconDatabase size={15} className="text-muted-foreground mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                        {isEditing ? (
                            <textarea
                                value={draft}
                                onChange={e => setEditing(prev => ({ ...prev, [memory.id]: e.target.value }))}
                                className="bg-background border-border text-foreground min-h-16 w-full rounded-lg border p-2 text-sm"
                            />
                        ) : (
                            <p className="text-sm leading-relaxed">{memory.content}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge variant={memory.status === 'active' ? 'secondary' : memory.status === 'conflict' ? 'destructive' : 'outline'}>
                                {memory.status}
                            </Badge>
                            <Badge variant="outline">{memory.scope || 'global'}</Badge>
                            <Badge variant="outline">{Math.round(memory.confidence * 100)}%</Badge>
                            <Badge variant="outline">{memory.sourceType === 'manual' ? 'manual' : 'chat'}</Badge>
                            {memory.tags.slice(0, 4).map(tag => (
                                <Badge key={tag} variant="outline">{tag}</Badge>
                            ))}
                            {memory.lastUsedAt && (
                                <span className="text-muted-foreground text-[11px]">
                                    used {memory.useCount}x
                                </span>
                            )}
                        </div>
                        {memory.status === 'conflict' && (
                            <div className="border-border/70 mt-3 rounded-lg border border-dashed p-3">
                                <p className="text-muted-foreground text-xs">
                                    {memory.conflictReason || 'This memory conflicts with an existing memory.'}
                                </p>
                                {conflictTargets.map(target => target && (
                                    <p key={target.id} className="mt-2 text-xs">
                                        Existing: {target.content}
                                    </p>
                                ))}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button size="xs" rounded="full" variant="bordered" onClick={() => resolveConflict(memory.id, 'keep-existing')}>
                                        Keep existing
                                    </Button>
                                    <Button size="xs" rounded="full" onClick={() => resolveConflict(memory.id, 'use-new')}>
                                        Use new
                                    </Button>
                                    <Button size="xs" rounded="full" variant="ghost" onClick={() => resolveConflict(memory.id, 'delete-new')}>
                                        Delete new
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                        <Button
                            size="xs"
                            variant="ghost"
                            rounded="full"
                            onClick={() => setSourceMemoryId(memory.id)}
                        >
                            Source
                        </Button>
                        {isEditing ? (
                            <Button
                                size="xs"
                                rounded="full"
                                onClick={() => {
                                    updateMemory(memory.id, { content: draft });
                                    setEditing(prev => {
                                        const next = { ...prev };
                                        delete next[memory.id];
                                        return next;
                                    });
                                }}
                            >
                                Save
                            </Button>
                        ) : (
                            <Button
                                size="xs"
                                variant="ghost"
                                rounded="full"
                                onClick={() => setEditing(prev => ({ ...prev, [memory.id]: memory.content }))}
                            >
                                Edit
                            </Button>
                        )}
                        <Button
                            size="xs"
                            variant="ghost"
                            rounded="full"
                            disabled={memory.status === 'conflict'}
                            onClick={() =>
                                updateMemory(memory.id, {
                                    status: memory.status === 'active' ? 'disabled' : 'active',
                                })
                            }
                        >
                            {memory.status === 'active' ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => deleteMemory(memory.id)}>
                            <IconTrash size={14} />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 pb-6">
            <div className="flex flex-col gap-1">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                    Memory <IconBrain size={16} className="text-brand" />
                </h2>
                <p className="text-muted-foreground text-xs leading-relaxed">
                    Local browser memory learns style, preferences, facts, and standing instructions from chats.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="border-border/70 bg-secondary/20 rounded-xl border p-3">
                    <p className="text-muted-foreground text-xs">Active</p>
                    <p className="text-xl font-semibold">{activeCount}</p>
                </div>
                <div className="border-border/70 bg-secondary/20 rounded-xl border p-3">
                    <p className="text-muted-foreground text-xs">Disabled</p>
                    <p className="text-xl font-semibold">{disabledCount}</p>
                </div>
                <div className="border-border/70 bg-secondary/20 rounded-xl border p-3">
                    <p className="text-muted-foreground text-xs">Conflicts</p>
                    <p className="text-xl font-semibold">{conflictCount}</p>
                </div>
            </div>
            <p className="text-muted-foreground text-xs">
                Last learned: {lastLearned ? new Date(lastLearned).toLocaleString() : 'Never'}
            </p>

            <div className="border-border/70 bg-secondary/20 flex flex-col gap-3 rounded-xl border p-4">
                {[
                    ['Use memory in chats', 'enabled'],
                    ['Automatically learn from chats', 'autoLearn'],
                    ['Use writing style memory', 'styleMemoryEnabled'],
                ].map(([label, key]) => (
                    <label key={key} className="flex items-center justify-between gap-3 text-sm">
                        <span>{label}</span>
                        <input
                            type="checkbox"
                            checked={Boolean(settings[key as keyof typeof settings])}
                            onChange={e => updateSettings({ [key]: e.target.checked })}
                        />
                    </label>
                ))}
                <p className="text-muted-foreground text-xs">
                    Memory is stored locally in this browser. It is not synced to a server.
                </p>
            </div>

            <div className="border-border/70 bg-secondary/20 flex flex-col gap-3 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium">Manual memory</p>
                        <p className="text-muted-foreground text-xs">Add something durable without waiting for auto-learning.</p>
                    </div>
                    <Button size="sm" rounded="full" onClick={handleManualSave}>
                        Remember
                    </Button>
                </div>
                <textarea
                    value={manualContent}
                    onChange={e => setManualContent(e.target.value)}
                    placeholder="Remember that..."
                    className="bg-background border-border text-foreground min-h-20 w-full rounded-lg border p-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                    <select
                        value={manualType}
                        onChange={e => setManualType(e.target.value as MemoryType)}
                        className="bg-background border-border h-9 rounded-lg border px-2 text-sm"
                    >
                        <option value="preference">Preference</option>
                        <option value="style">Style</option>
                        <option value="fact">Fact</option>
                        <option value="instruction">Instruction</option>
                    </select>
                    <select
                        value={manualScope}
                        onChange={e => setManualScope(e.target.value as MemoryScope)}
                        className="bg-background border-border h-9 rounded-lg border px-2 text-sm"
                    >
                        <option value="global">Global</option>
                        <option value="thread" disabled={!currentThread?.id}>Current thread</option>
                        <option value="project" disabled={!currentThread?.projectId}>Current project</option>
                    </select>
                </div>
                {manualMessage && <p className="text-muted-foreground text-xs">{manualMessage}</p>}
            </div>

            <div className="grid grid-cols-4 gap-2">
                <Input
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Search memories..."
                    className="h-9"
                />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as typeof typeFilter)} className="bg-background border-border h-9 rounded-lg border px-2 text-sm">
                    <option value="all">All types</option>
                    <option value="style">Style</option>
                    <option value="preference">Preference</option>
                    <option value="fact">Fact</option>
                    <option value="instruction">Instruction</option>
                </select>
                <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value as typeof scopeFilter)} className="bg-background border-border h-9 rounded-lg border px-2 text-sm">
                    <option value="all">All scopes</option>
                    <option value="global">Global</option>
                    <option value="thread">Thread</option>
                    <option value="project">Project</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-background border-border h-9 rounded-lg border px-2 text-sm">
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                    <option value="archived">Archived</option>
                    <option value="conflict">Conflict</option>
                </select>
            </div>

            {memories.length === 0 && (
                <div className="border-border/70 text-muted-foreground rounded-xl border border-dashed p-5 text-center text-sm">
                    No memories yet. Memory improves after you chat.
                </div>
            )}

            {conflicts.length > 0 && (
                <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        Conflicts
                    </p>
                    {conflicts.map(renderMemory)}
                </div>
            )}

            {Object.entries(groups).map(([type, items]) => (
                items.length > 0 && (
                    <div key={type} className="flex flex-col gap-2">
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                            {type}
                        </p>
                        {items.map(renderMemory)}
                    </div>
                )
            ))}

            <div className="border-border/70 flex items-center justify-between rounded-xl border border-dashed p-4">
                <div className="flex items-center gap-2">
                    <IconShieldLock size={16} className="text-muted-foreground" />
                    <p className="text-sm">Privacy controls</p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" rounded="full" variant="bordered" onClick={downloadExport}>
                        Export JSON
                    </Button>
                    <Button size="sm" rounded="full" variant="bordered" onClick={clearMemories}>
                        Clear all
                    </Button>
                </div>
            </div>

            <Dialog open={Boolean(sourceMemory)} onOpenChange={open => !open && setSourceMemoryId(null)}>
                <DialogContent ariaTitle="Memory source" className="max-w-md rounded-2xl">
                    <div className="flex flex-col gap-3">
                        <h3 className="text-base font-semibold">Memory source</h3>
                        {sourceMemory && (
                            <>
                                <p className="text-sm">{sourceMemory.content}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    <Badge variant="outline">{sourceMemory.sourceType === 'manual' ? 'Added manually' : 'Learned from chat'}</Badge>
                                    <Badge variant="outline">{sourceMemory.scope || 'global'}</Badge>
                                    <Badge variant="outline">{new Date(sourceMemory.createdAt).toLocaleString()}</Badge>
                                </div>
                                {sourceMemory.sourceType === 'manual' ? (
                                    <p className="text-muted-foreground text-sm">This memory was typed directly in the Memory tab.</p>
                                ) : (
                                    <div className="flex flex-col gap-2 text-sm">
                                        <p className="text-muted-foreground">Thread: {sourceMemory.sourceThreadId || 'Unknown'}</p>
                                        {sourceMemory.sourceQueryPreview && <p>User: {sourceMemory.sourceQueryPreview}</p>}
                                        {sourceMemory.sourceAnswerPreview && <p>Assistant: {sourceMemory.sourceAnswerPreview}</p>}
                                        {sourceMemory.sourceThreadId && (
                                            <Button
                                                size="sm"
                                                rounded="full"
                                                variant="bordered"
                                                onClick={() => {
                                                    window.location.href = `/chat/${sourceMemory.sourceThreadId}`;
                                                }}
                                            >
                                                Open thread
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export const SearchSettings = () => {
    const [configs, setConfigs] = useState<SearchProviderConfig[]>(() => getSearchProviderConfigs());
    const [defaultProvider, setDefaultProviderState] = useState(() => getDefaultSearchProvider() || 'tavily');
    const [search, setSearch] = useState('');
    const [expandedProvider, setExpandedProvider] = useState<string | null>('tavily');
    const [testingProvider, setTestingProvider] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, string>>({});
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

    const refresh = () => {
        setConfigs(getSearchProviderConfigs());
        setDefaultProviderState(getDefaultSearchProvider() || 'tavily');
    };

    const handleToggleEnable = (providerId: string, enabled: boolean) => {
        const config = configs.find(item => item.id === providerId);
        if (!config) return;
        saveSearchProviderConfig({ ...config, enabled, updatedAt: Date.now() });
        refresh();
    };

    const handleSaveField = (providerId: string, field: 'apiKey' | 'baseUrl', value: string) => {
        const config = configs.find(item => item.id === providerId);
        if (!config) return;
        saveSearchProviderConfig({ ...config, [field]: value, updatedAt: Date.now() });
        refresh();
    };

    const handleSetDefault = (providerId: string) => {
        setDefaultSearchProvider(providerId);
        setDefaultProviderState(providerId);
        refresh();
    };

    const handleTest = async (providerId: string) => {
        const config = getSearchProviderConfigs().find(item => item.id === providerId);
        if (!config) return;
        setTestingProvider(providerId);
        try {
            const result = await testSearchProvider(config);
            setTestResults(prev => ({
                ...prev,
                [providerId]: result.ok ? 'Status: Connected' : `Status: Error - ${result.error || 'Unknown error'}`,
            }));
        } finally {
            setTestingProvider(null);
        }
    };

    const filteredConfigs = configs.filter(config =>
        config.name.toLowerCase().includes(search.toLowerCase()) ||
        config.type.toLowerCase().includes(search.toLowerCase())
    );

    const enabledConfigs = configs.filter(config => config.enabled);

    return (
        <div className="flex flex-col gap-6 pb-6">
            <div className="flex flex-col gap-1">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                    Search Providers <IconWorldSearch size={16} className="text-brand" />
                </h2>
                <p className="text-muted-foreground text-xs leading-relaxed">
                    Configure BYOK web search for Quick Search, Pro Search, and Deep Research. Keys stay in this browser.
                </p>
            </div>

            <div className="bg-secondary/40 border-border/80 flex flex-col gap-4 rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold tracking-tight">Default Search Provider</h3>
                        <p className="text-muted-foreground text-xs">
                            Tavily is recommended for AI search. Serper keeps the previous Google-style behavior.
                        </p>
                    </div>
                    <Badge variant="outline">{enabledConfigs.length} enabled</Badge>
                </div>
                <select
                    value={defaultProvider}
                    onChange={e => handleSetDefault(e.target.value)}
                    className="bg-background border-border text-foreground h-9 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                >
                    {configs.map(config => (
                        <option key={config.id} value={config.id}>
                            {config.name}{!config.enabled ? ' (disabled)' : ''}
                        </option>
                    ))}
                </select>
            </div>

            <div className="relative">
                <IconSearch size={15} className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search search providers..."
                    className="h-9 pl-9 text-sm"
                />
            </div>

            <div className="no-scrollbar flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                {filteredConfigs.map(config => {
                    const isExpanded = expandedProvider === config.id;
                    const isEnabled = config.enabled;
                    const entry = searchProviderRegistry[config.type];
                    const requiresApiKey = entry?.requiresApiKey;
                    const supportsBaseUrl = entry?.supportsBaseUrl;
                    const isDefault = defaultProvider === config.id;

                    return (
                        <div
                            key={config.id}
                            className={`border-border/70 rounded-xl border transition-all duration-200 ${
                                isEnabled ? 'bg-secondary/20' : 'bg-secondary/5 opacity-75'
                            }`}
                        >
                            <div className="flex items-center justify-between p-3.5">
                                <div
                                    className="flex flex-1 cursor-pointer select-none items-center gap-3"
                                    onClick={() => setExpandedProvider(isExpanded ? null : config.id)}
                                >
                                    <div className="bg-brand/10 text-brand flex size-8 items-center justify-center rounded-lg">
                                        <IconWorldSearch size={16} />
                                    </div>
                                    <div className="flex min-w-0 flex-col">
                                        <span className="flex items-center gap-2 text-sm font-semibold">
                                            {config.name}
                                            {entry?.recommended && <Badge variant="brand">Recommended</Badge>}
                                            {isDefault && <Badge variant="secondary">Default</Badge>}
                                        </span>
                                        <span className="text-muted-foreground truncate text-[11px]">
                                            {entry?.description}
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

                            {isExpanded && (
                                <div className="border-border/50 bg-background/50 flex flex-col gap-4 rounded-b-xl border-t p-4">
                                    <div className="flex flex-wrap gap-1.5">
                                        {entry?.capabilities.map(capability => (
                                            <Badge key={capability} variant="outline">{capability}</Badge>
                                        ))}
                                    </div>

                                    {requiresApiKey && (
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold">API Key</label>
                                                {config.apiKey && (
                                                    <span className="text-muted-foreground text-[10px]">
                                                        {maskSearchApiKey(config.apiKey)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative flex items-center">
                                                <Input
                                                    type={showKeys[config.id] ? 'text' : 'password'}
                                                    value={config.apiKey || ''}
                                                    onChange={e => handleSaveField(config.id, 'apiKey', e.target.value)}
                                                    placeholder="Enter your search API key"
                                                    className="h-8 pr-8 text-xs"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowKeys(prev => ({ ...prev, [config.id]: !prev[config.id] }))}
                                                    className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                                                >
                                                    {showKeys[config.id] ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {supportsBaseUrl && (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold">Base URL</label>
                                            <Input
                                                type="text"
                                                value={config.baseUrl || ''}
                                                onChange={e => handleSaveField(config.id, 'baseUrl', e.target.value)}
                                                placeholder={entry.defaultBaseUrl || 'https://search.example.com/search'}
                                                className="h-8 text-xs"
                                            />
                                            <p className="text-muted-foreground text-[11px]">
                                                Custom providers receive requests as <span className="font-mono">?q=...</span> and should return JSON results.
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
                                        <div className="text-muted-foreground min-h-5 text-xs">
                                            {testResults[config.id] || 'Test with a lightweight search request.'}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="bordered"
                                                size="xs"
                                                rounded="full"
                                                onClick={() => handleSetDefault(config.id)}
                                            >
                                                Set default
                                            </Button>
                                            <Button
                                                variant="bordered"
                                                size="xs"
                                                rounded="full"
                                                onClick={() => handleTest(config.id)}
                                                disabled={testingProvider === config.id}
                                            >
                                                {testingProvider === config.id && <IconLoader2 size={12} className="animate-spin" />}
                                                Test Search
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const ConnectorsSettings = () => {
    const [config, setConfig] = useState<ComposioConnectorConfig>(() => getComposioConfig());
    const [showKey, setShowKey] = useState(false);
    const [syncingApp, setSyncingApp] = useState<string | null>(null);
    const [messages, setMessages] = useState<Record<string, string>>({});

    const persist = (next: ComposioConnectorConfig) => {
        saveComposioConfig(next);
        setConfig(getComposioConfig());
    };

    const updateConfig = (patch: Partial<ComposioConnectorConfig>) => {
        persist({ ...config, ...patch, updatedAt: Date.now() });
    };

    const updateApp = (slug: string, patch: Partial<ComposioConnectorConfig['apps'][number]>) => {
        persist({
            ...config,
            apps: config.apps.map(app => app.slug === slug ? { ...app, ...patch } : app),
            updatedAt: Date.now(),
        });
    };

    const createConnectLink = async (app: ComposioConnectorConfig['apps'][number]) => {
        if (!config.apiKey?.trim()) {
            setMessages(prev => ({ ...prev, [app.slug]: 'Add your Composio API key first.' }));
            return;
        }
        if (!app.authConfigId?.trim()) {
            setMessages(prev => ({ ...prev, [app.slug]: 'Paste the Composio auth config id for this app first.' }));
            return;
        }
        setMessages(prev => ({ ...prev, [app.slug]: 'Creating connect link...' }));
        const response = await fetch('/api/connectors/composio/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: config.apiKey,
                userId: config.userId,
                authConfigId: app.authConfigId,
                callbackUrl: typeof window !== 'undefined' ? window.location.href : undefined,
            }),
        });
        const data = await response.json();
        const redirectUrl = data.redirect_url || data.redirectUrl || data.link || data.url;
        const connectedAccountId = data.connected_account_id || data.connectedAccountId || app.connectedAccountId;
        if (!response.ok || !redirectUrl) {
            setMessages(prev => ({ ...prev, [app.slug]: data.error || 'Failed to create connect link.' }));
            return;
        }
        if (connectedAccountId) {
            updateApp(app.slug, { connectedAccountId, status: 'configured' });
        }
        window.open(redirectUrl, '_blank', 'noopener,noreferrer');
        setMessages(prev => ({ ...prev, [app.slug]: 'Opened Composio OAuth link. Paste connected account id after auth if it is not auto-filled.' }));
    };

    const syncTools = async (app: ComposioConnectorConfig['apps'][number]) => {
        if (!config.apiKey?.trim()) {
            setMessages(prev => ({ ...prev, [app.slug]: 'Add your Composio API key first.' }));
            return;
        }
        setSyncingApp(app.slug);
        setMessages(prev => ({ ...prev, [app.slug]: 'Syncing tools...' }));
        try {
            const response = await fetch('/api/connectors/composio/tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: config.apiKey,
                    appSlug: app.slug,
                    connectedAccountId: app.connectedAccountId,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setMessages(prev => ({ ...prev, [app.slug]: data.error || 'Failed to sync tools.' }));
                return;
            }
            const tools = (data.tools || []) as ComposioTool[];
            const existingTools = (() => {
                try {
                    return JSON.parse(localStorage.getItem('composio-tool-config') || '[]') as ComposioTool[];
                } catch {
                    return [];
                }
            })();
            saveComposioTools([
                ...existingTools.filter(tool => tool.appSlug !== app.slug),
                ...tools.map(tool => ({
                    ...tool,
                    connectedAccountId: app.connectedAccountId,
                    enabled: true,
                })),
            ]);
            updateApp(app.slug, {
                toolCount: tools.length,
                lastSyncedAt: Date.now(),
                status: app.connectedAccountId ? 'connected' : 'configured',
                enabled: true,
            });
            setMessages(prev => ({ ...prev, [app.slug]: `Synced ${tools.length} tools.` }));
        } finally {
            setSyncingApp(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-6">
            <div className="flex flex-col gap-1">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                    Connectors <IconLink size={16} className="text-brand" />
                </h2>
                <p className="text-muted-foreground text-xs leading-relaxed">
                    Connect account-backed tools through Composio. Use this for GitHub, Drive, Slack, Notion, Linear, Jira, and Gmail.
                </p>
            </div>

            <div className="bg-secondary/40 border-border/80 flex flex-col gap-4 rounded-2xl border p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold tracking-tight">Composio Provider</h3>
                        <p className="text-muted-foreground text-xs">Create auth configs in Composio, then paste their ids below.</p>
                    </div>
                    <button
                        onClick={() => updateConfig({ enabled: !config.enabled })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            config.enabled ? 'bg-brand' : 'bg-muted'
                        }`}
                    >
                        <span className={`pointer-events-none inline-block size-4 transform rounded-full bg-background shadow transition ${
                            config.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">Composio API Key</label>
                        <div className="relative">
                            <Input
                                type={showKey ? 'text' : 'password'}
                                value={config.apiKey || ''}
                                onChange={e => updateConfig({ apiKey: e.target.value })}
                                placeholder="cmp_..."
                                className="h-9 pr-8 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(prev => !prev)}
                                className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2"
                            >
                                {showKey ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                            </button>
                        </div>
                        {config.apiKey && <p className="text-muted-foreground text-[11px]">{maskComposioApiKey(config.apiKey)}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">User ID</label>
                        <Input
                            value={config.userId}
                            onChange={e => updateConfig({ userId: e.target.value || 'default-user' })}
                            placeholder="default-user"
                            className="h-9 text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="no-scrollbar flex max-h-[430px] flex-col gap-2 overflow-y-auto pr-1">
                {config.apps.map(app => (
                    <div key={app.slug} className="border-border/70 bg-secondary/20 rounded-xl border p-3">
                        <div className="flex items-start gap-3">
                            <div className="bg-brand/10 text-brand flex size-8 shrink-0 items-center justify-center rounded-lg">
                                <IconLink size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold">{app.name}</p>
                                    <Badge variant={app.status === 'connected' ? 'secondary' : 'outline'}>{app.status}</Badge>
                                    {typeof app.toolCount === 'number' && <Badge variant="outline">{app.toolCount} tools</Badge>}
                                </div>
                                <p className="text-muted-foreground mt-1 text-xs">{app.description}</p>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <Input
                                        value={app.authConfigId || ''}
                                        onChange={e => updateApp(app.slug, {
                                            authConfigId: e.target.value,
                                            status: e.target.value ? 'configured' : 'not-configured',
                                        })}
                                        placeholder="Auth config id"
                                        className="h-8 text-xs"
                                    />
                                    <Input
                                        value={app.connectedAccountId || ''}
                                        onChange={e => updateApp(app.slug, {
                                            connectedAccountId: e.target.value,
                                            status: e.target.value ? 'connected' : app.authConfigId ? 'configured' : 'not-configured',
                                        })}
                                        placeholder="Connected account id"
                                        className="h-8 text-xs"
                                    />
                                </div>
                                {messages[app.slug] && <p className="text-muted-foreground mt-2 text-xs">{messages[app.slug]}</p>}
                            </div>
                            <div className="flex shrink-0 flex-col gap-1">
                                <Button size="xs" rounded="full" variant="bordered" onClick={() => createConnectLink(app)}>
                                    Connect
                                </Button>
                                <Button size="xs" rounded="full" variant="bordered" onClick={() => syncTools(app)} disabled={syncingApp === app.slug}>
                                    {syncingApp === app.slug && <IconLoader2 size={12} className="animate-spin" />}
                                    Sync tools
                                </Button>
                                <Button
                                    size="xs"
                                    rounded="full"
                                    variant={app.enabled ? 'secondary' : 'bordered'}
                                    onClick={() => updateApp(app.slug, { enabled: !app.enabled })}
                                >
                                    {app.enabled ? 'Enabled' : 'Disabled'}
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
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
            const localOriginHint =
                res === 'Local provider blocked by browser' && typeof window !== 'undefined'
                    ? `Status: ${res}. Run: OLLAMA_ORIGINS=${window.location.origin} ollama serve`
                    : `Status: ${res}`;
            setTestResults(prev => ({ ...prev, [providerId]: localOriginHint }));
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
                                                {config.isLocal && (
                                                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                        Local providers run in your browser. From a deployed site, Ollama must allow this origin: <span className="font-mono">OLLAMA_ORIGINS={typeof window !== 'undefined' ? window.location.origin : 'https://your-app.example'} ollama serve</span>
                                                    </p>
                                                )}
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
