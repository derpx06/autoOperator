'use client';
import {
    CommandSearch,
    IntroDialog,
    SettingsModal,
    Sidebar,
} from '@repo/common/components';
import { useRootContext } from '@repo/common/context';
import { AgentProvider } from '@repo/common/hooks';
import { useAppStore } from '@repo/common/store';
import { plausible } from '@repo/shared/utils';
import { Badge, Button, Flex, Toaster } from '@repo/ui';
import { IconMoodSadDizzy, IconX } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { FC, useEffect } from 'react';
import { useStickToBottom } from 'use-stick-to-bottom';
import { Drawer } from 'vaul';

export type TRootLayout = {
    children: React.ReactNode;
};

export const RootLayout: FC<TRootLayout> = ({ children }) => {
    const { isSidebarOpen, isMobileSidebarOpen, setIsMobileSidebarOpen } = useRootContext();

    // Main content panel — soft edges, subtle depth
    const containerClass =
        'relative flex flex-1 flex-row h-[calc(99dvh)] border border-border/60 rounded-2xl bg-secondary w-full overflow-hidden shadow-[0_2px_24px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]';

    useEffect(() => {
        plausible.trackPageview();
    }, []);

    return (
        <div className="bg-tertiary flex h-[100dvh] w-full flex-row overflow-hidden">
            {/* Mobile blocker overlay */}
            <div className="bg-background/95 item-center fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-3 backdrop-blur-sm md:hidden">
                <div className="bg-muted flex size-12 items-center justify-center rounded-2xl">
                    <IconMoodSadDizzy size={22} strokeWidth={1.5} className="text-muted-foreground" />
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                    <span className="text-sm font-medium">Mobile coming soon</span>
                    <span className="text-muted-foreground text-xs">Please use a desktop browser</span>
                </div>
            </div>

            {/* Desktop sidebar */}
            <Flex className="hidden lg:flex h-full">
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.div
                            key="sidebar"
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            className="h-full flex flex-col"
                        >
                            <Sidebar />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Flex>

            {/* Mobile sidebar drawer */}
            <Drawer.Root
                open={isMobileSidebarOpen}
                direction="left"
                shouldScaleBackground
                onOpenChange={setIsMobileSidebarOpen}
            >
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" />
                    <Drawer.Content className="fixed bottom-0 left-0 top-0 z-[50]">
                        <Flex className="pr-2">
                            <Sidebar />
                        </Flex>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Main content */}
            <Flex className="flex-1 overflow-hidden">
                <motion.div
                    className="flex w-full py-1.5 pr-1.5"
                    layout
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                >
                    <AgentProvider>
                        <div className={containerClass}>
                            <div className="relative flex h-full w-0 flex-1 flex-row">
                                <div className="flex w-full flex-col gap-2 overflow-y-auto">
                                    {/* Soft top fade gradient */}
                                    <div className="from-secondary via-secondary/80 to-secondary/0 pointer-events-none absolute left-0 right-0 top-0 z-40 h-16 bg-gradient-to-b" />
                                    {children}
                                </div>
                            </div>
                            <SideDrawer />
                            <IntroDialog />
                        </div>
                    </AgentProvider>
                </motion.div>
                <SettingsModal />
                <CommandSearch />
            </Flex>

            <Toaster />
        </div>
    );
};

export const SideDrawer = () => {
    const pathname = usePathname();
    const sideDrawer = useAppStore(state => state.sideDrawer);
    const dismissSideDrawer = useAppStore(state => state.dismissSideDrawer);
    const { scrollRef, contentRef } = useStickToBottom({
        stiffness: 1,
        damping: 0,
    });
    const isThreadPage = pathname.startsWith('/chat/');

    return (
        <AnimatePresence>
            {sideDrawer.open && isThreadPage && (
                <motion.div
                    initial={{ opacity: 0, x: 48 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 48 }}
                    transition={{
                        type: 'spring',
                        stiffness: 320,
                        damping: 28,
                    }}
                    className="flex min-h-[99dvh] w-[480px] shrink-0 flex-col overflow-hidden py-1.5 pl-0.5 pr-1.5"
                >
                    {/* Premium panel — rounded, soft shadow */}
                    <div className="bg-background border-border/60 shadow-subtle-sm flex h-full w-full flex-col overflow-hidden rounded-2xl border">
                        {/* Header */}
                        <div className="border-border/60 flex flex-row items-center justify-between gap-2 border-b px-4 py-2.5">
                            <div className="text-sm font-semibold tracking-tight">
                                {typeof sideDrawer.title === 'function'
                                    ? sideDrawer.title()
                                    : sideDrawer.title}
                            </div>
                            {sideDrawer.badge && (
                                <Badge variant="default" className="rounded-full text-xs">
                                    {sideDrawer.badge}
                                </Badge>
                            )}
                            <div className="flex-1" />
                            <Button
                                variant="secondary"
                                size="icon-xs"
                                onClick={() => dismissSideDrawer()}
                                tooltip="Close"
                                className="rounded-lg"
                            >
                                <IconX size={13} strokeWidth={2} />
                            </Button>
                        </div>

                        {/* Content */}
                        <div
                            className="no-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto p-3"
                            ref={scrollRef}
                        >
                            <div ref={contentRef} className="w-full">
                                {sideDrawer.renderContent()}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
