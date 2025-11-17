"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

type Props = {
  width?: number;
  height?: number;
  className?: string;
};

export default function LogoLink({ width = 140, height = 40, className }: Props) {
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const logoSrc = isMounted ? (theme === "light" ? "/onboard_logo-1-black.png" : "/onboard_logo-1.png") : "/onboard_logo-1.png";

  return (
    <Link href="/" className={`inline-flex items-center ${className ?? ""}`}>
      <Image src={logoSrc} alt="OnBoard" width={width} height={height} className="object-contain" />
    </Link>
  );
}
