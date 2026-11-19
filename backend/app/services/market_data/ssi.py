"""Read-only SSI FastConnect V3 daily OHLCV client.

The adapter preserves provider values and explicitly labels them raw. It does not
claim split/dividend adjustment or permit a portfolio backtest by itself.
"""

from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx


class SsiMarketDataError(RuntimeError):
    pass


@dataclass(frozen=True)
class SsiHistoryResult:
    symbol: str
    from_date: date
    to_date: date
    fetched_at: str
    data: list[dict[str, Any]]
    rate_limit: dict[str, str | None]


def _decimal(value: Any, field: str) -> Decimal:
    raw = str(value).strip()
    if not raw:
        raise SsiMarketDataError(f"SSI OHLCV field {field} is empty")
    if re.fullmatch(r"-?\d{1,3}(,\d{3})+(\.\d+)?", raw):
        raw = raw.replace(",", "")
    try:
        result = Decimal(raw)
    except InvalidOperation as exc:
        raise SsiMarketDataError(f"SSI OHLCV field {field} is not numeric") from exc
    if not result.is_finite():
        raise SsiMarketDataError(f"SSI OHLCV field {field} is not finite")
    return result


def _date(value: str) -> date:
    for pattern in ("%Y/%m/%d", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(value[:19], pattern).date()
        except ValueError:
            continue
    raise SsiMarketDataError("SSI returned an unrecognized tradingDate")


class SsiMarketDataClient:
    def __init__(self, api_key: str | None = None, api_secret: str | None = None, base_url: str | None = None):
        self.api_key = api_key or os.getenv("SSI_API_KEY", "")
        self.api_secret = api_secret or os.getenv("SSI_API_SECRET", "")
        self.base_url = (base_url or os.getenv("SSI_API_BASE_URL", "https://api.ssi.com.vn")).rstrip("/")
        self._token: str | None = None
        self._token_expires_at = 0.0
        self.rate_limit: dict[str, str | None] = {"limit": None, "remaining": None, "reset": None}

    async def _access_token(self, client: httpx.AsyncClient) -> str:
        if self._token and time.time() < self._token_expires_at - 60:
            return self._token
        if not self.api_key or not self.api_secret:
            raise SsiMarketDataError("SSI_API_KEY/SSI_API_SECRET are required; see SSI FastConnect registration.")
        try:
            response = await client.post(
                f"{self.base_url}/api/v3/auth/token",
                json={"apiKey": self.api_key, "apiSecret": self.api_secret},
            )
        except httpx.HTTPError as exc:
            raise SsiMarketDataError("Could not connect to SSI token endpoint") from exc
        if response.status_code >= 400:
            raise SsiMarketDataError(f"SSI token endpoint returned HTTP {response.status_code}")
        body = response.json()
        token = body.get("accessToken")
        if not isinstance(token, str) or not token:
            raise SsiMarketDataError("SSI token response did not contain accessToken")
        self._token = token
        expiry = body.get("expiresAt")
        self._token_expires_at = float(expiry) if isinstance(expiry, (int, float)) else time.time() + 15 * 60
        return token

    async def daily_ohlcv(self, symbol: str, from_date: date, to_date: date, page_size: int = 500) -> SsiHistoryResult:
        symbol = symbol.strip().upper()
        if not re.fullmatch(r"[A-Z0-9]{1,12}", symbol):
            raise ValueError("symbol must contain 1–12 letters or digits")
        if from_date > to_date:
            raise ValueError("from_date must be <= to_date")
        if not 1 <= page_size <= 1000:
            raise ValueError("page_size must be between 1 and 1000")

        rows: dict[date, dict[str, Any]] = {}
        async with httpx.AsyncClient(timeout=httpx.Timeout(30, connect=8), follow_redirects=False) as client:
            token = await self._access_token(client)
            page = 1
            while True:
                try:
                    response = await client.get(
                        f"{self.base_url}/api/v3/data/ohlc",
                        params={
                            "symbol": symbol,
                            "from": from_date.strftime("%Y/%m/%d"),
                            "to": to_date.strftime("%Y/%m/%d"),
                            "timeFrame": "1d",
                            "pageIndex": page,
                            "pageSize": page_size,
                        },
                        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    )
                except httpx.HTTPError as exc:
                    raise SsiMarketDataError("Could not retrieve SSI daily OHLCV") from exc
                self.rate_limit = {
                    "limit": response.headers.get("X-RATELIMIT-LIMIT"),
                    "remaining": response.headers.get("X-RATELIMIT-REMAINING"),
                    "reset": response.headers.get("X-RATELIMIT-RESET"),
                }
                if response.status_code == 429:
                    raise SsiMarketDataError(f"SSI rate limit reached; reset={self.rate_limit['reset'] or 'unknown'}")
                if response.status_code >= 400:
                    raise SsiMarketDataError(f"SSI OHLC endpoint returned HTTP {response.status_code}")
                payload = response.json()
                items = payload.get("data", []) if isinstance(payload, dict) else None
                if not isinstance(items, list):
                    raise SsiMarketDataError("SSI OHLC response has no data array")
                for item in items:
                    trading_date = _date(str(item.get("tradingDate", "")))
                    if not from_date <= trading_date <= to_date:
                        continue
                    bar = {
                        "symbol": symbol,
                        "trade_date": trading_date.isoformat(),
                        "open_raw": str(item.get("open", "")),
                        "high_raw": str(item.get("high", "")),
                        "low_raw": str(item.get("low", "")),
                        "close_raw": str(item.get("close", "")),
                        "volume_raw": str(item.get("volume", "")),
                        "value_raw": str(item.get("value", "")),
                        "source": "ssi_fastconnect_v3",
                        "price_adjustment": "raw_unadjusted_until_corporate_actions_checked",
                    }
                    bar["open"] = _decimal(bar["open_raw"], "open")
                    bar["high"] = _decimal(bar["high_raw"], "high")
                    bar["low"] = _decimal(bar["low_raw"], "low")
                    bar["close"] = _decimal(bar["close_raw"], "close")
                    bar["volume"] = _decimal(bar["volume_raw"], "volume")
                    if bar["low"] > min(bar["open"], bar["close"]) or bar["high"] < max(bar["open"], bar["close"]) or bar["high"] < bar["low"]:
                        raise SsiMarketDataError(f"Invalid OHLC bounds for {symbol} on {trading_date.isoformat()}")
                    if trading_date in rows and rows[trading_date] != bar:
                        raise SsiMarketDataError(f"Conflicting duplicate bar for {symbol} on {trading_date.isoformat()}")
                    rows[trading_date] = bar
                if len(items) < page_size:
                    break
                page += 1

        fetched_at = datetime.now(timezone.utc).isoformat()
        result = []
        for day in sorted(rows):
            item = rows[day]
            for key in ("open", "high", "low", "close", "volume"):
                item[key] = str(item[key])
            item["fetched_at"] = fetched_at
            result.append(item)
        return SsiHistoryResult(symbol, from_date, to_date, fetched_at, result, self.rate_limit.copy())
