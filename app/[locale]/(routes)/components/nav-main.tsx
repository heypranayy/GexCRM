"use client"

import * as React from "react"
import Link from "next/link"
import { Link as I18nLink } from "@/i18n/navigation"
import { usePathname } from "next/navigation"
import { type LucideIcon, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

/**
 * NavMain Component - Task Groups 2.1, 5.3
 *
 * Primary navigation component for the sidebar.
 * Features:
 * - Renders navigation items with icons and labels
 * - Supports collapsible groups for module dropdowns
 * - Active state detection using usePathname()
 * - Supports nested navigation items
 *
 * Task 5.3 Updates (Animation Standardization):
 * - Removed custom duration-200 class from ChevronRight icon
 * - Now uses Tailwind default transition duration (150ms)
 * - Maintains smooth rotation animation with shadcn defaults
 *
 * @param items - Array of navigation items (can be simple or grouped)
 * @param dict - Localization dictionary for labels
 */

export interface NavItem {
  title: string
  url?: string
  icon?: LucideIcon
  isActive?: boolean
  items?: NavSubItem[] // For collapsible groups
}

export interface NavSubItem {
  title: string
  url: string
  isActive?: boolean
  exact?: boolean
}

interface NavMainProps {
  items: NavItem[]
  dict?: any
}

export function NavMain({ items, dict }: NavMainProps) {
  const pathname = usePathname()

  // Helper function to check if a route is active
  const stripLocale = (path: string) =>
    path.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/"

  const isRouteActive = (url: string, exact?: boolean): boolean => {
    const normalizedPath = stripLocale(pathname)
    if (url === "/" || url === "") {
      return normalizedPath === "/" || normalizedPath === ""
    }
    if (exact) {
      return normalizedPath === url
    }
    return normalizedPath.startsWith(url)
  }

  // Helper to check if any sub-item is active
  const hasActiveChild = (subItems?: NavSubItem[]): boolean => {
    if (!subItems) return false
    return subItems.some((item) => isRouteActive(item.url))
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item, index) => {
          // Check if this is a collapsible group with sub-items
          if (item.items && item.items.length > 0) {
            const hasActive = hasActiveChild(item.items)
            const itemKey = item.url ?? `${item.title}-${index}`

            return (
              <Collapsible
                key={itemKey}
                asChild
                defaultOpen={hasActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={hasActive}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => {
                        const isActive = isRouteActive(subItem.url, subItem.exact)
                        return (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive}
                            >
                              <I18nLink href={subItem.url}>
                                <span>{subItem.title}</span>
                              </I18nLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          // Simple navigation item (no sub-items)
          if (!item.url) return null
          const isActive = isRouteActive(item.url)
          const itemKey = item.url ?? `${item.title}-${index}`
          return (
            <SidebarMenuItem key={itemKey}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive}
              >
                <I18nLink href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </I18nLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
