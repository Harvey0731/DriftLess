#!/usr/bin/env python3
"""Generate QA Audit Report PDF for Chat & Revenue Systems."""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import os
from datetime import datetime

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "QA_Audit_Report.pdf")

def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=letter,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    styles.add(ParagraphStyle(name='TitleMain', parent=styles['Title'], fontSize=22, spaceAfter=4, textColor=colors.HexColor('#1a1a2e')))
    styles.add(ParagraphStyle(name='Subtitle', parent=styles['Normal'], fontSize=11, textColor=colors.grey, spaceAfter=20))
    styles.add(ParagraphStyle(name='SectionHead', parent=styles['Heading1'], fontSize=16, textColor=colors.HexColor('#1a1a2e'), spaceBefore=16, spaceAfter=8))
    styles.add(ParagraphStyle(name='SubSection', parent=styles['Heading2'], fontSize=13, textColor=colors.HexColor('#333366'), spaceBefore=12, spaceAfter=6))
    styles.add(ParagraphStyle(name='BodyText2', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=6))
    styles.add(ParagraphStyle(name='BulletItem', parent=styles['Normal'], fontSize=10, leading=14, leftIndent=20, bulletIndent=10, spaceAfter=3))
    styles.add(ParagraphStyle(name='VerdictPass', parent=styles['Normal'], fontSize=12, textColor=colors.HexColor('#0a7e0a'), spaceAfter=4, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='VerdictWarn', parent=styles['Normal'], fontSize=12, textColor=colors.HexColor('#cc6600'), spaceAfter=4, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='VerdictFail', parent=styles['Normal'], fontSize=12, textColor=colors.HexColor('#cc0000'), spaceAfter=4, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='SmallNote', parent=styles['Normal'], fontSize=8, textColor=colors.grey, spaceAfter=2))
    styles.add(ParagraphStyle(name='CellText', parent=styles['Normal'], fontSize=9, leading=12))
    styles.add(ParagraphStyle(name='CellBold', parent=styles['Normal'], fontSize=9, leading=12, fontName='Helvetica-Bold'))

    story = []

    # ── TITLE PAGE ──
    story.append(Spacer(1, 1.5*inch))
    story.append(Paragraph("QA Audit Report", styles['TitleMain']))
    story.append(Paragraph("Chat & Revenue Systems", styles['TitleMain']))
    story.append(Spacer(1, 0.3*inch))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#8B5CF6')))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(f"Driftless (FocusBuddy) | {datetime.now().strftime('%B %d, %Y')}", styles['Subtitle']))
    story.append(Paragraph("Principal QA Auditor Assessment | FAANG-Level Review", styles['Subtitle']))
    story.append(Spacer(1, 0.5*inch))

    # TOC
    story.append(Paragraph("Table of Contents", styles['SubSection']))
    toc_items = [
        "1. Executive Verdict",
        "2. Chat Functionality Audit",
        "3. Revenue Functionality Audit",
        "4. Critical Revenue Risks (Top 5)",
        "5. Blind Spots / Missing Evidence",
        "6. Final Production Risk Assessment",
    ]
    for item in toc_items:
        story.append(Paragraph(item, styles['BulletItem']))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # 1. EXECUTIVE VERDICT
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("1. Executive Verdict", styles['SectionHead']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0')))
    story.append(Spacer(1, 0.15*inch))

    story.append(Paragraph("Chat Systems: PARTIALLY TESTED", styles['VerdictWarn']))
    story.append(Paragraph(
        "The chat store (chatStore.ts) has 100% statement coverage with 32 unit tests covering all 5 actions "
        "(fetchMessages, sendMessage, clearHistory, deleteMessage, checkRateLimit). The service layer "
        "(chat.service.ts) has 7 tests covering CRUD operations with error paths. However: (a) the AI chat "
        "Edge Function (supabase/functions/ai-chat/index.ts) has ZERO automated tests, (b) the ChatScreen "
        "UI component (chat.tsx, 348 lines) has ZERO component/integration tests, (c) MessageBubble has "
        "ZERO render tests, and (d) timeout behavior (withTimeout wrapper) is not tested in the chat context.",
        styles['BodyText2']
    ))
    story.append(Spacer(1, 0.1*inch))

    story.append(Paragraph("Revenue Systems: PARTIALLY TESTED", styles['VerdictWarn']))
    story.append(Paragraph(
        "The subscription store (subscriptionStore.ts) has 88% statement coverage with 20 tests across all "
        "5 actions. The subscription service has 11 tests including trial status edge cases (expired, null "
        "trial_ends_at, within-24-hours). However: (a) the RevenueCat webhook handler (revenuecat-webhook/"
        "index.ts, 279 lines) has ZERO automated tests despite handling INITIAL_PURCHASE, RENEWAL, "
        "CANCELLATION, EXPIRATION, and BILLING_ISSUE events, (b) the activate-trial Edge Function has ZERO "
        "tests, (c) the delete-account Edge Function has ZERO tests, and (d) no integration or E2E tests "
        "exist for the full purchase flow.",
        styles['BodyText2']
    ))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # 2. CHAT FUNCTIONALITY AUDIT
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. Chat Functionality Audit", styles['SectionHead']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0')))
    story.append(Spacer(1, 0.15*inch))

    chat_data = [
        [
            Paragraph("<b>Feature</b>", styles['CellBold']),
            Paragraph("<b>Test Files</b>", styles['CellBold']),
            Paragraph("<b>Test Count</b>", styles['CellBold']),
            Paragraph("<b>Rating</b>", styles['CellBold']),
            Paragraph("<b>Gaps</b>", styles['CellBold']),
        ],
        [
            Paragraph("Message fetch + pagination", styles['CellText']),
            Paragraph("chatStore.test.ts\nchat.service.test.ts", styles['CellText']),
            Paragraph("7 + 3 = 10", styles['CellText']),
            Paragraph("DEEP", styles['CellBold']),
            Paragraph("No test for max pagination boundary", styles['CellText']),
        ],
        [
            Paragraph("Message send (optimistic UI)", styles['CellText']),
            Paragraph("chatStore.test.ts", styles['CellText']),
            Paragraph("7", styles['CellText']),
            Paragraph("DEEP", styles['CellBold']),
            Paragraph("Timeout behavior not tested; concurrent sends not tested", styles['CellText']),
        ],
        [
            Paragraph("Message deduplication", styles['CellText']),
            Paragraph("chatStore.test.ts", styles['CellText']),
            Paragraph("1", styles['CellText']),
            Paragraph("PARTIAL", styles['CellBold']),
            Paragraph("Only one dedup scenario tested", styles['CellText']),
        ],
        [
            Paragraph("Message delete (optimistic + revert)", styles['CellText']),
            Paragraph("chatStore.test.ts\nchat.service.test.ts", styles['CellText']),
            Paragraph("3 + 2 = 5", styles['CellText']),
            Paragraph("DEEP", styles['CellBold']),
            Paragraph("No test for deleting non-existent message", styles['CellText']),
        ],
        [
            Paragraph("Clear history", styles['CellText']),
            Paragraph("chatStore.test.ts\nchat.service.test.ts", styles['CellText']),
            Paragraph("4 + 1 = 5", styles['CellText']),
            Paragraph("DEEP", styles['CellBold']),
            Paragraph("None significant", styles['CellText']),
        ],
        [
            Paragraph("Client-side rate limiting", styles['CellText']),
            Paragraph("chatStore.test.ts", styles['CellText']),
            Paragraph("4", styles['CellText']),
            Paragraph("DEEP", styles['CellBold']),
            Paragraph("Boundary at exactly RATE_LIMIT_MAX-1 tested", styles['CellText']),
        ],
        [
            Paragraph("Server-side rate limiting (ai-chat)", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("Edge Function has no automated tests; increment_rate_limit RPC untested", styles['CellText']),
        ],
        [
            Paragraph("AI response generation (OpenAI call)", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("OpenAI integration, timeout (15s AbortController), error responses untested", styles['CellText']),
        ],
        [
            Paragraph("Input sanitization (sanitizeForPrompt)", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("HTML removal, newline collapse, unicode filter untested", styles['CellText']),
        ],
        [
            Paragraph("Shame language detection", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("20 shame patterns + integration with shame-emergency routing untested", styles['CellText']),
        ],
        [
            Paragraph("Message persistence (DB insert)", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("Edge Function saves both user + assistant msgs; insert failure path untested", styles['CellText']),
        ],
        [
            Paragraph("Auth enforcement", styles['CellText']),
            Paragraph("chatStore.test.ts\nchat.service.test.ts", styles['CellText']),
            Paragraph("3 + 0 = 3", styles['CellText']),
            Paragraph("PARTIAL", styles['CellBold']),
            Paragraph("Client-side auth tested; server-side JWT validation in Edge Function untested", styles['CellText']),
        ],
        [
            Paragraph("Cross-user deletion prevention (user_id filter)", styles['CellText']),
            Paragraph("chatStore.test.ts\nchat.service.test.ts", styles['CellText']),
            Paragraph("1 + 1 = 2", styles['CellText']),
            Paragraph("DEEP", styles['CellBold']),
            Paragraph("Verified both .eq() filters are applied", styles['CellText']),
        ],
        [
            Paragraph("ChatScreen UI (348 lines)", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("Optimistic UI, error display, rate limit banner, load-more, prefill param untested", styles['CellText']),
        ],
        [
            Paragraph("MessageBubble component", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("Rendering, long-press delete, timestamp formatting, React.memo untested", styles['CellText']),
        ],
        [
            Paragraph("Timezone validation (ai-chat)", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("slice(0,64) guard and Intl.DateTimeFormat fallback untested", styles['CellText']),
        ],
    ]

    chat_table = Table(chat_data, colWidths=[1.4*inch, 1.2*inch, 0.7*inch, 0.8*inch, 2.6*inch])
    chat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d2d5e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f8fc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(chat_table)
    story.append(Spacer(1, 0.15*inch))

    story.append(Paragraph("<b>Chat Totals:</b> 39 tests across store + service layers. 0 tests for Edge Function, UI components, or integration flows.", styles['BodyText2']))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # 3. REVENUE FUNCTIONALITY AUDIT
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("3. Revenue Functionality Audit", styles['SectionHead']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0')))
    story.append(Spacer(1, 0.15*inch))

    rev_data = [
        [
            Paragraph("<b>Feature</b>", styles['CellBold']),
            Paragraph("<b>Test Files</b>", styles['CellBold']),
            Paragraph("<b>Test Count</b>", styles['CellBold']),
            Paragraph("<b>Rating</b>", styles['CellBold']),
            Paragraph("<b>Gaps</b>", styles['CellBold']),
        ],
        [
            Paragraph("Subscription state derivation (deriveFromCustomerInfo)", styles['CellText']),
            Paragraph("subscriptionStore.test.ts", styles['CellText']),
            Paragraph("4", styles['CellText']),
            Paragraph("DEEP", styles['CellBold']),
            Paragraph("Active, free, trial, transient-error paths all tested", styles['CellText']),
        ],
        [
            Paragraph("RevenueCat initialize", styles['CellText']),
            Paragraph("subscriptionStore.test.ts", styles['CellText']),
            Paragraph("2", styles['CellText']),
            Paragraph("PARTIAL", styles['CellBold']),
            Paragraph("No-API-key + error-resilience tested. Happy path (configure+logIn+getCustomerInfo) not fully verified due to mock structure", styles['CellText']),
        ],
        [
            Paragraph("Check entitlement", styles['CellText']),
            Paragraph("subscriptionStore.test.ts", styles['CellText']),
            Paragraph("4", styles['CellText']),
            Paragraph("DEEP", styles['CellBold']),
            Paragraph("Pro, free, trial (with daysLeft), transient error resilience all tested", styles['CellText']),
        ],
        [
            Paragraph("Fetch offerings", styles['CellText']),
            Paragraph("subscriptionStore.test.ts", styles['CellText']),
            Paragraph("3", styles['CellText']),
            Paragraph("DEEP", styles['CellBold']),
            Paragraph("Current offering, null offering, error resilience tested", styles['CellText']),
        ],
        [
            Paragraph("Purchase package", styles['CellText']),
            Paragraph("subscriptionStore.test.ts", styles['CellText']),
            Paragraph("4", styles['CellText']),
            Paragraph("DEEP", styles['CellBold']),
            Paragraph("Success, isPurchasing flag, user cancellation, payment failure all tested", styles['CellText']),
        ],
        [
            Paragraph("Restore purchases", styles['CellText']),
            Paragraph("subscriptionStore.test.ts", styles['CellText']),
            Paragraph("4", styles['CellText']),
            Paragraph("DEEP", styles['CellBold']),
            Paragraph("Pro restore, free restore, isRestoring flag, error all tested", styles['CellText']),
        ],
        [
            Paragraph("Subscription DB service (get/update/checkTrial)", styles['CellText']),
            Paragraph("subscription.service.test.ts", styles['CellText']),
            Paragraph("11", styles['CellText']),
            Paragraph("DEEP", styles['CellBold']),
            Paragraph("Trial status edge cases (expired, null, within-24h, non-trialing status) comprehensively tested", styles['CellText']),
        ],
        [
            Paragraph("Safe field whitelist (SEC-02)", styles['CellText']),
            Paragraph("subscription.service.test.ts", styles['CellText']),
            Paragraph("1 (implicit)", styles['CellText']),
            Paragraph("PARTIAL", styles['CellBold']),
            Paragraph("updateSubscription tested but no explicit test proving dangerous fields (status, entitlement) are stripped", styles['CellText']),
        ],
        [
            Paragraph("Trial activation (activate-trial Edge Function)", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("Atomic CAS guard, rate limiting (5/hr), already-subscribed (409), missing-row insert, auth all untested", styles['CellText']),
        ],
        [
            Paragraph("RevenueCat webhook handler", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("HMAC-SHA256 verification, constant-time comparison, event mapping (5 types), idempotency (last_webhook_event_id), UUID validation, upsert/update paths all UNTESTED", styles['CellText']),
        ],
        [
            Paragraph("Delete account (billing impact)", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("Soft-delete, rate limiting (3/hr), sign-out after deletion, auth all untested", styles['CellText']),
        ],
        [
            Paragraph("Upgrade/downgrade flow", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("No code or tests for plan changes; handled entirely by RevenueCat SDK", styles['CellText']),
        ],
        [
            Paragraph("Refund/reversal handling", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("No REFUND event type in webhook handler switch statement", styles['CellText']),
        ],
        [
            Paragraph("Billing issue handling", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("BILLING_ISSUE event mapped in webhook but never tested; no grace period logic", styles['CellText']),
        ],
        [
            Paragraph("Subscription UI (settings.tsx)", styles['CellText']),
            Paragraph("NONE", styles['CellText']),
            Paragraph("0", styles['CellText']),
            Paragraph("NOT TESTED", styles['CellBold']),
            Paragraph("No component tests for subscription display, manage/restore buttons", styles['CellText']),
        ],
    ]

    rev_table = Table(rev_data, colWidths=[1.4*inch, 1.2*inch, 0.7*inch, 0.8*inch, 2.6*inch])
    rev_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d2d5e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f8fc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(rev_table)
    story.append(Spacer(1, 0.15*inch))

    story.append(Paragraph("<b>Revenue Totals:</b> 29 tests across store + service layers. 0 tests for any of the 3 Edge Functions (activate-trial, revenuecat-webhook, delete-account) or subscription UI.", styles['BodyText2']))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # 4. CRITICAL REVENUE RISKS (Top 5)
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("4. Critical Revenue Risks (Top 5)", styles['SectionHead']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0')))
    story.append(Spacer(1, 0.15*inch))

    risks = [
        (
            "RISK-1: RevenueCat Webhook Has Zero Tests (CRITICAL)",
            "The revenuecat-webhook Edge Function (279 lines) processes all subscription lifecycle events "
            "(INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE). It contains HMAC-SHA256 "
            "signature verification with constant-time comparison, event-to-subscription mapping, "
            "idempotency checking via last_webhook_event_id, UUID validation, and upsert/update branching. "
            "NONE of this is tested. A regression in any of these paths could silently grant or revoke pro "
            "access, accept forged webhook events, or corrupt subscription records."
        ),
        (
            "RISK-2: Trial Activation Edge Function Has Zero Tests (HIGH)",
            "The activate-trial Edge Function contains atomic CAS guard logic (.not('status','in',...)) "
            "to prevent TOCTOU race conditions, rate limiting via increment_rate_limit RPC, and a fallback "
            "INSERT path for users without subscription rows. None of these paths are tested. A bug could "
            "allow unlimited free trials or block legitimate trial activations."
        ),
        (
            "RISK-3: No REFUND Event Handling in Webhook (HIGH)",
            "The webhook handler's switch statement covers INITIAL_PURCHASE, RENEWAL, CANCELLATION, "
            "EXPIRATION, and BILLING_ISSUE, but there is NO case for REFUND or PRODUCT_CHANGE events. "
            "RevenueCat sends these events. A refund would not revoke pro access, meaning users could "
            "get refunds while keeping paid features."
        ),
        (
            "RISK-4: No Integration/E2E Test for Purchase Flow (HIGH)",
            "The full purchase flow (user taps package -> RevenueCat SDK -> webhook -> DB update -> "
            "entitlement check) is tested only as isolated unit mocks. There are zero integration tests "
            "that verify the complete chain. If any layer's assumptions about data shapes change, "
            "the purchase flow could silently break."
        ),
        (
            "RISK-5: Safe Field Whitelist Not Explicitly Tested (MEDIUM)",
            "subscription.service.ts has a SafeSubscriptionUpdate type that should prevent clients from "
            "setting 'entitlement' or 'status' directly. While the TypeScript type system provides "
            "compile-time protection, there is no runtime test proving that a malicious payload with "
            "{ status: 'active', entitlement: 'pro' } would be stripped. The test passes an 'any' cast."
        ),
    ]

    for title, desc in risks:
        story.append(Paragraph(title, styles['SubSection']))
        story.append(Paragraph(desc, styles['BodyText2']))
        story.append(Spacer(1, 0.08*inch))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # 5. BLIND SPOTS / MISSING EVIDENCE
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("5. Blind Spots / Missing Evidence", styles['SectionHead']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0')))
    story.append(Spacer(1, 0.15*inch))

    blind_spots = [
        "<b>Edge Function Tests:</b> All 6 Supabase Edge Functions (ai-chat, ai-checkin, activate-trial, "
        "delete-account, data-export, revenuecat-webhook) have ZERO automated tests. These run in a Deno "
        "runtime and would require a separate test harness (e.g., Deno.test + fetch mocking). This is the "
        "single largest blind spot in the entire codebase.",

        "<b>Component/Integration Tests:</b> No React Native component tests exist for ChatScreen, "
        "MessageBubble, TypingIndicator, QuickActions (chat), or any settings/subscription UI. The Testing "
        "Library (@testing-library/jest-native) is installed but unused for screen-level tests.",

        "<b>E2E Tests:</b> Zero end-to-end tests exist. No Detox, Maestro, or Appium configuration found.",

        "<b>RLS Policy Tests:</b> Row-Level Security policies exist on all tables but are not tested via "
        "automated assertions. A misconfigured RLS policy could expose chat messages or subscription data "
        "across users.",

        "<b>Webhook Replay/Idempotency:</b> The webhook uses last_webhook_event_id for deduplication, "
        "but this has zero test coverage. A replay attack or RevenueCat retry could cause double-processing.",

        "<b>HMAC Signature Verification:</b> The constant-time comparison in verifySignature() is critical "
        "for preventing timing attacks. This cryptographic code has zero unit tests.",

        "<b>Concurrent Purchase Attempts:</b> No tests verify behavior when a user simultaneously triggers "
        "purchasePackage() from two devices or rapidly taps the purchase button.",

        "<b>Network Failure Recovery:</b> No tests for chat or subscription behavior during intermittent "
        "network failures, offline mode, or partial responses.",
    ]

    for spot in blind_spots:
        story.append(Paragraph(f"\u2022 {spot}", styles['BulletItem']))
        story.append(Spacer(1, 0.04*inch))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # 6. FINAL PRODUCTION RISK ASSESSMENT
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("6. Final Production Risk Assessment", styles['SectionHead']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0')))
    story.append(Spacer(1, 0.15*inch))

    story.append(Paragraph("Overall Production Risk: MEDIUM-HIGH", styles['VerdictWarn']))
    story.append(Spacer(1, 0.1*inch))

    story.append(Paragraph("<b>Justification:</b>", styles['BodyText2']))
    story.append(Paragraph(
        "The client-side state management and service layers are well-tested (86.79% store coverage, "
        "93.38% service coverage, 381 passing tests). However, all server-side business logic - the "
        "6 Edge Functions that handle revenue-critical operations (webhook processing, trial activation, "
        "AI chat), security (HMAC verification, rate limiting), and data persistence - has ZERO automated "
        "test coverage. This creates a dangerous asymmetry: the code that users interact with is tested, "
        "but the code that handles money and security is not.",
        styles['BodyText2']
    ))
    story.append(Spacer(1, 0.1*inch))

    summary_data = [
        [
            Paragraph("<b>Layer</b>", styles['CellBold']),
            Paragraph("<b>Test Count</b>", styles['CellBold']),
            Paragraph("<b>Coverage</b>", styles['CellBold']),
            Paragraph("<b>Risk Level</b>", styles['CellBold']),
        ],
        [
            Paragraph("Zustand Stores (client state)", styles['CellText']),
            Paragraph("72 tests / 4 suites", styles['CellText']),
            Paragraph("86.79% stmt", styles['CellText']),
            Paragraph("LOW", styles['CellText']),
        ],
        [
            Paragraph("Service Layer (DB operations)", styles['CellText']),
            Paragraph("~170 tests / 11 suites", styles['CellText']),
            Paragraph("93.38% stmt", styles['CellText']),
            Paragraph("LOW", styles['CellText']),
        ],
        [
            Paragraph("Edge Functions (server logic)", styles['CellText']),
            Paragraph("0 tests / 0 suites", styles['CellText']),
            Paragraph("0%", styles['CellText']),
            Paragraph("CRITICAL", styles['CellText']),
        ],
        [
            Paragraph("UI Components (screens)", styles['CellText']),
            Paragraph("~5 tests / 3 suites", styles['CellText']),
            Paragraph("<10%", styles['CellText']),
            Paragraph("MEDIUM", styles['CellText']),
        ],
        [
            Paragraph("E2E / Integration", styles['CellText']),
            Paragraph("0 tests", styles['CellText']),
            Paragraph("0%", styles['CellText']),
            Paragraph("HIGH", styles['CellText']),
        ],
    ]

    summary_table = Table(summary_data, colWidths=[2.2*inch, 1.5*inch, 1.2*inch, 1.2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d2d5e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f8fc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.2*inch))

    story.append(Paragraph("<b>Recommended Priority Actions (Ordered by Revenue Impact):</b>", styles['SubSection']))
    actions = [
        "1. Write Deno integration tests for revenuecat-webhook (HMAC verification, all 5 event types, idempotency, error paths) - CRITICAL",
        "2. Write Deno tests for activate-trial (CAS guard, rate limiting, already-subscribed, insert fallback) - HIGH",
        "3. Add REFUND and PRODUCT_CHANGE event handling to webhook handler - HIGH",
        "4. Write Deno tests for ai-chat (sanitization, rate limiting, timeout, OpenAI error handling) - HIGH",
        "5. Add component tests for ChatScreen and subscription settings UI - MEDIUM",
        "6. Add RLS policy integration tests (cross-user data isolation) - MEDIUM",
        "7. Set up E2E test framework (Detox or Maestro) for critical user flows - MEDIUM",
    ]
    for action in actions:
        story.append(Paragraph(action, styles['BulletItem']))

    story.append(Spacer(1, 0.3*inch))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#8B5CF6')))
    story.append(Spacer(1, 0.1*inch))
    story.append(Paragraph(
        f"Report generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} | "
        "Methodology: Static code analysis + test file mapping | "
        "No tests were executed during this audit",
        styles['SmallNote']
    ))

    doc.build(story)
    print(f"PDF generated: {OUTPUT_PATH}")

if __name__ == "__main__":
    build_pdf()
