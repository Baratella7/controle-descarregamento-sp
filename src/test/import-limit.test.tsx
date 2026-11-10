import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setLoaded: vi.fn(), navigate: vi.fn(), readWorkbook: vi.fn() }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/lib/store", () => ({
  useData: () => ({ setLoaded: mocks.setLoaded, spValues: ["SAO"], setSpValues: vi.fn() }),
}));
vi.mock("@/lib/files", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/files")>()),
  LIMITS: { maxBytes: 25 * 1024 * 1024, maxRows: 100 },
  readWorkbook: mocks.readWorkbook,
}));
import { Route } from "@/routes/importar";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Limite de linhas na importação", () => {
  it("permite ajustar o limite após importar e impede confirmação enquanto excedido", async () => {
    const sheet = {
      headers: ["CTE", "TRECHO", "MAN", "VOLS", "LIDOS"],
      rows: Array.from({ length: 101 }, () => ({
        CTE: "A1",
        TRECHO: "CP/SAO",
        MAN: "CP001",
        VOLS: "10",
        LIDOS: "8",
      })),
    };
    mocks.readWorkbook.mockResolvedValue({ sheetNames: ["CSV"], getSheet: () => sheet });
    const Page = Route.options.component as ComponentType;
    const { container } = render(<Page />);
    fireEvent.change(container.querySelector("input[type=file]")!, {
      target: { files: [new File(["csv"], "teste.csv")] },
    });
    const button = await screen.findByRole("button", { name: "Analisar descarregamento" });
    const limit = screen.getByRole("spinbutton");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mocks.setLoaded).not.toHaveBeenCalled();
    expect(screen.getByText(/A aba tem 101 linhas/)).toBeInTheDocument();
    fireEvent.change(limit, { target: { value: "200" } });
    expect(button).toBeEnabled();
    expect(screen.queryByText(/A aba tem 101 linhas/)).not.toBeInTheDocument();
    fireEvent.change(limit, { target: { value: "100" } });
    expect(button).toBeDisabled();
    fireEvent.change(limit, { target: { value: "101" } });
    fireEvent.click(button);
    expect(mocks.setLoaded).toHaveBeenCalledWith(expect.objectContaining({ sheet }));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" });
  });
});
