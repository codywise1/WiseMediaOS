import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  FolderIcon,
  DocumentIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  XMarkIcon,
  DocumentTextIcon,
  LifebuoyIcon,
  EllipsisHorizontalIcon,
  ChatBubbleOvalLeftIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import TopNav from './TopNav'
import ProfileModal from './ProfileModal'
import { UserRole } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface User {
  email: string
  role: UserRole
  name: string
  avatar?: string
  phone?: string
  company?: string
}

interface LayoutProps {
  children: React.ReactNode
  currentUser: User | null
  onLogout: () => void
  onUpdateProfile?: (userData: Partial<User>) => void
}

type IconType = React.ElementType

interface NavItem {
  name: string
  href: string
  icon: IconType
}

interface NavGroup {
  label: string
  items: NavItem[]
}

type NormalizedRole = 'admin' | 'staff' | 'client' | 'member'

const normalizeRole = (role?: string): NormalizedRole => {
  const value = (role || '').toLowerCase()
  if (value === 'admin') return 'admin'
  if (value === 'staff') return 'staff'
  if (value === 'elite' || value === 'pro' || value === 'free') return 'member'
  return 'client'
}

const roleLabel = (role?: string) => {
  const value = normalizeRole(role)
  if (value === 'admin') return 'Administrator'
  if (value === 'staff') return 'Staff'
  if (value === 'member') return 'Creator Member'
  return 'Client'
}

const navByRole: Record<NormalizedRole, NavGroup[]> = {
  admin: [
    {
      label: 'Agency',
      items: [
        { name: 'Dashboard', href: '/', icon: HomeIcon },
        { name: 'Clients', href: '/clients', icon: UserCircleIcon },
        { name: 'Projects', href: '/projects', icon: FolderIcon },
        { name: 'Notes', href: '/notes', icon: DocumentTextIcon },
        { name: 'Files', href: '/admin/files', icon: DocumentDuplicateIcon },
        { name: 'Meetings', href: '/appointments', icon: CalendarIcon },
        { name: 'Proposals', href: '/proposals', icon: ClipboardDocumentListIcon },
        { name: 'Invoices', href: '/invoices', icon: DocumentIcon }
      ]
    },
    {
      label: 'Community',
      items: [
        { name: 'Community', href: '/community', icon: ChatBubbleOvalLeftIcon },
        { name: 'Chat', href: '/community/chat', icon: ChatBubbleLeftRightIcon },
        { name: 'Education', href: '/community/courses', icon: BookOpenIcon },
        { name: 'Marketplace', href: '/community', icon: DocumentDuplicateIcon }
      ]
    },
    {
      label: 'System',
      items: [
        { name: 'Support', href: '/support', icon: LifebuoyIcon },
        { name: 'Settings', href: '/community/profile', icon: Cog6ToothIcon }
      ]
    }
  ],
  staff: [
    { label: 'Overview', items: [{ name: 'Dashboard', href: '/', icon: HomeIcon }] },
    {
      label: 'Work',
      items: [
        { name: 'Clients', href: '/clients', icon: UserCircleIcon },
        { name: 'Projects', href: '/projects', icon: FolderIcon },
        { name: 'Notes', href: '/notes', icon: DocumentTextIcon },
        { name: 'Files', href: '/admin/files', icon: DocumentDuplicateIcon },
        { name: 'Appointments', href: '/appointments', icon: CalendarIcon },
        { name: 'Proposals', href: '/proposals', icon: ClipboardDocumentListIcon },
        { name: 'Invoices', href: '/invoices', icon: DocumentIcon }
      ]
    },
    {
      label: 'Community',
      items: [
        { name: 'Community', href: '/community', icon: ChatBubbleOvalLeftIcon },
        { name: 'Chat', href: '/community/chat', icon: ChatBubbleLeftRightIcon },
        { name: 'Education (Courses)', href: '/community/courses', icon: BookOpenIcon },
        { name: 'Marketplace', href: '/community', icon: DocumentDuplicateIcon }
      ]
    },
    {
      label: 'System',
      items: [
        { name: 'Support', href: '/support', icon: LifebuoyIcon },

        { name: 'Settings', href: '/community/profile', icon: Cog6ToothIcon }
      ]
    }
  ],
  client: [
    { label: 'Overview', items: [{ name: 'Home', href: '/', icon: HomeIcon }] },
    {
      label: 'Work',
      items: [
        { name: 'Projects', href: '/projects', icon: FolderIcon },
        { name: 'Notes', href: '/notes', icon: DocumentTextIcon }
      ]
    },
    { label: 'Billing', items: [{ name: 'Invoices', href: '/invoices', icon: DocumentIcon }] },
    {
      label: 'Community',
      items: [
        { name: 'Messages', href: '/support', icon: ChatBubbleLeftRightIcon }
      ]
    },
    { label: 'Learning', items: [{ name: 'Courses', href: '/community/courses', icon: BookOpenIcon }] },
    { label: 'Support', items: [{ name: 'Support', href: '/support', icon: LifebuoyIcon }] }
  ],
  member: [
    { label: 'Overview', items: [{ name: 'Creator Home', href: '/creator', icon: HomeIcon }] },
    {
      label: 'Community',
      items: [
        { name: 'Community', href: '/community', icon: ChatBubbleOvalLeftIcon },
        { name: 'Direct Messages', href: '/community/chat', icon: ChatBubbleLeftRightIcon }
      ]
    },
    {
      label: 'Learning',
      items: [
        { name: 'Courses', href: '/community/courses', icon: BookOpenIcon },
        { name: 'Resources', href: '/community/courses', icon: Squares2X2Icon }
      ]
    },
    {
      label: 'Marketplace',
      items: [{ name: 'Marketplace', href: '/community', icon: DocumentDuplicateIcon }]
    },
    { label: 'Support', items: [{ name: 'Support', href: '/support', icon: LifebuoyIcon }] }
  ]
}

