import uuid
import smtplib
import logging
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.database import db_manager
from app.models.review import (
    ReviewChannel,
    SendReviewRequest,
    SendReviewResponse,
    ChannelDispatchResult
)

logger = logging.getLogger("fixora.review_dispatcher")

class ReviewDispatcher:
    def __init__(self):
        self.db = db_manager

    async def send_for_review(self, request: SendReviewRequest) -> SendReviewResponse:
        """
        Sends a draft post to higher-ups (Managers, CMO, Legal) across:
        - Gmail (Responsive HTML Executive Email)
        - WhatsApp (Meta Cloud API / Twilio)
        - Slack (Interactive Block Kit Card)
        - Microsoft Teams (Adaptive Connector Card)
        """
        posts = [p for p in self.db._memory_store["posts"] if p.get("id") == request.post_id]
        if not posts:
            raise ValueError(f"Post '{request.post_id}' not found.")
        post = posts[0]

        # Gather violations
        violations = [
            v for v in self.db._memory_store["violations"]
            if v.get("post_id") == request.post_id and not v.get("is_resolved")
        ]

        score = post.get("compliance_score", 100.0 if not violations else max(0, 100 - len(violations) * 15))
        title = post.get("title", "Untitled Draft")
        body = post.get("body", "")
        author_id = post.get("author_id", "Unknown Author")
        users = [u for u in self.db._memory_store["users"] if u.get("id") == author_id]
        author_name = users[0].get("full_name", "Content Creator") if users else "Content Creator"
        
        review_url = f"{settings.APP_STUDIO_URL}/review/{request.post_id}"
        results: List[ChannelDispatchResult] = []

        for ch in request.channels:
            if ch == ReviewChannel.GMAIL:
                res = await self._dispatch_gmail(
                    post=post,
                    score=score,
                    author_name=author_name,
                    violations=violations,
                    recipients=request.recipient_emails or ["manager@fixora.ai"],
                    notes=request.reviewer_notes,
                    review_url=review_url
                )
                results.extend(res)

            elif ch == ReviewChannel.WHATSAPP:
                res = await self._dispatch_whatsapp(
                    post=post,
                    score=score,
                    author_name=author_name,
                    violations=violations,
                    phone_numbers=request.recipient_phones or [settings.WHATSAPP_DEFAULT_RECIPIENT or "+15550192834"],
                    notes=request.reviewer_notes,
                    review_url=review_url
                )
                results.extend(res)

            elif ch == ReviewChannel.SLACK:
                res = await self._dispatch_slack(
                    post=post,
                    score=score,
                    author_name=author_name,
                    violations=violations,
                    notes=request.reviewer_notes,
                    review_url=review_url
                )
                results.append(res)

            elif ch == ReviewChannel.TEAMS:
                res = await self._dispatch_teams(
                    post=post,
                    score=score,
                    author_name=author_name,
                    violations=violations,
                    notes=request.reviewer_notes,
                    review_url=review_url
                )
                results.append(res)

        return SendReviewResponse(
            post_id=request.post_id,
            post_title=title,
            compliance_score=score,
            total_dispatched=len(results),
            results=results,
            review_url=review_url
        )

    async def _dispatch_gmail(
        self,
        post: Dict[str, Any],
        score: float,
        author_name: str,
        violations: List[Dict[str, Any]],
        recipients: List[str],
        notes: Optional[str],
        review_url: str
    ) -> List[ChannelDispatchResult]:
        """Dispatches an executive HTML review email to managers."""
        results = []
        score_color = "#10B981" if score >= 90 else ("#F59E0B" if score >= 70 else "#EF4444")
        
        # Build HTML violations table
        violation_rows = ""
        if violations:
            for v in violations:
                violation_rows += f"""
                <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 10px; font-weight: bold; color: #DC2626;">{v.get('severity', 'WARNING')}</td>
                    <td style="padding: 10px;">{v.get('rule_title', 'Brand Policy')}</td>
                    <td style="padding: 10px; font-family: monospace; color: #7F1D1D; background: #FEF2F2;">"{v.get('offending_fragment', '')}"</td>
                    <td style="padding: 10px; color: #047857; background: #F0FDF4;">"{v.get('suggested_fix', '')}"</td>
                </tr>
                """
        else:
            violation_rows = "<tr><td colspan='4' style='padding: 12px; text-align: center; color: #059669;'>No policy violations found. Content is 100% compliant.</td></tr>"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC; padding: 24px; color: #1E293B;">
            <div style="max-width: 640px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="background: #0F172A; padding: 24px; color: #FFFFFF;">
                    <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #06B6D4; font-weight: 700;">FixoraAI Executive Review</span>
                    <h2 style="margin: 8px 0 0 0; font-size: 20px;">Review Required: {post.get('title')}</h2>
                </div>
                <div style="padding: 24px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #F1F5F9; padding-bottom: 16px;">
                        <div>
                            <span style="font-size: 12px; color: #64748B;">Submitted By:</span>
                            <div style="font-weight: 600;">{author_name}</div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 12px; color: #64748B;">Compliance Score:</span>
                            <div style="font-size: 20px; font-weight: 800; color: {score_color};">{score}%</div>
                        </div>
                    </div>
                    {f'<div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px; margin-bottom: 20px; font-size: 14px;"><strong>Creator Notes:</strong> {notes}</div>' if notes else ''}
                    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                        <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Draft Copy Preview</span>
                        <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">{post.get('body')}</p>
                    </div>
                    <span style="font-size: 12px; font-weight: 700; color: #334155;">Policy Evaluation & Suggested Fixes:</span>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px;">
                        <thead>
                            <tr style="background: #F1F5F9; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569;">
                                <th style="padding: 8px 10px;">Severity</th>
                                <th style="padding: 8px 10px;">Rule</th>
                                <th style="padding: 8px 10px;">Offending Text</th>
                                <th style="padding: 8px 10px;">Suggested Fix</th>
                            </tr>
                        </thead>
                        <tbody>
                            {violation_rows}
                        </tbody>
                    </table>
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="{review_url}" style="background: #6366F1; color: #FFFFFF; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);">
                            Open in Fixora Studio & Review
                        </a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        for recipient in recipients:
            msg_id = f"gmail-{uuid.uuid4().hex[:8]}"
            sent_status = "SIMULATED"
            error_details = None

            # Attempt live SMTP send if credentials provided
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                try:
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = f"FixoraAI Review Request: {post.get('title')} ({score}% Score)"
                    msg["From"] = settings.SMTP_FROM_EMAIL
                    msg["To"] = recipient
                    msg.attach(MIMEText(html_body, "html"))

                    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                        server.starttls()
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                        server.sendmail(settings.SMTP_FROM_EMAIL, recipient, msg.as_string())
                    sent_status = "SENT"
                    logger.info(f"Live review email dispatched via Gmail SMTP to {recipient}")
                except Exception as e:
                    logger.warning(f"Live SMTP failed: {e}. Falling back to simulation record.")
                    error_details = str(e)
            else:
                logger.info(f"Gmail SMTP credentials not configured. Recorded verified executive email simulation to {recipient}.")

            results.append(
                ChannelDispatchResult(
                    channel=ReviewChannel.GMAIL,
                    status=sent_status,
                    recipient=recipient,
                    message_id=msg_id,
                    preview_url=review_url,
                    details=error_details or f"Executive HTML review email formatted with {len(violations)} rule check(s).",
                    payload_preview={
                        "to": recipient,
                        "subject": f"FixoraAI Review Request: {post.get('title')}",
                        "compliance_score": score,
                        "violations_count": len(violations)
                    }
                )
            )
        return results

    async def _dispatch_whatsapp(
        self,
        post: Dict[str, Any],
        score: float,
        author_name: str,
        violations: List[Dict[str, Any]],
        phone_numbers: List[str],
        notes: Optional[str],
        review_url: str
    ) -> List[ChannelDispatchResult]:
        """Dispatches interactive WhatsApp review request via Meta Cloud API / Twilio format."""
        results = []
        score_badge = "🟢 100% Compliant" if score == 100 else f"🟡 {score}% Review Needed"
        if score < 70:
            score_badge = f"🔴 {score}% High Risk"

        wa_text = (
            f"🔔 *FixoraAI Executive Review Request*\n\n"
            f"📝 *Post:* {post.get('title')}\n"
            f"👤 *Author:* {author_name}\n"
            f"🎯 *Compliance Score:* {score_badge}\n"
            f"⚠️ *Violations:* {len(violations)} flagged\n\n"
            f"💬 *Draft Snippet:*\n_{post.get('body', '')[:160]}..._\n\n"
            f"👉 *Review & Approve:* {review_url}"
        )

        for phone in phone_numbers:
            msg_id = f"wa-{uuid.uuid4().hex[:8]}"
            sent_status = "SIMULATED"
            error_details = None

            # Attempt live Meta Cloud API send if configured
            if settings.WHATSAPP_API_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID:
                try:
                    url = f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
                    headers = {
                        "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "messaging_product": "whatsapp",
                        "to": phone,
                        "type": "text",
                        "text": {"body": wa_text}
                    }
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        res = await client.post(url, json=payload, headers=headers)
                        if res.status_code in [200, 201]:
                            sent_status = "SENT"
                            logger.info(f"Live WhatsApp message sent to {phone}")
                        else:
                            error_details = f"HTTP {res.status_code}: {res.text}"
                except Exception as e:
                    logger.warning(f"Live WhatsApp API dispatch failed: {e}")
                    error_details = str(e)
            else:
                logger.info(f"WhatsApp API token not configured. Generated verified WhatsApp review template for {phone}.")

            results.append(
                ChannelDispatchResult(
                    channel=ReviewChannel.WHATSAPP,
                    status=sent_status,
                    recipient=phone,
                    message_id=msg_id,
                    preview_url=review_url,
                    details=error_details or "Interactive WhatsApp review alert formatted and queued.",
                    payload_preview={"to": phone, "message_text": wa_text}
                )
            )
        return results

    async def _dispatch_slack(
        self,
        post: Dict[str, Any],
        score: float,
        author_name: str,
        violations: List[Dict[str, Any]],
        notes: Optional[str],
        review_url: str
    ) -> ChannelDispatchResult:
        """Dispatches Slack Block Kit card with interactive approval buttons."""
        msg_id = f"slack-{uuid.uuid4().hex[:8]}"
        slack_blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "📋 Post Review Request for Higher-ups"}
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Title:* {post.get('title')}"},
                    {"type": "mrkdwn", "text": f"*Author:* {author_name}"},
                    {"type": "mrkdwn", "text": f"*Compliance Score:* *{score}%*"},
                    {"type": "mrkdwn", "text": f"*Unresolved Mistakes:* {len(violations)}"}
                ]
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Draft Snippet:*\n>{post.get('body', '')[:250]}..."}
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "✅ 1-Click Approve"},
                        "style": "primary",
                        "value": f"approve_{post.get('id')}"
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "🔍 Open in Fixora Studio"},
                        "url": review_url
                    }
                ]
            }
        ]

        sent_status = "SIMULATED"
        details = "Block Kit interactive review card prepared."
        webhook_url = settings.DEFAULT_SLACK_WEBHOOK_URL
        if webhook_url:
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    res = await client.post(webhook_url, json={"blocks": slack_blocks})
                    if res.status_code in [200, 204]:
                        sent_status = "SENT"
                        details = "Dispatched successfully to Slack channel."
            except Exception as e:
                details = f"Slack webhook call failed: {e}"

        return ChannelDispatchResult(
            channel=ReviewChannel.SLACK,
            status=sent_status,
            recipient=webhook_url or "#brand-governance-reviews",
            message_id=msg_id,
            preview_url=review_url,
            details=details,
            payload_preview={"blocks_count": len(slack_blocks)}
        )

    async def _dispatch_teams(
        self,
        post: Dict[str, Any],
        score: float,
        author_name: str,
        violations: List[Dict[str, Any]],
        notes: Optional[str],
        review_url: str
    ) -> ChannelDispatchResult:
        """Dispatches Microsoft Teams Adaptive / Connector Card."""
        msg_id = f"teams-{uuid.uuid4().hex[:8]}"
        teams_card = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "6366F1",
            "summary": f"Review Request: {post.get('title')}",
            "sections": [{
                "activityTitle": f"FixoraAI Sign-Off Request: {post.get('title')}",
                "activitySubtitle": f"Submitted by {author_name} | Compliance Score: {score}%",
                "facts": [
                    {"name": "Mistakes Flagged", "value": str(len(violations))},
                    {"name": "Channel Target", "value": post.get("intent_tags", {}).get("target_channel", "Multi-channel")}
                ],
                "markdown": True
            }],
            "potentialAction": [{
                "@type": "OpenUri",
                "name": "Review in Fixora Studio",
                "targets": [{"os": "default", "uri": review_url}]
            }]
        }

        sent_status = "SIMULATED"
        details = "Teams Connector Card prepared."
        webhook_url = settings.DEFAULT_TEAMS_WEBHOOK_URL
        if webhook_url:
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    res = await client.post(webhook_url, json=teams_card)
                    if res.status_code in [200, 204]:
                        sent_status = "SENT"
                        details = "Dispatched successfully to Microsoft Teams channel."
            except Exception as e:
                details = f"Teams webhook call failed: {e}"

        return ChannelDispatchResult(
            channel=ReviewChannel.TEAMS,
            status=sent_status,
            recipient=webhook_url or "Microsoft Teams Channel",
            message_id=msg_id,
            preview_url=review_url,
            details=details,
            payload_preview=teams_card
        )

review_dispatcher = ReviewDispatcher()
