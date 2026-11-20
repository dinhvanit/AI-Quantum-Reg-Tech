import { create } from "zustand";
import type { PortfolioParams } from "@/lib/types";

interface PortfolioState {
  /** α lợi nhuận · β rủi ro biến động · γ ESG · δ phạt rủi ro (0–1). */
  params: PortfolioParams;
  /** DN người dùng đã bấm "Thêm vào danh mục" ở Cổng 1. */
  watchlist: string[];
  selectedTickers: string[];
  setParam: (key: keyof PortfolioParams, value: number) => void;
  resetParams: () => void;
  addToWatchlist: (ticker: string) => void;
  setSelectedTickers: (tickers: string[]) => void;
}

const DEFAULT_PARAMS: PortfolioParams = { alpha: 1, beta: 1, gamma: 1, delta: 1 };

export const usePortfolioStore = create<PortfolioState>((set) => ({
  params: DEFAULT_PARAMS,
  watchlist: [],
  selectedTickers: [],
  setParam: (key, value) => set((s) => ({ params: { ...s.params, [key]: value } })),
  resetParams: () => set({ params: DEFAULT_PARAMS }),
  addToWatchlist: (ticker) =>
    set((s) => (s.watchlist.includes(ticker) ? s : { watchlist: [...s.watchlist, ticker] })),
  setSelectedTickers: (tickers) => set({ selectedTickers: [...new Set(tickers)] }),
}));
