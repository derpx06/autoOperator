'use client';
import { FullPageLoader, HistoryItem, Logo } from '@repo/common/components';
import { useRootContext } from '@repo/common/context';
import { useAppStore, useChatStore } from '@repo/common/store';
import { ThemeToggleButton } from './theme-toggle';
import { Thread } from '@repo/shared/types';
import {
    Badge,
    Button,
    cn,
    Flex,
} from '@repo/ui';
import {
    IconArrowBarLeft,
    IconArrowBarRight,
    IconCommand,
    IconPinned,
    IconPlus,
    IconSearch,
    IconSettings2,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import moment from 'moment';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';

export const Sidebar = () => {
    const { threadId: currentThreadId } = useParams();
    const pathname = usePathname();
    const { setIsCommandSearchOpen } = useRootContext();
    const isChatPage = pathname === '/chat';
    const threads = useChatStore(state => state.threads);
    const pinThread = useChatStore(state => state.pinThread);
    const unpinThread = useChatStore(state => state.unpinThread);
    const sortThreads = (threads: Thread[], sortBy: 'createdAt') => {
        return [...threads].sort((a, b) => moment(b[sortBy]).diff(moment(a[sortBy])));
    };

    const setIsSidebarOpen = useAppStore(state => state.setIsSidebarOpen);
    const isSidebarOpen = useAppStore(state => state.isSidebarOpen);
    const setIsSettingsOpen = useAppStore(state => state.setIsSettingsOpen);
    const { push } = useRouter();
    const groupedThreads: Record<string, Thread[]> = {
        today: [],
        yesterday: [],
        last7Days: [],
        last30Days: [],
        previousMonths: [],
    };

    sortThreads(threads, 'createdAt')?.forEach(thread => {
        const createdAt = moment(thread.createdAt);
        const now = moment();

        if (createdAt.isSame(now, 'day')) {
            groupedThreads.today.push(thread);
        } else if (createdAt.isSame(now.clone().subtract(1, 'day'), 'day')) {
            groupedThreads.yesterday.push(thread);
        } else if (createdAt.isAfter(now.clone().subtract(7, 'days'))) {
            groupedThreads.last7Days.push(thread);
        } else if (createdAt.isAfter(now.clone().subtract(30, 'days'))) {
            groupedThreads.last30Days.push(thread);
        } else {
            groupedThreads.previousMonths.push(thread);
        }
    });

    const renderGroup = ({
        title,
        threads,
        groupIcon,
        renderEmptyState,
    }: {
        title: string;
        threads: Thread[];
        groupIcon?: React.ReactNode;
        renderEmptyState?: () => React.ReactNode;
    }) => {
        if (threads.length === 0 && !renderEmptyState) return null;
        return (
            <Flex direction="col" items="start" className="w-full gap-1">
                <div className="text-muted-foreground/60 flex flex-row items-center gap-1.5 px-2 py-1 text-[11px] font-semibold tracking-wider uppercase opacity-85">
                    {groupIcon}
                    {title}
                </div>
                {threads.length === 0 && renderEmptyState ? (
                    renderEmptyState()
                ) : (
                    <Flex className="w-full gap-0.5" gap="none" direction="col">
                        {threads.map(thread => (
                            <HistoryItem
                                thread={thread}
                                pinThread={() => pinThread(thread.id)}
                                unpinThread={() => unpinThread(thread.id)}
                                isPinned={thread.pinned}
                                key={thread.id}
                                dismiss={() => {
                                    setIsSidebarOpen(() => false);
                                }}
                                isActive={thread.id === currentThreadId}
                            />
                        ))}
                    </Flex>
                )}
            </Flex>
        );
    };

    return (
        <div
            className={cn(
                'relative bottom-0 left-0 top-0 z-[50] flex h-[100dvh] flex-shrink-0 flex-col py-3 transition-all duration-300 ease-in-out',
                isSidebarOpen ? 'top-0 h-full w-[240px]' : 'w-[60px]'
            )}
        >
            <Flex direction="col" className="w-full flex-1 items-start overflow-hidden bg-transparent">
                {/* Header section with logo */}
                <div className="mb-4 flex w-full flex-row items-center justify-between px-3">
                    <Link href="/chat" className={isSidebarOpen ? 'w-auto' : 'w-full'}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className={cn(
                                'flex h-9 items-center justify-start gap-2 rounded-xl transition-all duration-200',
                                !isSidebarOpen && 'justify-center px-0'
                            )}
                        >
                            <Logo className="text-brand size-5.5 transition-transform duration-300 hover:rotate-12" />
                            {isSidebarOpen && (
                                <p className="font-clash text-foreground text-base font-bold tracking-tight">
                                    autooperator.co
                                </p>
                            )}
                        </motion.div>
                    </Link>
                    {isSidebarOpen && (
                        <Button
                            variant="ghost"
                            tooltip="Close Sidebar"
                            tooltipSide="right"
                            size="icon-sm"
                            onClick={() => setIsSidebarOpen(() => false)}
                            className="mr-1 rounded-xl hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                        >
                            <IconArrowBarLeft size={16} strokeWidth={2} />
                        </Button>
                    )}
                </div>

                <Flex
                    direction="col"
                    className={cn(
                        'w-full px-3',
                        !isSidebarOpen && 'items-center justify-center px-1'
                    )}
                    gap="sm"
                >
                    {!isChatPage ? (
                        <Link href="/chat" className={isSidebarOpen ? 'w-full' : ''}>
                            <Button
                                size={isSidebarOpen ? 'sm' : 'icon-sm'}
                                variant="bordered"
                                rounded="xl"
                                tooltip={isSidebarOpen ? undefined : 'New Thread'}
                                tooltipSide="right"
                                className={cn(
                                    'justify-center border-border/80 shadow-sm transition-all duration-200 hover:border-brand/40 hover:bg-brand/5 hover:text-brand',
                                    isSidebarOpen && 'relative w-full'
                                )}
                            >
                                <IconPlus size={15} strokeWidth={2.5} className={cn(isSidebarOpen)} />
                                {isSidebarOpen && 'New'}
                            </Button>
                        </Link>
                    ) : (
                        <Button
                            size={isSidebarOpen ? 'sm' : 'icon-sm'}
                            variant="bordered"
                            rounded="xl"
                            tooltip={isSidebarOpen ? undefined : 'New Thread'}
                            tooltipSide="right"
                            onClick={() => push('/chat')}
                            className={cn(
                                'justify-center border-border/80 shadow-sm transition-all duration-200 hover:border-brand/40 hover:bg-brand/5 hover:text-brand',
                                isSidebarOpen && 'relative w-full'
                            )}
                        >
                            <IconPlus size={15} strokeWidth={2.5} className={cn(isSidebarOpen)} />
                            {isSidebarOpen && 'New Thread'}
                        </Button>
                    )}
                    <Button
                        size={isSidebarOpen ? 'sm' : 'icon-sm'}
                        variant="bordered"
                        rounded="xl"
                        tooltip={isSidebarOpen ? undefined : 'Search'}
                        tooltipSide="right"
                        className={cn(
                            isSidebarOpen && 'relative w-full',
                            'text-muted-foreground justify-center border-border/80 shadow-sm transition-all duration-200 hover:bg-secondary hover:text-foreground px-2'
                        )}
                        onClick={() => setIsCommandSearchOpen(true)}
                    >
                        <IconSearch size={14} strokeWidth={2} className={cn(isSidebarOpen)} />
                        {isSidebarOpen && 'Search'}
                        {isSidebarOpen && <div className="flex-1" />}
                        {isSidebarOpen && (
                            <div className="flex flex-row items-center gap-1 opacity-70">
                                <Badge
                                    variant="secondary"
                                    className="bg-muted-foreground/10 text-muted-foreground flex size-5 items-center justify-center rounded-md p-0 text-[10px]"
                                >
                                    <IconCommand size={10} strokeWidth={2.5} className="shrink-0" />
                                </Badge>
                                <Badge
                                    variant="secondary"
                                    className="bg-muted-foreground/10 text-muted-foreground flex size-5 items-center justify-center rounded-md p-0 text-[10px] font-bold"
                                >
                                    K
                                </Badge>
                            </div>
                        )}
                    </Button>
                </Flex>

                {/* Divider */}
                <div className="w-full px-3 py-2">
                    <div className="border-border/60 w-full border-t border-dashed" />
                </div>

                {/* Thread List */}
                {false ? (
                    <FullPageLoader />
                ) : (
                    <Flex
                        direction="col"
                        gap="lg"
                        className={cn(
                            'no-scrollbar w-full flex-1 overflow-y-auto px-3 pb-[100px]',
                            isSidebarOpen ? 'flex' : 'hidden'
                        )}
                    >
                        {renderGroup({
                            title: 'Pinned',
                            threads: threads
                                .filter(thread => thread.pinned)
                                .sort((a, b) => b.pinnedAt.getTime() - a.pinnedAt.getTime()),
                            groupIcon: <IconPinned size={11} strokeWidth={2.5} />,
                            renderEmptyState: () => (
                                <div className="border-border/60 flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed p-3 bg-secondary/35">
                                    <p className="text-muted-foreground/60 text-[11px] font-medium">
                                        No pinned threads
                                    </p>
                                </div>
                            ),
                        })}
                        {renderGroup({ title: 'Today', threads: groupedThreads.today })}
                        {renderGroup({ title: 'Yesterday', threads: groupedThreads.yesterday })}
                        {renderGroup({ title: 'Last 7 Days', threads: groupedThreads.last7Days })}
                        {renderGroup({ title: 'Last 30 Days', threads: groupedThreads.last30Days })}
                        {renderGroup({
                            title: 'Previous Months',
                            threads: groupedThreads.previousMonths,
                        })}
                    </Flex>
                )}

                {/* Footer Section with Settings and Theme Toggle */}
                <Flex
                    className={cn(
                        'from-tertiary via-tertiary/95 absolute bottom-0 mt-auto w-full items-center bg-gradient-to-t via-60% to-transparent p-3 pt-12',
                        isSidebarOpen && 'items-start justify-between'
                    )}
                    gap="xs"
                    direction={'col'}
                >
                    {!isSidebarOpen && (
                        <div className="flex flex-col gap-2 items-center justify-center w-full">
                            <Button
                                variant="ghost"
                                size="icon"
                                tooltip="Open Sidebar"
                                tooltipSide="right"
                                onClick={() => setIsSidebarOpen(() => true)}
                                className="mx-auto rounded-xl hover:bg-secondary"
                            >
                                <IconArrowBarRight size={16} strokeWidth={2} />
                            </Button>
                        </div>
                    )}
                    {isSidebarOpen && (
                        <div className="flex w-full flex-col gap-2">
                            <div className="flex w-full flex-row gap-1.5">
                                <Button
                                    variant="bordered"
                                    size="sm"
                                    rounded="xl"
                                    className="flex-1 border-border/80 shadow-sm transition-all duration-200 hover:bg-secondary hover:text-foreground"
                                    onClick={() => {
                                        setIsSettingsOpen(true);
                                    }}
                                >
                                    <IconSettings2 size={14} strokeWidth={2} />
                                    Settings
                                </Button>
                                <ThemeToggleButton className="rounded-xl border-border/80 shadow-sm" />
                            </div>
                        </div>
                    )}
                </Flex>
            </Flex>
        </div>
    );
};