export default function Layout({ children, currentUser, onLogout, onUpdateProfile }: LayoutProps) {
  const location = useLocation()
  const { profile } = useAuth()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('wisemedia_sidebar_collapsed') === '1'
    } catch {
      return false
    }
  })

  const normalizedRole = normalizeRole(profile?.role || currentUser?.role)
  const navGroups = navByRole[normalizedRole]
  const dockItems = navGroups.flatMap(group => group.items).slice(0, 4)
  const showSidebarUserActions = false
  const isChatRoute = location.pathname.startsWith('/community/chat')

  const handleProfileUpdate = (userData: Partial<User>) => {
    if (onUpdateProfile) {
      onUpdateProfile(userData)
    }
    setIsProfileModalOpen(false)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMobileMenu()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMobileMenuOpen])

  useEffect(() => {
    try {
      window.localStorage.setItem('wisemedia_sidebar_collapsed', isSidebarCollapsed ? '1' : '0')
    } catch {
      return
    }
  }, [isSidebarCollapsed])

  return (
    <div className="min-h-screen relative">
      {/* Background image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-20"
        style={{
          backgroundImage:
            "url('https://codywise.io/wp-content/uploads/2025/09/Wise-Media-OS-Wallpaper.webp')"
        }}
      />

      {/* Dark overlay */}

      {/* App content */}
      <div className="relative z-10">
        {/* Desktop Sidebar */}
        <div
          className={`hidden md:block fixed inset-y-0 left-0 z-50 ${isSidebarCollapsed ? 'w-20' : 'w-64'
            }`}
        >
          <div className={`glass-card h-full ${isSidebarCollapsed ? 'p-2' : 'p-6'} flex flex-col`}>
            <div
              className={`flex items-center mb-8 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'
                }`}
            >
              {isSidebarCollapsed ? (
                <div className="h-10" />
              ) : (
                <img
                  src="https://codywise.io/wp-content/uploads/2025/02/Wise-Media-Logo.svg"
                  alt="Wise Media"
                  className="h-10 w-auto"
                />
              )}

              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(v => !v)}
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className={`p-2 text-gray-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors ${isSidebarCollapsed ? 'absolute top-4 right-4' : ''
                  }`}
              >
                {isSidebarCollapsed ? (
                  <ChevronRightIcon className="h-5 w-5" />
                ) : (
                  <ChevronLeftIcon className="h-5 w-5" />
                )}
              </button>
            </div>

            <nav className="space-y-6 flex-1 overflow-y-auto">
              {navGroups.map(group => (
                <div key={group.label} className="space-y-1">
                  <p
                    className={`text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1 ${isSidebarCollapsed ? 'hidden' : ''
                      }`}
                  >
                    {group.label}
                  </p>
                  {group.items.map(item => {
                    const isActive = location.pathname === item.href
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        title={isSidebarCollapsed ? item.name : undefined}
                        className={`flex items-center py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'
                          } ${isActive
                            ? isSidebarCollapsed
                              ? 'bg-[#59a1e5]/20 text-[#59a1e5]'
                              : 'bg-[#59a1e5]/20 text-[#59a1e5] border-l-4 border-[#59a1e5] rounded-l-none'
                            : 'text-gray-300 hover:text-white hover:bg-slate-800/50'
                          }`}
                      >
                        <item.icon className={`${isSidebarCollapsed ? 'h-6 w-6' : 'mr-3 h-5 w-5'}`} />
                        {!isSidebarCollapsed && item.name}
                      </NavLink>
                    )
                  })}
                </div>
              ))}
            </nav>

            {showSidebarUserActions && (
              <div className="mt-auto pt-6 space-y-3">
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="w-full profile-card border border-white/20 transition-all duration-300 rounded-2xl hover:border-[#59a1e5]/40 hover:shadow-lg hover:shadow-[#59a1e5]/20 group"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Profile
                      </span>
                      <PencilIcon className="h-4 w-4 text-white/40 group-hover:text-[#59a1e5] transition-colors" />
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={
                            currentUser?.avatar ||
                            'https://wisemedia.io/wp-content/uploads/2025/09/Wise-Media-Favicon-Wise-Media.webp'
                          }
                          alt={currentUser?.name || 'User'}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shadow-md bg-white p-1"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-slate-900 shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-base font-bold text-white truncate">
                          {currentUser?.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {roleLabel(currentUser?.role)}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  className="w-full logout-card border border-white/20 transition-all duration-300 rounded-2xl hover:border-white/40 hover:bg-white/10 group"
                >
                  <div className="flex items-center justify-center space-x-3 p-4">
                    <ArrowRightOnRectangleIcon className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
                    <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">
                      Sign Out
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
            onClick={closeMobileMenu}
          >
            <div
              className="fixed inset-y-0 left-0 w-80 max-w-[85vw] glass-card p-6 transform transition-transform duration-300 ease-out overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <img
                  src="https://codywise.io/wp-content/uploads/2025/02/Wise-Media-Logo.svg"
                  alt="Wise Media"
                  className="h-8 w-auto"
                />
                <button
                  onClick={closeMobileMenu}
                  className="p-2 text-gray-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {navGroups.map(group => (
                  <div key={group.label} className="space-y-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4">
                      {group.label}
                    </p>
                    {group.items.map(item => {
                      const isActive = location.pathname === item.href
                      return (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          onClick={closeMobileMenu}
                          className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                            ? 'bg-[#3aa3eb]/20 text-[#3aa3eb]'
                            : 'text-gray-300 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                          <item.icon className="mr-3 h-5 w-5" />
                          {item.name}
                        </NavLink>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Dock */}
        <div className="hidden md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe">
          <div className="glass-card border-t border-white/10 px-2 py-3 backdrop-blur-xl bg-slate-900/95">
            <div className="flex items-center justify-around max-w-md mx-auto">
              {dockItems.map(item => {
                const isActive = location.pathname === item.href
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={`flex flex-col items-center justify-center space-y-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[70px] ${isActive
                      ? 'bg-[#3aa3eb]/20 text-[#3aa3eb] scale-105'
                      : 'text-gray-400 hover:text-white active:scale-95'
                      }`}
                  >
                    <item.icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                    <span className="text-xs font-medium">{item.name}</span>
                  </NavLink>
                )
              })}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex flex-col items-center justify-center space-y-1 px-4 py-2 rounded-xl transition-all duration-200 text-gray-400 hover:text-white active:scale-95 min-w-[70px]"
              >
                <EllipsisHorizontalIcon className="h-6 w-6" />
                <span className="text-xs font-medium">More</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}>
          <TopNav
            currentUser={currentUser}
            onLogout={onLogout}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            isSidebarCollapsed={isSidebarCollapsed}
          />
          <div
            className={
              isChatRoute
                ? 'h-[calc(100vh-80px)] overflow-hidden min-h-0 p-4 md:p-8 pb-8 md:pb-8'
                : 'min-h-screen p-4 md:p-8 pb-8 md:pb-8'
            }
          >
            {children}
          </div>
        </div>

        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={handleProfileUpdate}
          user={currentUser}
        />
      </div>
    </div>
  )
}
