import Link from "next/link";
import { Sparkles, Search, User, Key, LayoutGrid, MessageSquare, Users, ShieldAlert } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200 transition-all duration-300">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-stone-900 group-hover:text-amber-600 transition-colors">
            VibeHub
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link href="/discussions" className="px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" /> 讨论
          </Link>
          <Link href="/discover" className="px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1.5">
            <Search className="w-4 h-4" /> 发现
          </Link>
          <Link href="/teams" className="px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1.5">
            <Users className="w-4 h-4" /> 团队
          </Link>
          <Link href="/workspace/enterprise" className="px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4" /> 工作台
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 border-r border-stone-200 pr-4 mr-1">
            <Link href="/settings/api-keys" className="p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors" title="API Keys">
              <Key className="w-4 h-4" />
            </Link>
            <Link href="/admin" className="p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors" title="Admin">
              <ShieldAlert className="w-4 h-4" />
            </Link>
            <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer" className="text-xs font-bold text-stone-400 hover:text-amber-600 px-2 py-1 rounded-md transition-colors uppercase tracking-wider">
              API
            </a>
          </div>
          
          <a 
            href="/api/v1/auth/demo-login?role=user&redirect=/" 
            className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Demo 登录</span>
          </a>
        </div>
      </div>
    </header>
  );
}
