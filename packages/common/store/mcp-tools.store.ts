'use client';

import { MCPServerConfig } from '@repo/ai/tools';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type LegacyMcpState = {
    mcpConfig?: Record<string, string>;
    selectedMCP?: string[];
};

type McpState = {
    servers: MCPServerConfig[];
    selectedMCP: string[];
};

type McpActions = {
    addServer: (server: MCPServerConfig) => void;
    updateServer: (id: string, updates: Partial<MCPServerConfig>) => void;
    removeServer: (id: string) => void;
    getSelectedMCP: () => MCPServerConfig[];
    updateSelectedMCP: (updater: (prev: string[]) => string[]) => void;
    setServers: (servers: MCPServerConfig[]) => void;
    mcpConfig: Record<string, string>;
    addMcpConfig: (mcpConfig: Record<string, string>) => void;
    removeMcpConfig: (key: string) => void;
    getMcpConfig: () => Record<string, string>;
    setMcpConfig: (mcpConfig: Record<string, string>) => void;
};

const slugify = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const toLegacyConfig = (servers: MCPServerConfig[]) =>
    servers.reduce(
        (acc, server) => {
            acc[server.name] = server.url;
            return acc;
        },
        {} as Record<string, string>
    );

const migrateState = (persistedState: unknown): McpState => {
    const state = (persistedState || {}) as Partial<McpState> & LegacyMcpState;

    if (Array.isArray(state.servers)) {
        return {
            servers: state.servers,
            selectedMCP: state.selectedMCP || state.servers.filter(s => s.enabled).map(s => s.id),
        };
    }

    const legacyConfig = state.mcpConfig || {};
    const selected = state.selectedMCP || Object.keys(legacyConfig);
    const servers = Object.entries(legacyConfig).map(([name, url]) => {
        const id = slugify(name) || crypto.randomUUID();
        return {
            id,
            name: id,
            title: name,
            url,
            transport: 'sse' as const,
            enabled: selected.includes(name),
            source: 'manual' as const,
        };
    });

    return {
        servers,
        selectedMCP: servers.filter(s => s.enabled).map(s => s.id),
    };
};

export const useMcpToolsStore = create<McpState & McpActions>()(
    persist(
        immer((set, get) => ({
            servers: [],
            selectedMCP: [],
            mcpConfig: {},

            getSelectedMCP: () => {
                const selected = new Set(get().selectedMCP);
                return get().servers.filter(server => server.enabled && selected.has(server.id));
            },

            updateSelectedMCP: (updater: (prev: string[]) => string[]) => {
                set(state => {
                    state.selectedMCP = updater(state.selectedMCP);
                    const selected = new Set(state.selectedMCP);
                    state.servers.forEach(server => {
                        server.enabled = selected.has(server.id);
                    });
                    state.mcpConfig = toLegacyConfig(state.servers);
                });
            },

            addServer: (server: MCPServerConfig) => {
                set(state => {
                    const existingIndex = state.servers.findIndex(s => s.id === server.id);
                    if (existingIndex >= 0) {
                        state.servers[existingIndex] = server;
                    } else {
                        state.servers.push(server);
                    }
                    if (server.enabled && !state.selectedMCP.includes(server.id)) {
                        state.selectedMCP.push(server.id);
                    }
                    state.mcpConfig = toLegacyConfig(state.servers);
                });
            },

            updateServer: (id: string, updates: Partial<MCPServerConfig>) => {
                set(state => {
                    const server = state.servers.find(s => s.id === id);
                    if (!server) return;
                    Object.assign(server, updates);
                    if (updates.enabled === false) {
                        state.selectedMCP = state.selectedMCP.filter(selected => selected !== id);
                    }
                    if (updates.enabled === true && !state.selectedMCP.includes(id)) {
                        state.selectedMCP.push(id);
                    }
                    state.mcpConfig = toLegacyConfig(state.servers);
                });
            },

            removeServer: (id: string) => {
                set(state => {
                    state.servers = state.servers.filter(server => server.id !== id);
                    state.selectedMCP = state.selectedMCP.filter(selected => selected !== id);
                    state.mcpConfig = toLegacyConfig(state.servers);
                });
            },

            setServers: (servers: MCPServerConfig[]) => {
                set(state => {
                    state.servers = servers;
                    state.selectedMCP = servers.filter(server => server.enabled).map(server => server.id);
                    state.mcpConfig = toLegacyConfig(servers);
                });
            },

            setMcpConfig: (mcpConfig: Record<string, string>) => {
                const migrated = migrateState({ mcpConfig });
                set(state => {
                    state.servers = migrated.servers;
                    state.selectedMCP = migrated.selectedMCP;
                    state.mcpConfig = toLegacyConfig(migrated.servers);
                });
            },

            addMcpConfig: (mcpConfig: Record<string, string>) => {
                set(state => {
                    Object.entries(mcpConfig).forEach(([name, url]) => {
                        const id = slugify(name) || crypto.randomUUID();
                        state.servers.push({
                            id,
                            name: id,
                            title: name,
                            url,
                            transport: 'streamable-http',
                            enabled: true,
                            source: 'manual',
                        });
                        if (!state.selectedMCP.includes(id)) state.selectedMCP.push(id);
                    });
                    state.mcpConfig = toLegacyConfig(state.servers);
                });
            },

            removeMcpConfig: (key: string) => {
                get().removeServer(key);
            },

            getMcpConfig: () => toLegacyConfig(get().servers),
        })),
        {
            name: 'mcp-tools-storage',
            storage: createJSONStorage(() => localStorage),
            version: 2,
            migrate: migrateState,
            partialize: state => ({
                servers: state.servers,
                selectedMCP: state.selectedMCP,
            }),
        }
    )
);
