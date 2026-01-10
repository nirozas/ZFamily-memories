import React from 'react';
import { TopHeader } from './TopHeader';

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-catalog-bg pt-16">
            <TopHeader />
            <main className="transition-all duration-300">
                <div className="max-w-wide px-4 sm:px-8 py-8 animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
}
