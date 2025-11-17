"use client";

import { Sparkles, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface AISummaryProps {
    improvements: string[];
}

export function AISummary({ improvements }: AISummaryProps) {
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-700 dark:from-neutral-100 dark:to-neutral-300 mb-4 shadow-lg shadow-neutral-900/10 dark:shadow-neutral-100/10">
                    <Sparkles className="h-5 w-5 text-neutral-50 dark:text-neutral-900" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1.5 tracking-tight">
                    What's Improved?
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 font-light leading-relaxed">
                    AI-powered analysis of enhancements made to your CV
                </p>
            </div>

            {/* Improvements List - More compact */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-1 pt-1 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                {improvements.map((improvement, index) => (
                    <div key={index} className="group relative">
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                        <Card className="relative p-2.5 rounded-lg bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border border-neutral-200/60 dark:border-neutral-800/60 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-900/5 dark:hover:shadow-neutral-100/5">
                            <div className="flex gap-2.5">
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-neutral-900/10 to-neutral-700/10 dark:from-neutral-100/10 dark:to-neutral-300/10 group-hover:from-neutral-900/20 group-hover:to-neutral-700/20 dark:group-hover:from-neutral-100/20 dark:group-hover:to-neutral-300/20 transition-all duration-300">
                                        <CheckCircle2 className="h-2.5 w-2.5 text-neutral-900 dark:text-neutral-100" />
                                    </div>
                                </div>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug font-light">
                                    {improvement}
                                </p>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>

            {/* Footer Note */}
            <div className="mt-6 pt-5 border-t border-neutral-200/60 dark:border-neutral-800/60">
                <div className="flex items-center justify-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-pulse"></div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 font-light tracking-wide">
                        {improvements.length} key improvement
                        {improvements.length !== 1 ? "s" : ""} detected
                    </p>
                </div>
            </div>
        </div>
    );
}
