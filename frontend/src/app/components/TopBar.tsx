"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  House, BarChart2, Pencil, UserPen, LogOut, Users, Database, Hexagon, Info, Gamepad2, LogIn,
} from "lucide-react";
import IconAvatar from "@/app/components/IconAvatar";
import { useAuth, clearAuthUser, type AuthUser } from "@/app/hooks/useAuth";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  /** Destaca o item também nas sub-rotas (ex.: /jogo/mandacaia-run). */
  matchSubpaths?: boolean;
}

const ICON = { size: 17, strokeWidth: 2 } as const;

const NAV_ITEMS_PUBLICOS: NavItem[] = [
  { icon: <House {...ICON} />,     label: "Início",  href: "/" },
  { icon: <Info {...ICON} />,      label: "Abelhas", href: "/abelhas" },
  { icon: <BarChart2 {...ICON} />, label: "Dados",   href: "/dados" },
  { icon: <Gamepad2 {...ICON} />,  label: "Jogo",    href: "/jogo", matchSubpaths: true },
];

const NAV_ITEMS_LOGADO: NavItem[] = [
  { icon: <Pencil {...ICON} />, label: "Registro", href: "/registro" },
];

const NAV_ITEMS_ADMIN: NavItem[] = [
  { icon: <Users {...ICON} />,    label: "Usuários",     href: "/admin" },
  { icon: <Hexagon {...ICON} />,  label: "Colmeias",     href: "/admin/colmeias" },
  { icon: <Database {...ICON} />, label: "Solicitações", href: "/admin/solicitacoes" },
];

/** Itens do menu: dependem só do login e do perfil, nunca da página. */
export function getNavItems(user: AuthUser | null): NavItem[] {
  if (!user) return NAV_ITEMS_PUBLICOS;
  const items = [...NAV_ITEMS_PUBLICOS, ...NAV_ITEMS_LOGADO];
  return user.permissao === "Admin" ? [...items, ...NAV_ITEMS_ADMIN] : items;
}

export function isItemActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  return !!item.matchSubpaths && pathname.startsWith(item.href + "/");
}

interface TopBarProps {
  /** Ação extra da página após sair da conta (ex.: redirecionar para /login). */
  onLogout?: () => void;
}

export default function TopBar({ onLogout }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Enquanto o login é lido, ocupa o espaço do menu sem mostrar a versão de
  // visitante, para o menu não "piscar".
  if (loading) {
    return (
      <div className="sm:hidden w-full invisible" aria-hidden="true">
        <div className="px-4 py-3"><div className="h-9" /></div>
      </div>
    );
  }

  const navItems = getNavItems(user);
  const loginHref = pathname === "/" ? "/login" : `/login?redirect=${encodeURIComponent(pathname)}`;

  function goToPerfil() {
    setMenuOpen(false);
    router.push("/perfil");
  }

  function handleLogout() {
    setMenuOpen(false);
    clearAuthUser();
    onLogout?.();
  }

  function renderItems(variant: "mobile" | "desktop") {
    return navItems.map((item) => {
      const isActive = isItemActive(item, pathname);
      const stateClass = variant === "mobile"
        ? (isActive ? "bg-amber-400 text-yellow-950 shadow-inner" : "text-yellow-400 hover:bg-yellow-900")
        : (isActive ? "bg-amber-400 text-yellow-950 shadow-inner scale-110" : "text-yellow-500 hover:bg-yellow-800 hover:text-yellow-300");
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-label={item.label}
          title={item.label}
          aria-current={isActive ? "page" : undefined}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${stateClass}`}
        >
          {item.icon}
        </Link>
      );
    });
  }

  const permissaoLabel = (curto: boolean) =>
    user?.permissao === "Admin" ? (curto ? "Admin" : "Administrador") : "Pesquisador(a)";
  const permissaoClass = user?.permissao === "Admin" ? "bg-amber-400 text-amber-950" : "bg-yellow-100 text-yellow-900";

  return (
    <>
      {/* ── Mobile: barra horizontal no topo ── */}
      <nav
        className="sm:hidden w-full bg-white rounded-2xl shadow-xl overflow-hidden"
        aria-label="Navegação principal (celular)"
      >
        <div className="bg-yellow-950 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 flex-wrap">{renderItems("mobile")}</div>

          {user ? (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-full p-1"
              aria-label={`Menu do usuário ${user.nome}`}
              aria-expanded={menuOpen}
            >
              <IconAvatar icon={user.emoji} size="xs" className="ring-2 ring-yellow-700 shrink-0" />
            </button>
          ) : (
            <Link
              href={loginHref}
              aria-label="Entrar"
              title="Entrar"
              className="flex items-center justify-center w-9 h-9 rounded-full text-yellow-400 hover:bg-yellow-900 transition-all duration-200"
            >
              <LogIn {...ICON} />
            </Link>
          )}
        </div>

        {/* Dropdown mobile */}
        {user && menuOpen && (
          <div className="bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-3 px-1 pb-2 border-b border-gray-100 mb-1">
              <IconAvatar icon={user.emoji} size="xs" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-yellow-950 truncate">{user.nome}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${permissaoClass}`}>
                {permissaoLabel(true)}
              </span>
            </div>
            <button
              type="button"
              onClick={goToPerfil}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg px-3 py-2 transition-colors"
            >
              <UserPen size={15} /> Editar perfil
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg px-3 py-2 transition-colors"
            >
              <LogOut size={15} /> Sair da conta
            </button>
          </div>
        )}
      </nav>

      {/* ── Desktop: pill flutuante no canto superior direito ── */}
      <nav
        className="hidden sm:flex fixed top-6 right-16 z-50 items-center"
        aria-label="Navegação principal"
      >
        <div className="relative flex items-center">
          <div className={`flex items-center bg-yellow-950 border-2 border-yellow-800 rounded-full px-2.5 py-2 gap-1.5 shadow-md ${user ? "pr-14" : ""}`}>
            {renderItems("desktop")}
            {!user && (
              <Link
                href={loginHref}
                aria-label="Entrar"
                title="Entrar"
                className="flex items-center justify-center w-9 h-9 rounded-full text-yellow-500 hover:bg-yellow-800 hover:text-yellow-300 transition-all duration-200"
              >
                <LogIn {...ICON} />
              </Link>
            )}
          </div>

          {/* Avatar sobrepondo a borda direita do pill */}
          {user && (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={`Menu do usuário ${user.nome}`}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className="absolute -right-1 flex items-center justify-center hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded-full"
            >
              <IconAvatar icon={user.emoji} size="sm" className="ring-2 ring-yellow-950 shadow-md" />
            </button>
          )}
        </div>

        {/* Dropdown desktop */}
        {user && menuOpen && (
          <>
            <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setMenuOpen(false)} />
            <div
              className="absolute right-0 top-14 z-50 w-56 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
              role="menu"
            >
              <div className="bg-yellow-950 px-4 py-4 flex flex-col items-center gap-2">
                <IconAvatar icon={user.emoji} size="md" />
                <div className="text-center">
                  <p className="text-yellow-300 font-bold text-sm leading-tight">{user.nome}</p>
                  <p className="text-yellow-500 text-xs mt-0.5 truncate max-w-[160px]">{user.email}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${permissaoClass}`}>
                  {permissaoLabel(false)}
                </span>
              </div>
              <div className="px-3 py-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={goToPerfil}
                  role="menuitem"
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 transition-colors"
                >
                  <UserPen size={14} /> Editar perfil
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  role="menuitem"
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                >
                  <LogOut size={14} /> Sair da conta
                </button>
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}
