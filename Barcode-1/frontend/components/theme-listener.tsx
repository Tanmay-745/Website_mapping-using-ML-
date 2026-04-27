"use client"

import { useEffect } from 'react'

export function ThemeListener() {
    useEffect(() => {
        const handleThemeChange = (event: MessageEvent) => {
            if (event.data?.type === 'THEME_CHANGE') {
                if (event.data.isDark) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        };
        window.addEventListener('message', handleThemeChange);
        return () => window.removeEventListener('message', handleThemeChange);
    }, []);

    return null;
}
