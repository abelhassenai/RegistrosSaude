import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import TopBar from "@/app/components/TopBar";
import { saveAuthUser, type AuthUser } from "@/app/hooks/useAuth";

expect.extend(toHaveNoViolations);

const nav = vi.hoisted(() => ({ pathname: "/", push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: vi.fn() }),
}));

const PESQUISADOR: AuthUser = {
  token: "t", nome: "Ana", email: "ana@exemplo.com", permissao: "Pesquisador", emoji: "🐝",
};
const ADMIN: AuthUser = { ...PESQUISADOR, nome: "Bia", permissao: "Admin" };

const VISITANTE_ITENS = ["Início", "Abelhas", "Dados", "Jogo", "Entrar"];
const PESQUISADOR_ITENS = ["Início", "Abelhas", "Dados", "Jogo", "Registro"];
const ADMIN_ITENS = [...PESQUISADOR_ITENS, "Usuários", "Colmeias", "Solicitações"];

/** Rótulos dos links dentro de cada <nav> (mobile e desktop). */
function linksPorMenu() {
  return screen.getAllByRole("navigation", { name: /^Navegação principal/ }).map((n) =>
    within(n).getAllByRole("link").map((l) => l.getAttribute("aria-label"))
  );
}

beforeEach(() => {
  localStorage.clear();
  nav.pathname = "/";
  nav.push.mockClear();
});

describe("TopBar — visitante", () => {
  it("mostra os itens de visitante com Entrar, sem avatar", () => {
    render(<TopBar />);
    for (const labels of linksPorMenu()) expect(labels).toEqual(VISITANTE_ITENS);
    expect(screen.queryByRole("button", { name: /menu do usuário/i })).not.toBeInTheDocument();
  });

  it("Entrar leva de volta à página atual após o login", () => {
    nav.pathname = "/dados";
    render(<TopBar />);
    const [entrar] = screen.getAllByRole("link", { name: "Entrar" });
    expect(entrar).toHaveAttribute("href", "/login?redirect=%2Fdados");
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = render(<TopBar />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("TopBar — Pesquisador", () => {
  beforeEach(() => saveAuthUser(PESQUISADOR));

  it("mostra os mesmos itens em qualquer página, sem Entrar e sem itens de admin", () => {
    for (const pathname of ["/", "/abelhas", "/dados", "/jogo/mandacaia-run", "/registro", "/perfil"]) {
      nav.pathname = pathname;
      const { unmount } = render(<TopBar />);
      for (const labels of linksPorMenu()) expect(labels).toEqual(PESQUISADOR_ITENS);
      unmount();
    }
  });

  it("abre o menu do avatar com Editar perfil e Sair da conta", async () => {
    const user = userEvent.setup();
    render(<TopBar />);
    const [avatarMobile] = screen.getAllByRole("button", { name: "Menu do usuário Ana" });
    await user.click(avatarMobile);
    expect(screen.getByRole("button", { name: /editar perfil/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sair da conta/i })).toBeInTheDocument();
  });

  it("volta à versão de visitante logo após sair da conta", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<TopBar onLogout={onLogout} />);
    const [avatarMobile] = screen.getAllByRole("button", { name: "Menu do usuário Ana" });
    await user.click(avatarMobile);
    await user.click(screen.getByRole("button", { name: /sair da conta/i }));

    expect(onLogout).toHaveBeenCalledOnce();
    expect(localStorage.getItem("colmeia_auth")).toBeNull();
    for (const labels of linksPorMenu()) expect(labels).toEqual(VISITANTE_ITENS);
  });

  it("não tem violações de acessibilidade (menu fechado e aberto)", async () => {
    const user = userEvent.setup();
    const { container } = render(<TopBar />);
    expect(await axe(container)).toHaveNoViolations();
    const [, avatarDesktop] = screen.getAllByRole("button", { name: "Menu do usuário Ana" });
    await user.click(avatarDesktop);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("TopBar — Admin", () => {
  beforeEach(() => saveAuthUser(ADMIN));

  it("inclui Usuários, Colmeias e Solicitações em qualquer página", () => {
    for (const pathname of ["/", "/jogo", "/registro", "/admin/colmeias"]) {
      nav.pathname = pathname;
      const { unmount } = render(<TopBar />);
      for (const labels of linksPorMenu()) expect(labels).toEqual(ADMIN_ITENS);
      unmount();
    }
  });

  it("não tem violações de acessibilidade", async () => {
    const { container } = render(<TopBar />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("TopBar — item da página atual", () => {
  beforeEach(() => saveAuthUser(ADMIN));

  it.each([
    ["/", "Início"],
    ["/abelhas", "Abelhas"],
    ["/dados", "Dados"],
    ["/jogo", "Jogo"],
    ["/jogo/mandacaia-run", "Jogo"],
    ["/jogo/reflorestamento", "Jogo"],
    ["/registro", "Registro"],
    ["/admin", "Usuários"],
    ["/admin/colmeias", "Colmeias"],
    ["/admin/solicitacoes", "Solicitações"],
  ])("em %s destaca só %s com aria-current=page", (pathname, ativo) => {
    nav.pathname = pathname;
    render(<TopBar />);
    for (const n of screen.getAllByRole("navigation", { name: /^Navegação principal/ })) {
      const atuais = within(n).getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page");
      expect(atuais.map((l) => l.getAttribute("aria-label"))).toEqual([ativo]);
    }
  });

  it("em /perfil nenhum item fica destacado", () => {
    nav.pathname = "/perfil";
    render(<TopBar />);
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
  });
});
