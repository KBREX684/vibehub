import {
  Menu,
  Search,
  User,
  Compass,
  Plus,
  Bell,
  Users,
  FolderPlus,
  Download,
  Bot,
  ArrowUpRight,
  Globe,
  LogOut,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
  DrawerClose,
} from "./ui/drawer";
import { useState } from "react";

/**
 * Top navigation bar for VibeHub v10.0.  
 *
 * The design spec defines two distinct modes for the top navigation: guest (未登录) and authed (已登录).  
 * This implementation focuses on the authed experience, adding a pill‑style nav group, a create dropdown,  
 * an upgrade button, a notification bell with unread indicator, and a language toggle.  
 * Mobile view collapses the centre nav into a hamburger drawer.  
 */
export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  // Track current language (cn/en); this is a simple toggle for demonstration.
  const [lang, setLang] = useState<"cn" | "en">("cn");

  // Determine active nav based on current path.
  const isActive = (path: string) => location.pathname.startsWith(path);

  // Mock unread notification count; in a real app this would come from state.
  const unreadCount = 3;

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === "/discover") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Create menu items matching the design spec.  
  const createMenuItems = [
    {
      icon: FolderPlus,
      label: "新建项目",
      description: "创建草稿/已公开项目",
      onSelect: () => navigate("/work/library?mode=new"),
    },
    {
      icon: Users,
      label: "新建 Team Workspace",
      description: "邀请 2-10 人协作",
      onSelect: () => navigate("/work/team?mode=new"),
    },
    {
      icon: Download,
      label: "导入项目",
      description: "从 GitHub 链接导入只读镜像",
      onSelect: () => navigate("/work/library?mode=import"),
    },
    {
      icon: Bot,
      label: "发起 Agent 任务",
      description: "跨空间单次 Agent 任务",
      onSelect: () => navigate("/work/agent-tasks?mode=new"),
    },
  ];

  return (
    <header className="h-14 border-b border-vh-border bg-vh-bg flex items-center px-4 md:px-6 justify-between shrink-0 sticky top-0 z-50">
      {/* Left side: mobile menu trigger & logo */}
      <div className="flex items-center gap-4">
        {/* Mobile drawer for nav items */}
        <Drawer>
          <DrawerTrigger asChild>
            <button className="xl:hidden p-1.5 -ml-1.5 text-vh-text-muted hover:text-vh-text rounded hover:bg-vh-surface transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-vh-border-strong">
              <Menu className="w-5 h-5" />
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-left">导航</DrawerTitle>
              <DrawerDescription className="sr-only">导航菜单</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 flex flex-col gap-2 pb-8">
              <DrawerClose asChild>
                <Link
                  to="/discover"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-vh-surface text-vh-text transition-colors ${isActive("/discover") ? "bg-vh-surface border-l-2 border-vh-accent text-vh-text" : ""}`}
                  onClick={() => navigate("/discover")}
                >
                  <Compass className="w-4 h-4" />
                  <span className="text-sm">发现 (Discover)</span>
                </Link>
              </DrawerClose>
              <DrawerClose asChild>
                <Link
                  to="/work/personal"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-vh-surface text-vh-text transition-colors ${isActive("/work") ? "bg-vh-surface border-l-2 border-vh-accent text-vh-text" : ""}`}
                  onClick={() => navigate("/work/personal")}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-sm">工作台 (Workspace)</span>
                </Link>
              </DrawerClose>
              <DrawerClose asChild>
                <Link
                  to="/work/library"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-vh-surface text-vh-text transition-colors ${isActive("/work/library") ? "bg-vh-surface border-l-2 border-vh-accent text-vh-text" : ""}`}
                  onClick={() => navigate("/work/library")}
                >
                  <FolderPlus className="w-4 h-4" />
                  <span className="text-sm">项目库 (Library)</span>
                </Link>
              </DrawerClose>
              <DrawerClose asChild>
                <Link
                  to="/settings"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-vh-surface text-vh-text transition-colors ${isActive("/settings") ? "bg-vh-surface border-l-2 border-vh-accent text-vh-text" : ""}`}
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">设置 (Settings)</span>
                </Link>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Logo and branding */}
        <Link
          to="/discover"
          onClick={handleLogoClick}
          className="font-mono font-bold tracking-tight text-vh-text flex items-center gap-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-vh-border-strong rounded px-1"
        >
          <div className="w-6 h-6 bg-vh-text text-vh-bg rounded-sm flex items-center justify-center">
            <Compass className="w-4 h-4 fill-current stroke-2" />
          </div>
          VibeHub v10
        </Link>
      </div>

      {/* Center nav: visible on desktop */}
      <div className="hidden xl:flex items-center flex-1 justify-center gap-2 ml-8">
        <div className="flex bg-vh-surface border border-vh-border rounded-full p-1">
          <Link
            to="/discover"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive("/discover") ? "bg-vh-elevated border border-vh-border-strong text-vh-text" : "text-vh-text-muted hover:text-vh-text"}`}
          >
            发现
          </Link>
          <Link
            to="/work/personal"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive("/work") ? "bg-vh-elevated border border-vh-border-strong text-vh-text" : "text-vh-text-muted hover:text-vh-text"}`}
          >
            工作台
          </Link>
          <Link
            to="/work/library"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive("/work/library") ? "bg-vh-elevated border border-vh-border-strong text-vh-text" : "text-vh-text-muted hover:text-vh-text"}`}
          >
            项目库
          </Link>
        </div>
      </div>

      {/* Search bar: visible on desktop */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-vh-text-muted group-focus-within:text-vh-text transition-colors" />
          </div>
          <input
            type="text"
            placeholder="搜索全局资源 (⌘K)"
            className="w-full h-8 bg-vh-surface border border-vh-border rounded px-9 text-sm text-vh-text placeholder-vh-text-dark focus:outline-none focus:border-vh-border-strong focus:bg-vh-elevated transition-all"
          />
          <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
            <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-vh-border bg-vh-bg px-1.5 font-mono text-[10px] font-medium text-vh-text-dark">
              ⌘ K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right side: actions */}
      <div className="flex items-center gap-3">
        {/* Create dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-md bg-vh-text text-vh-bg flex items-center justify-center hover:opacity-90 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-vh-border-strong">
              <Plus className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 bg-vh-bg border-vh-border text-vh-text" align="end">
            <DropdownMenuLabel>创建</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-vh-border" />
            {createMenuItems.map((item) => (
              <DropdownMenuItem
                key={item.label}
                onSelect={item.onSelect}
                className="focus:bg-vh-surface focus:text-vh-text cursor-pointer"
              >
                <item.icon className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  <span className="text-xs text-vh-text-muted">{item.description}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Upgrade button (visible for free tier) */}
        <button className="hidden md:inline-flex items-center px-3 h-8 rounded-md border border-vh-border bg-vh-bg text-vh-warning hover:bg-vh-surface transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-vh-warning">
          升级
        </button>

        {/* Notification bell */}
        <button className="relative w-8 h-8 rounded-md bg-vh-bg border border-vh-border flex items-center justify-center text-vh-text-muted hover:text-vh-text hover:bg-vh-elevated transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-vh-border-strong">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-vh-accent text-[8px] font-mono text-vh-bg">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Language toggle */}
        <button
          className="hidden md:inline-flex items-center px-2 h-8 rounded-md border border-vh-border bg-vh-bg text-vh-text-muted hover:text-vh-text hover:bg-vh-elevated transition-colors font-mono text-xs"
          onClick={() => setLang(lang === "cn" ? "en" : "cn")}
        >
          {lang === "cn" ? "EN" : "中"}
        </button>

        {/* User avatar and account menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-vh-surface border border-vh-border flex items-center justify-center text-vh-text-muted hover:text-vh-text transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-vh-border-strong">
              <User className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-vh-bg border-vh-border text-vh-text">
            <DropdownMenuLabel>我的账号</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-vh-border" />
            <DropdownMenuItem asChild className="focus:bg-vh-surface focus:text-vh-text cursor-pointer">
              <Link to="/work/personal" className="flex items-center w-full">
                <User className="w-4 h-4 mr-2" /> 个人资料
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="focus:bg-vh-surface focus:text-vh-text cursor-pointer">
              <Link to="/settings" className="flex items-center w-full">
                <Settings className="w-4 h-4 mr-2" /> 设置
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-vh-border" />
            <DropdownMenuItem className="text-red-500 focus:bg-vh-surface focus:text-red-400 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" /> 退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}