import logging
import httpx
from datetime import datetime
from typing import Dict, Any, Optional
from app.core.database import db_manager
from app.core.config import settings

logger = logging.getLogger("fixora.webhooks")

class WebhookDispatcher:
    def __init__(self):
        self.db = db_manager

    async def dispatch_fast_track_approval(
        self,
        post: Dict[str, Any],
        audit_report: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Dispatches real-time approval notification to configured webhooks (Slack, Teams, WhatsApp).
        Triggered when a post achieves high/100% compliance.
        """
        results = []
        score = audit_report.get("compliance_score", 100)
        post_title = post.get("title", "Untitled Post")
        post_body = post.get("body", "")
        intent = post.get("intent_tags", {})
        
        # Build Slack Block Kit payload
        slack_payload = {
            "text": f"🚀 FixoraAI Fast-Track Sign-Off: '{post_title}' ({score}% Compliant)",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "✨ Fast-Track Sign-Off Request"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Post:* {post_title}"},
                        {"type": "mrkdwn", "text": f"*Compliance Score:* *{score}%* (Verified)"},
                        {"type": "mrkdwn", "text": f"*Channel:* {intent.get('target_channel', 'Multi-channel')}"},
                        {"type": "mrkdwn", "text": f"*Goal:* {intent.get('campaign_goal', 'General')}"}
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Draft Preview:*\n> {post_body[:300]}{'...' if len(post_body) > 300 else ''}"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "✅ 1-Click Approve & Publish"},
                            "style": "primary",
                            "value": f"approve_{post.get('id')}"
                        },
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "🔍 Review in Studio"},
                            "url": "http://localhost:5173"
                        }
                    ]
                }
            ]
        }

        # Check configured webhooks in database
        webhooks = [w for w in self.db._memory_store["webhooks"] if w.get("is_active")]
        
        # If no custom webhooks, check default Slack URL from config
        targets = []
        for w in webhooks:
            targets.append((w.get("id"), w.get("webhook_url"), w.get("platform")))
            
        if not targets and settings.DEFAULT_SLACK_WEBHOOK_URL:
            targets.append(("default-slack", settings.DEFAULT_SLACK_WEBHOOK_URL, "SLACK"))

        async with httpx.AsyncClient(timeout=10.0) as client:
            for hook_id, url, platform in targets:
                try:
                    res = await client.post(url, json=slack_payload)
                    success = res.status_code in [200, 204]
                    log_entry = {
                        "id": f"log-{datetime.utcnow().timestamp()}",
                        "webhook_id": hook_id,
                        "post_id": post.get("id"),
                        "status": "SENT" if success else "FAILED",
                        "response_code": res.status_code,
                        "sent_at": datetime.utcnow().isoformat()
                    }
                    self.db._memory_store["webhook_dispatch_logs"].append(log_entry)
                    results.append(log_entry)
                    logger.info(f"Dispatched webhook to {platform} (status: {res.status_code})")
                except Exception as e:
                    logger.error(f"Failed to dispatch webhook to {url}: {e}")
                    results.append({
                        "webhook_id": hook_id,
                        "status": "FAILED",
                        "error": str(e)
                    })

        return {
            "dispatched": len(results),
            "logs": results
        }

webhook_dispatcher = WebhookDispatcher()
