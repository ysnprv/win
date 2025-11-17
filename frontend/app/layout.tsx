import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Montserrat } from 'next/font/google';
import localFont from 'next/font/local';
import { Providers } from "./provider";

// Montserrat for marketing headers and CTAs
const montserrat = Montserrat({
    subsets: ['latin'],
    variable: '--font-montserrat',
    weight: ['400', '500', '600', '700', '800', '900'],
    display: 'swap',
});

// Neue Montreal for body text and lists
const neueMontreal = localFont({
    src: [
        {
            path: '../public/fonts/NeueMontreal-Regular.otf',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../public/fonts/NeueMontreal-Italic.otf',
            weight: '400',
            style: 'italic',
        },
        {
            path: '../public/fonts/NeueMontreal-Medium.otf',
            weight: '500',
            style: 'normal',
        },
        {
            path: '../public/fonts/NeueMontreal-Bold.otf',
            weight: '700',
            style: 'normal',
        },
    ],
    variable: '--font-neue-montreal',
    display: 'swap',
});

export const metadata: Metadata = {
    title: "OnBoard",
    description: "Every job seeker's buddy",
};

export default function RootLayout({ 
    children 
}: Readonly<{ 
    children: React.ReactNode 
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${neueMontreal.variable} ${montserrat.variable} font-body antialiased`}>
                <Providers>
                    {children}
                    <Toaster />
                </Providers>
            </body>
        </html>
    );
}
