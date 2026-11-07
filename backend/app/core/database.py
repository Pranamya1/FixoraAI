import logging
import httpx
import asyncio
from typing import Optional, Any, Dict, List
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger("fixora.database")

DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000002"


def _serialize(obj: Any) -> Any:
    """Recursively convert datetimes to ISO strings for JSON."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(i) for i in obj]
    return obj


class SupabaseHTTP:
    """
    Thin async Supabase REST client using httpx directly.
    Avoids the sync postgrest client's DNS issues in async contexts.
    """

    def __init__(self, url: str, key: str):
        self.base = f"{url}/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def select(self, table: str, filters: Dict[str, Any] = {}, order: str = None, limit: int = None) -> List[Dict]:
        params: Dict[str, str] = {"select": "*"}
        for k, v in filters.items():
            params[f"{k}"] = f"eq.{v}"
        if order:
            params["order"] = order
        if limit:
            params["limit"] = str(limit)
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get(f"{self.base}/{table}", params=params, headers=self.headers)
            r.raise_for_status()
            return r.json()

    async def upsert(self, table: str, data: Dict) -> Dict:
        h = {**self.headers, "Prefer": "resolution=merge-duplicates,return=representation"}
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.post(f"{self.base}/{table}", json=_serialize(data), headers=h)
            r.raise_for_status()
            result = r.json()
            return result[0] if isinstance(result, list) and result else data

    async def update(self, table: str, filters: Dict[str, str], data: Dict) -> None:
        params = {k: f"eq.{v}" for k, v in filters.items()}
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.patch(f"{self.base}/{table}", params=params, json=_serialize(data), headers=self.headers)
            r.raise_for_status()

    async def delete(self, table: str, filters: Dict[str, str]) -> None:
        params = {k: f"eq.{v}" for k, v in filters.items()}
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.delete(f"{self.base}/{table}", params=params, headers=self.headers)
            r.raise_for_status()

    async def ping(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                r = await client.get(f"{self.base}/posts", params={"select": "id", "limit": "1"}, headers=self.headers)
                return r.status_code < 500
        except Exception:
            return False


class DatabaseManager:
    _instance: Optional["DatabaseManager"] = None
    _sb: Optional[SupabaseHTTP] = None
    supabase: Optional[Any] = None
    is_connected: bool = False

    # In-memory store — always kept in sync, used as fallback
    _memory_store: Dict[str, List[Dict[str, Any]]] = {
        "organizations": [
            {"id": DEFAULT_ORG_ID, "name": "Fixora Default Organization", "slug": "fixora-default", "plan": "enterprise"}
        ],
        "users": [],
        "brand_guidelines": [],
        "guideline_chunks": [],
        "posts": [],
        "audit_reports": [],
        "violations": [],
        "webhooks": [],
        "webhook_dispatch_logs": [],
        "publish_history": [],
        "connected_accounts": [],
    }

    def __init__(self):
        url = settings.SUPABASE_URL.strip()
        key = (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY).strip()
        if url and key and not url.startswith("https://your-project"):
            self._sb = SupabaseHTTP(url, key)
            try:
                from supabase import create_client
                self.supabase = create_client(url, key)
            except Exception as e:
                logger.warning(f"Failed to create supabase SDK client: {e}")
                self.supabase = None
            self.is_connected = True
            logger.info("✅ Supabase HTTP and SDK clients configured.")
        else:
            logger.info("Supabase credentials missing — running in-memory mode.")

    async def _test_connection(self):
        """Call once at startup to verify real connectivity."""
        if self._sb:
            ok = await self._sb.ping()
            if ok:
                logger.info("✅ Supabase connection verified.")
            else:
                logger.warning("⚠️ Supabase ping failed — falling back to in-memory mode.")
                self.is_connected = False

    async def preload_data(self):
        """Preload posts, violations, and audit reports from Supabase into memory cache."""
        if self.is_connected and self._sb:
            try:
                rows = await self._sb.select("posts", order="created_at.desc")
                if rows:
                    self._memory_store["posts"] = rows
                    logger.info(f"✅ Preloaded {len(rows)} posts from Supabase into memory store.")
                v_rows = await self._sb.select("violations")
                if v_rows:
                    self._memory_store["violations"] = v_rows
                    logger.info(f"✅ Preloaded {len(v_rows)} violations from Supabase into memory store.")
                r_rows = await self._sb.select("audit_reports")
                if r_rows:
                    self._memory_store["audit_reports"] = r_rows
                    logger.info(f"✅ Preloaded {len(r_rows)} audit reports from Supabase into memory store.")
            except Exception as e:
                logger.warning(f"Failed to preload data from Supabase: {e}")

    # ─── POSTS ────────────────────────────────────────────────────────────────

    async def save_post(self, post: Dict[str, Any]) -> Dict[str, Any]:
        # Keep memory in sync
        existing = [p for p in self._memory_store["posts"] if p.get("id") == post.get("id")]
        if existing:
            existing[0].update(post)
        else:
            self._memory_store["posts"].insert(0, post)

        if self.is_connected and self._sb:
            try:
                await self._sb.upsert("posts", post)
            except Exception as e:
                logger.warning(f"Supabase save_post failed: {e}")
        return post

    async def get_posts(self, org_id: str, status: Optional[str] = None, channel: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.is_connected and self._sb:
            try:
                filters = {"org_id": org_id}
                if status:
                    filters["status"] = status
                rows = await self._sb.select("posts", filters=filters, order="created_at.desc")
                # Sync into memory
                for p in rows:
                    mem = [m for m in self._memory_store["posts"] if m.get("id") == p.get("id")]
                    if mem:
                        mem[0].update(p)
                    else:
                        self._memory_store["posts"].append(p)
                if channel:
                    rows = [p for p in rows if (p.get("intent_tags") or {}).get("target_channel", "").lower() == channel.lower()]
                return rows
            except Exception as e:
                logger.warning(f"Supabase get_posts failed: {e}. Using memory store.")

        posts = [p for p in self._memory_store["posts"] if p.get("org_id") == org_id]
        if status:
            posts = [p for p in posts if p.get("status") == status]
        if channel:
            posts = [p for p in posts if (p.get("intent_tags") or {}).get("target_channel", "").lower() == channel.lower()]
        return posts

    async def get_post_by_id(self, post_id: str) -> Optional[Dict[str, Any]]:
        if self.is_connected and self._sb:
            try:
                rows = await self._sb.select("posts", filters={"id": post_id}, limit=1)
                if rows:
                    post = rows[0]
                    mem = [m for m in self._memory_store["posts"] if m.get("id") == post_id]
                    if mem:
                        mem[0].update(post)
                    else:
                        self._memory_store["posts"].append(post)
                    return post
            except Exception as e:
                logger.warning(f"Supabase get_post_by_id failed: {e}. Using memory store.")

        posts = [p for p in self._memory_store["posts"] if p.get("id") == post_id]
        return posts[0] if posts else None

    async def update_post(self, post_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        post = await self.get_post_by_id(post_id)
        if not post:
            return None
        post.update(updates)
        post["updated_at"] = datetime.utcnow()

        if self.is_connected and self._sb:
            try:
                payload = {**updates, "updated_at": post["updated_at"]}
                await self._sb.update("posts", {"id": post_id}, payload)
            except Exception as e:
                logger.warning(f"Supabase update_post failed: {e}")
        return post

    async def delete_post(self, post_id: str) -> bool:
        orig = len(self._memory_store["posts"])
        self._memory_store["posts"] = [p for p in self._memory_store["posts"] if p.get("id") != post_id]
        deleted = len(self._memory_store["posts"]) < orig

        if self.is_connected and self._sb:
            try:
                await self._sb.delete("posts", {"id": post_id})
            except Exception as e:
                logger.warning(f"Supabase delete_post failed: {e}")
        return deleted

    # ─── AUDIT REPORTS ────────────────────────────────────────────────────────

    async def save_audit_report(self, report: Dict[str, Any]) -> Dict[str, Any]:
        report_row = {k: v for k, v in report.items() if k not in ["violations", "visual_audit"]}
        self._memory_store["audit_reports"].append(report)

        if self.is_connected and self._sb:
            try:
                await self._sb.upsert("audit_reports", report_row)
            except Exception as e:
                logger.warning(f"Supabase save_audit_report failed: {e}")
        return report

    async def save_violation(self, violation: Dict[str, Any]) -> Dict[str, Any]:
        self._memory_store["violations"].append(violation)

        if self.is_connected and self._sb:
            try:
                await self._sb.upsert("violations", violation)
            except Exception as e:
                logger.warning(f"Supabase save_violation failed: {e}")
        return violation

    async def get_audit_report(self, post_id: str) -> Optional[Dict[str, Any]]:
        mem_reports = [r for r in self._memory_store["audit_reports"] if r.get("post_id") == post_id]
        mem_visual = mem_reports[-1].get("visual_audit") if mem_reports else None

        if self.is_connected and self._sb:
            try:
                rows = await self._sb.select("audit_reports", filters={"post_id": post_id}, order="evaluated_at.desc", limit=1)
                if rows:
                    report = rows[0]
                    v_rows = await self._sb.select("violations", filters={"post_id": post_id, "is_resolved": "false"})
                    report["violations"] = v_rows
                    if mem_visual:
                        report["visual_audit"] = mem_visual
                    return report
            except Exception as e:
                logger.warning(f"Supabase get_audit_report failed: {e}. Using memory store.")

        if not mem_reports:
            return None
        latest = dict(mem_reports[-1])
        latest["violations"] = [v for v in self._memory_store["violations"] if v.get("post_id") == post_id and not v.get("is_resolved")]
        return latest

    def get_violations(self, post_id: str) -> List[Dict[str, Any]]:
        return [v for v in self._memory_store["violations"] if v.get("post_id") == post_id and not v.get("is_resolved")]

    async def resolve_violation(self, violation_id: str):
        for v in self._memory_store["violations"]:
            if v.get("id") == violation_id:
                v["is_resolved"] = True

        if self.is_connected and self._sb:
            try:
                await self._sb.update("violations", {"id": violation_id}, {"is_resolved": True})
            except Exception as e:
                logger.warning(f"Supabase resolve_violation failed: {e}")

    async def resolve_all_violations(self, post_id: str):
        for v in self._memory_store["violations"]:
            if v.get("post_id") == post_id:
                v["is_resolved"] = True

        if self.is_connected and self._sb:
            try:
                await self._sb.update("violations", {"post_id": post_id}, {"is_resolved": True})
            except Exception as e:
                logger.warning(f"Supabase resolve_all_violations failed: {e}")

    # ─── ANALYTICS ────────────────────────────────────────────────────────────

    async def get_posts_summary(self, org_id: str) -> Dict[str, Any]:
        if self.is_connected and self._sb:
            try:
                rows = await self._sb.select("posts", filters={"org_id": org_id})
                total = len(rows)
                approved = sum(1 for r in rows if r.get("status") in ["APPROVED", "PUBLISHED"])
                action_req = sum(1 for r in rows if r.get("status") == "ACTION_REQUIRED")
                scores = [r["compliance_score"] for r in rows if r.get("compliance_score") is not None]
                avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
                return {"total_posts": total, "approved_posts": approved, "action_required_posts": action_req, "average_compliance_score": avg_score}
            except Exception as e:
                logger.warning(f"Supabase get_posts_summary failed: {e}. Using memory store.")

        posts = [p for p in self._memory_store["posts"] if p.get("org_id") == org_id]
        scores = [p["compliance_score"] for p in posts if p.get("compliance_score") is not None]
        return {
            "total_posts": len(posts),
            "approved_posts": sum(1 for p in posts if p.get("status") in ["APPROVED", "PUBLISHED"]),
            "action_required_posts": sum(1 for p in posts if p.get("status") == "ACTION_REQUIRED"),
            "average_compliance_score": round(sum(scores) / len(scores), 1) if scores else 0.0,
        }

    # ─── SINGLETON ────────────────────────────────────────────────────────────

    @classmethod
    def get_instance(cls) -> "DatabaseManager":
        if cls._instance is None:
            cls._instance = DatabaseManager()
        return cls._instance


db_manager = DatabaseManager.get_instance()


def get_db() -> DatabaseManager:
    return db_manager
