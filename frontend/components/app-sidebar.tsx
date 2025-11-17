"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Sparkles,
  Video,
  Target,
  Briefcase,
  GraduationCap,
  Mail,
  FileText,
  Database,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

// Menu items for services (Dashboard and collapsible sections are rendered separately)
const items = [
  {
    title: "Jobmatcher",
    url: "/services/jobmatcher",
    icon: Target,
  },
  {
    title: "Portfolio Builder",
    url: "/services/portfolio-builder",
    icon: Briefcase,
  },
];

// Virtual Interviewer sub-items
const virtualInterviewerItems = [
  {
    title: "Interview",
    url: "/services/virtual-interviewer",
    icon: Video,
  },
  {
    title: "Database",
    url: "/services/virtual-interviewer/database",
    icon: Database,
  },
];

// CV Booster sub-items
const cvBoosterItems = [
  {
    title: "Generate",
    url: "/services/cv-rewriter",
    icon: FileText,
  },
  {
    title: "Database",
    url: "/services/cv-rewriter/database",
    icon: Database,
  },
];

// Career Guide sub-items
const careerGuideItems = [
  {
    title: "Generate",
    url: "/services/career-guide",
    icon: FileText,
  },
  {
    title: "Database",
    url: "/services/career-guide/database",
    icon: Database,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const isCVBoosterActive = pathname.startsWith("/services/cv-rewriter");
  const isCareerGuideActive = pathname.startsWith("/services/career-guide");
  const isVirtualInterviewerActive = pathname.startsWith("/services/virtual-interviewer");
  const { state } = useSidebar();
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [isCVBoosterOpen, setIsCVBoosterOpen] = useState(true);
  const [isCareerGuideOpen, setIsCareerGuideOpen] = useState(true);
  const [isVirtualInterviewerOpen, setIsVirtualInterviewerOpen] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use black logos for light mode, regular logos for dark mode
  const logoSrc = isMounted 
    ? (state === "collapsed" 
        ? (theme === "light" ? "/onboard-1-black.png" : "/onboard-1.png")
        : (theme === "light" ? "/onboard_logo-1-black.png" : "/onboard_logo-1.png"))
    : (state === "collapsed" ? "/onboard-1.png" : "/onboard_logo-1.png");

  return (
    <Sidebar collapsible="icon" className="shadow-lg dark:shadow-2xl" suppressHydrationWarning>
      <SidebarHeader className="border-b border-sidebar-border h-16 px-4 flex items-center justify-center">
        <Link href="/" className="flex items-center justify-center shrink-0">
          <div className={state === "collapsed" ? "min-w-[48px] min-h-[48px] w-[48px] h-[48px] flex items-center justify-center" : "h-10 flex items-center justify-center"}>
            <Image
              src={logoSrc}
              alt="OnBoard Logo"
              width={state === "collapsed" ? 48 : 180}
              height={state === "collapsed" ? 48 : 180}
              style={state === "collapsed" ? { width: '48px', height: '48px', minWidth: '48px', minHeight: '48px' } : { height: '40px', width: 'auto' }}
              className="object-contain shrink-0"
            />
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Services</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {/* Dashboard - First item */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/services/dashboard"}>
                  <Link href="/services/dashboard">
                    <LayoutDashboard className="h-5 w-5" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* CV Booster Collapsible Section - Second item */}
              {isMounted && (
                <Collapsible
                  open={isCVBoosterOpen}
                  onOpenChange={setIsCVBoosterOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      {state === "collapsed" ? (
                        <SidebarMenuButton asChild tooltip="CV Booster" isActive={isCVBoosterActive}>
                          <Link href="/services/cv-rewriter">
                            <Sparkles className="h-5 w-5" />
                            <span>CV Booster</span>
                          </Link>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton tooltip="CV Booster" isActive={isCVBoosterActive}>
                          <Sparkles className="h-5 w-5" />
                          <span>CV Booster</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="space-y-1 mt-1">
                        {cvBoosterItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                <Link href={subItem.url}>
                                  <SubIcon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* Virtual Interviewer Collapsible Section - Third item */}
              {isMounted && (
                <Collapsible
                  open={isVirtualInterviewerOpen}
                  onOpenChange={setIsVirtualInterviewerOpen}
                  className="group/collapsible-interviewer"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      {state === "collapsed" ? (
                        <SidebarMenuButton asChild tooltip="Virtual Interviewer" isActive={isVirtualInterviewerActive}>
                          <Link href="/services/virtual-interviewer">
                            <Video className="h-5 w-5" />
                            <span>Virtual Interviewer</span>
                          </Link>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton tooltip="Virtual Interviewer" isActive={isVirtualInterviewerActive}>
                          <Video className="h-5 w-5" />
                          <span>Virtual Interviewer</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible-interviewer:rotate-90" />
                        </SidebarMenuButton>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="space-y-1 mt-1">
                        {virtualInterviewerItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                <Link href={subItem.url}>
                                  <SubIcon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* Rest of the items */}
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <Icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Career Guide Collapsible Section - Last item */}
              {isMounted && (
                <Collapsible
                  open={isCareerGuideOpen}
                  onOpenChange={setIsCareerGuideOpen}
                  className="group/collapsible-career"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      {state === "collapsed" ? (
                        <SidebarMenuButton asChild tooltip="Career Guide" isActive={isCareerGuideActive}>
                          <Link href="/services/career-guide">
                            <GraduationCap className="h-5 w-5" />
                            <span>Career Guide</span>
                          </Link>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton tooltip="Career Guide" isActive={isCareerGuideActive}>
                          <GraduationCap className="h-5 w-5" />
                          <span>Career Guide</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible-career:rotate-90" />
                        </SidebarMenuButton>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="space-y-1 mt-1">
                        {careerGuideItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                <Link href={subItem.url}>
                                  <SubIcon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="opacity-50 hover:opacity-100">
              <Link href="/contact">
                <Mail className="h-5 w-5" />
                <span>Contact Us</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
