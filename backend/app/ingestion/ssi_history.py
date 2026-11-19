"""Download raw daily SSI OHLCV history to a local JSON artifact."""

from __future__ import annotations

import argparse
import asyncio
import json
from datetime import date
from pathlib import Path

from app.core.config import ROOT
from app.services.market_data.ssi import SsiMarketDataClient


async def _run(args: argparse.Namespace) -> None:
    client = SsiMarketDataClient()
    output = Path(args.output) if args.output else ROOT / "data" / "research" / "raw" / "ssi_daily_ohlcv.jsonl"
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("a", encoding="utf-8") as stream:
        for symbol in args.symbols:
            result = await client.daily_ohlcv(symbol, date.fromisoformat(args.from_date), date.fromisoformat(args.to_date))
            for row in result.data:
                stream.write(json.dumps(row, ensure_ascii=False) + "\n")
            print(f"{symbol}: {len(result.data)} daily bars; rate-limit remaining={result.rate_limit.get('remaining')}")
    print(f"Raw provider output appended to {output.relative_to(ROOT) if output.is_relative_to(ROOT) else output}")
    print("Data is raw/unadjusted. Do not run return/backtest calculations until corporate actions, units, and series quality are validated.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--symbols", nargs="+", required=True)
    parser.add_argument("--from-date", required=True)
    parser.add_argument("--to-date", required=True)
    parser.add_argument("--output")
    asyncio.run(_run(parser.parse_args()))


if __name__ == "__main__":
    main()
