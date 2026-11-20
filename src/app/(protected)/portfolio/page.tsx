import type { Metadata } from "next";
import { PortfolioBuilder } from "@/components/portfolio/PortfolioBuilder";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFinancialEngineData } from "@/lib/financial-engine";

export const metadata: Metadata = { title: "Tạo danh mục đầu tư | QuantumRegTech" };

export default async function PortfolioPage() {
  try {
    const { records } = await getFinancialEngineData(2024);
    return <PortfolioBuilder records={records} />;
  } catch (error) {
    return <Card><CardHeader><CardTitle>Chưa tải được dữ liệu danh mục</CardTitle><CardDescription>{error instanceof Error ? error.message : "Không kết nối được dịch vụ dữ liệu."}</CardDescription></CardHeader></Card>;
  }
}
