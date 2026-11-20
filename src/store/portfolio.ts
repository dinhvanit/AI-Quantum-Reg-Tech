import { create } from "zustand";

interface PortfolioState {
  /** DN người dùng đã bấm "Thêm vào danh mục" ở Cổng 1. */
  watchlist: string[];
  selectedTickers: string[];
  addToWatchlist: (ticker: string) => void;
  setSelectedTickers: (tickers: string[]) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  watchlist: [],
  selectedTickers: [],
  addToWatchlist: (ticker) =>
    set((s) => (s.watchlist.includes(ticker) ? s : { watchlist: [...s.watchlist, ticker] })),
  setSelectedTickers: (tickers) => set({ selectedTickers: [...new Set(tickers)] }),
}));
