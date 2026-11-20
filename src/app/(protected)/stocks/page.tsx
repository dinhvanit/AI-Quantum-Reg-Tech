import type { Metadata } from "next";
import { StockUniverse } from "@/components/stocks/StockUniverse";
import { getOverviews } from "@/lib/overview";

export const metadata: Metadata = { title: "Danh sách mã & thêm cổ phiếu | QuantumRegTech" };

export default async function StocksPage() {
  return <StockUniverse items={await getOverviews()} />;
}
