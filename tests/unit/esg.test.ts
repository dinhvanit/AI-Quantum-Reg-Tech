import { describe, expect, it } from "vitest";
import { getEsgIndicators } from "@/lib/api";
import { peerAverage, pillarDisclosure, rankInPeers } from "@/lib/esg";

const PEERS = ["VNM", "MCH", "MCM", "SBT", "QNS", "KDC", "PAN", "IDP", "SAB"];

describe("chỉ tiêu ESG công bố (sheet GOC_ESG, năm 2024)", async () => {
  const set = await getEsgIndicators();

  it("đủ 32 chỉ tiêu, 3 trụ cột, 9 DN", () => {
    expect(set.year).toBe(2024);
    expect(set.indicators).toHaveLength(32);
    expect(new Set(set.indicators.map((i) => i.pillar))).toEqual(new Set(["E", "S", "G"]));
    for (const t of PEERS) expect(set.values[t], t).toBeDefined();
  });

  it("đếm thực hành / số liệu định lượng", () => {
    // E 2024: 6 chỉ tiêu có/không (E_03,04,05,10,11,12), 6 định lượng (E_01,02,06,07,08,09).
    expect(pillarDisclosure(set, "VNM", "E")).toEqual({ pillar: "E", practicesYes: 6, practicesTotal: 6, quantDisclosed: 6, quantTotal: 6 });
    // IDP: không thực hành E nào, không công bố số E nào.
    expect(pillarDisclosure(set, "IDP", "E")).toEqual({ pillar: "E", practicesYes: 0, practicesTotal: 6, quantDisclosed: 0, quantTotal: 6 });
  });

  it("trung bình nhóm", () => {
    // G_03 (tách Chủ tịch/TGĐ) = 1 cho cả 9 DN.
    expect(peerAverage(set, PEERS, "G").practicesYes).toBeGreaterThanOrEqual(1);
  });

  it("xếp hạng theo chiều tốt của chỉ tiêu", () => {
    const e09 = set.indicators.find((i) => i.code === "E_09")!; // tỷ lệ năng lượng tái tạo, (+)
    expect(rankInPeers(set, e09, "SBT", PEERS)).toEqual({ rank: 1, of: 5 }); // 91,04%
    const e02 = set.indicators.find((i) => i.code === "E_02")!; // cường độ phát thải, (−)
    expect(rankInPeers(set, e02, "SAB", PEERS)).toEqual({ rank: 1, of: 6 }); // 2,224 thấp nhất
    expect(rankInPeers(set, e02, "PAN", PEERS)).toEqual({ rank: 6, of: 6 }); // 5,47
    expect(rankInPeers(set, e02, "IDP", PEERS)).toBeNull(); // chưa công bố
  });

  it("UI không xếp hạng số tuyệt đối phụ thuộc quy mô", () => {
    for (const code of ["E_01", "E_06", "E_08", "S_01", "S_09"]) {
      const ind = set.indicators.find((i) => i.code === code)!;
      expect(ind.sizeDependent, code).toBe(true);
      expect(rankInPeers(set, ind, "VNM", PEERS), code).toBeNull();
    }
  });
});
