'use client';

import { cn } from '@repo/ui';
import { IconMoon, IconSun, IconDeviceDesktop } from '@tabler/icons-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type ThemeOption = {
    key: 'light' | 'dark' | 'system';
    icon: React.ReactNode;
    label: string;
    description: string;
};

const THEME_OPTIONS: ThemeOption[] = [
    {
        key: 'light',
        icon: <IconSun size={16} strokeWidth={2} />,
        label: 'Light',
        description: 'Bright & clear',
    },
    {
        key: 'system',
        icon: <IconDeviceDesktop size={16} strokeWidth={2} />,
        label: 'System',
        description: 'Auto-detect',
    },
    {
        key: 'dark',
        icon: <IconMoon size={16} strokeWidth={2} />,
        label: 'Dark',
        description: 'Easy on eyes',
    },
];

/**
 * Full segmented theme picker — used inside the Settings Modal.
 */
export const ThemePicker = () => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        // Avoid hydration mismatch — render a skeleton
        return <div className="h-[72px] w-full animate-pulse rounded-xl bg-muted" />;
    }

    return (
        <div className="flex w-full flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Appearance</p>
            <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map(option => {
                    const isActive = theme === option.key;
                    return (
                        <button
                            key={option.key}
                            id={`theme-option-${option.key}`}
                            onClick={() => setTheme(option.key)}
                            className={cn(
                                'group relative flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3',
                                'transition-all duration-200 ease-out',
                                'hover:border-brand/40 hover:bg-brand/5',
                                isActive
                                    ? 'border-brand bg-brand/10 text-brand shadow-sm'
                                    : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                            )}
                            aria-pressed={isActive}
                            title={`Switch to ${option.label} theme`}
                        >
                            {/* Icon */}
                            <span
                                className={cn(
                                    'flex size-8 items-center justify-center rounded-lg transition-all duration-200',
                                    isActive
                                        ? 'bg-brand/20 text-brand'
                                        : 'bg-tertiary text-muted-foreground group-hover:text-foreground'
                                )}
                            >
                                {option.icon}
                            </span>

                            {/* Label */}
                            <span
                                className={cn(
                                    'text-xs font-semibold',
                                    isActive ? 'text-brand' : 'text-foreground'
                                )}
                            >
                                {option.label}
                            </span>

                            {/* Description */}
                            <span className="text-[10px] leading-tight text-muted-foreground">
                                {option.description}
                            </span>

                            {/* Active indicator dot */}
                            {isActive && (
                                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Compact icon-only cycle button — used in the Sidebar footer.
 */
export const ThemeToggleButton = ({ className }: { className?: string }) => {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className={cn('size-8 animate-pulse rounded-lg bg-muted', className)} />;
    }

    const isDark = resolvedTheme === 'dark';

    return (
        <button
            id="theme-toggle-btn"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            className={cn(
                'group flex items-center gap-2 rounded-lg border border-border bg-secondary px-2.5 py-1.5',
                'text-muted-foreground transition-all duration-200',
                'hover:border-brand/30 hover:bg-brand/5 hover:text-brand',
                className
            )}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        >
            <span className="flex size-5 items-center justify-center transition-transform duration-300 group-hover:scale-110">
                {isDark ? <IconSun size={14} strokeWidth={2} /> : <IconMoon size={14} strokeWidth={2} />}
            </span>
            <span className="text-xs font-medium">{isDark ? 'Light' : 'Dark'}</span>
        </button>
    );
};
