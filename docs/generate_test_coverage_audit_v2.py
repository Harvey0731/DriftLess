#!/usr/bin/env python3
"""Generate Comprehensive Test Coverage Audit Report V2 PDF."""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import os
from datetime import datetime

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "Test_Coverage_Audit_Report.pdf")


def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=letter,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='TitleMain', parent=styles['Title'], fontSize=20, spaceAfter=4, textColor=colors.HexColor('#1a1a2e')))
    styles.add(ParagraphStyle(name='Subtitle', parent=styles['Normal'], fontSize=10, textColor=colors.grey, spaceAfter=16))
    styles.add(ParagraphStyle(name='SectionHead', parent=styles['Heading1'], fontSize=15, textColor=colors.HexColor('#1a1a2e'), spaceBefore=14, spaceAfter=6))
    styles.add(ParagraphStyle(name='SubSection', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#333366'), spaceBefore=10, spaceAfter=4))
    styles.add(ParagraphStyle(name='SubSection3', parent=styles['Heading3'], fontSize=10, textColor=colors.HexColor('#444488'), spaceBefore=6, spaceAfter=3))
    styles.add(ParagraphStyle(name='Body', parent=styles['Normal'], fontSize=9, leading=13, spaceAfter=5))
    styles.add(ParagraphStyle(name='BodyBold', parent=styles['Normal'], fontSize=9, leading=13, spaceAfter=5, fontName='Helvetica-Bold'))
    styles.byName['Bullet'] = ParagraphStyle(name='Bullet', parent=styles['Normal'], fontSize=9, leading=13, leftIndent=18, bulletIndent=8, spaceAfter=2)
    styles.add(ParagraphStyle(name='VerdictRed', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#cc0000'), spaceAfter=4, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='VerdictOrange', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#cc6600'), spaceAfter=4, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='VerdictGreen', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#0a7e0a'), spaceAfter=4, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='SmallNote', parent=styles['Normal'], fontSize=7, textColor=colors.grey, spaceAfter=2))
    styles.add(ParagraphStyle(name='C', parent=styles['Normal'], fontSize=8, leading=11))
    styles.add(ParagraphStyle(name='CB', parent=styles['Normal'], fontSize=8, leading=11, fontName='Helvetica-Bold'))

    story = []
    HR = lambda: HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'))
    HR2 = lambda: HRFlowable(width="100%", thickness=2, color=colors.HexColor('#8B5CF6'))
    SP = lambda h=0.1: Spacer(1, h * inch)

    def make_table(data, widths, header_color='#2d2d5e'):
        t = Table(data, colWidths=widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(header_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#cccccc')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f8fc')]),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ]))
        return t

    # ── TITLE PAGE ────────────────────────────────────────────────────────────
    story.append(SP(1.5))
    story.append(Paragraph("Comprehensive Test Coverage<br/>Audit Report", styles['TitleMain']))
    story.append(HR2())
    story.append(SP(0.15))
    story.append(Paragraph(f"Driftless (FocusBuddy) | {datetime.now().strftime('%B %d, %Y')}", styles['Body']))
    story.append(Paragraph("Principal QA Auditor | Static Analysis Only | No Tests Executed", styles['SmallNote']))
    story.append(SP(0.5))
    story.append(Paragraph("<b>Table of Contents</b>", styles['SubSection']))
    for i, s in enumerate([
        "Executive Summary", "Feature Coverage Table (All 57 Features)",
        "Untested / Weakly Tested Features (Detailed)",
        "High Priority Breakpoints (Top 10 Risks)",
        "What Was Checked (Audit Trail)", "Final Verdict"
    ], 1):
        story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;{i}. {s}", styles['Bullet']))
    story.append(PageBreak())

    # ── 1. EXECUTIVE SUMMARY ─────────────────────────────────────────────────
    story.append(Paragraph("1. Executive Summary", styles['SectionHead']))
    summary_data = [
        [Paragraph('<b>Metric</b>', styles['CB']), Paragraph('<b>Value</b>', styles['CB'])],
        [Paragraph('Total features identified', styles['C']), Paragraph('57 distinct functional components', styles['C'])],
        [Paragraph('Test suites', styles['C']), Paragraph('30 Jest suites, 461 tests, all passing', styles['C'])],
        [Paragraph('Deno test suites', styles['C']), Paragraph('3 suites, 48 tests (require deno runtime)', styles['C'])],
        [Paragraph('Total test count', styles['C']), Paragraph('509 individual tests across 33 files', styles['C'])],
        [Paragraph('Files with unit tests', styles['C']), Paragraph('25 of 57 (~44%)', styles['C'])],
        [Paragraph('Statement coverage (src/)', styles['C']), Paragraph('74.40% (683/918)', styles['C'])],
        [Paragraph('Branch coverage (src/)', styles['C']), Paragraph('59.38% (348/586)', styles['C'])],
        [Paragraph('Edge Functions tested', styles['C']), Paragraph('2 of 6 (partial \u2014 pure function tests only, no HTTP handler tests)', styles['C'])],
        [Paragraph('Screen/component tests', styles['C']), Paragraph('3 of 28 components (10.7%), 0 of 26 screens', styles['C'])],
        [Paragraph('E2E / integration tests', styles['C']), Paragraph('0', styles['C'])],
        [Paragraph('CI coverage threshold', styles['C']), Paragraph('70% minimum statements (enforced)', styles['C'])],
        [Paragraph('Overall system risk', styles['C']), Paragraph('MEDIUM', styles['C'])],
    ]
    story.append(make_table(summary_data, [2.6*inch, 4.2*inch]))
    story.append(SP(0.15))
    story.append(Paragraph(
        "Brutal Truth: The service and store layers are well-tested (93% and 87% respectively), "
        "and recent additions have closed many critical gaps (REFUND webhook handler, prompt injection defense, "
        "restoreTimerFromMMKV, signUp, route protection logic, timeout utility). "
        "However, the 4 untested Edge Functions (ai-checkin, activate-trial, data-export, delete-account) "
        "representing 907 lines of server-side logic remain the largest risk. "
        "All 26 app screens have zero rendering tests. The system is significantly stronger than before "
        "but still has meaningful server-side blind spots.", styles['Body']))
    story.append(SP(0.1))

    # Layer risk table
    layer_data = [
        [Paragraph('<b>Layer</b>', styles['CB']), Paragraph('<b>Files</b>', styles['CB']),
         Paragraph('<b>Tests</b>', styles['CB']), Paragraph('<b>Coverage</b>', styles['CB']),
         Paragraph('<b>Risk</b>', styles['CB'])],
        ['Zustand Stores (5)', '5 of 5', '138 tests (7 suites)', '87%', 'LOW'],
        ['Services (11)', '10 of 11', '~110 tests', '93%', 'LOW'],
        ['Libs/Utils (5)', '4 of 5', '~92 tests', '~70%', 'LOW'],
        ['Utils (2)', '2 of 2', '~76 tests', '~99%', 'LOW'],
        ['Components (17)', '3 of 17', '~36 tests', '<10%', 'MEDIUM'],
        ['Hooks (1)', '1 of 1', '7 tests', '100%', 'LOW'],
        ['Screens (26)', '0 of 26', '0 rendering tests', '0%', 'HIGH'],
        ['Edge Functions (6)', '2 of 6 (partial)', '48 pure-fn tests', '~20%', 'HIGH'],
        ['E2E/Integration', 'N/A', '0 tests', '0%', 'HIGH'],
    ]
    layer_table = []
    for row in layer_data:
        layer_table.append([c if isinstance(c, Paragraph) else Paragraph(str(c), styles['C']) for c in row])
    story.append(make_table(layer_table, [1.5*inch, 0.9*inch, 1.3*inch, 1.1*inch, 1*inch]))
    story.append(PageBreak())

    # ── 2. FEATURE COVERAGE TABLE ────────────────────────────────────────────
    story.append(Paragraph("2. Feature Coverage Table", styles['SectionHead']))

    def feature_section(title, rows):
        story.append(Paragraph(f"<i>{title}</i>", styles['SubSection']))
        header = [
            Paragraph('<b>Feature</b>', styles['CB']),
            Paragraph('<b>Location</b>', styles['CB']),
            Paragraph('<b>Tested?</b>', styles['CB']),
            Paragraph('<b>Types</b>', styles['CB']),
            Paragraph('<b>What Tested</b>', styles['CB']),
            Paragraph('<b>Not Tested</b>', styles['CB']),
            Paragraph('<b>Risk</b>', styles['CB']),
        ]
        data = [header]
        for r in rows:
            data.append([Paragraph(str(c), styles['C']) for c in r])
        story.append(make_table(data, [1.05*inch, 0.95*inch, 0.5*inch, 0.55*inch, 1.35*inch, 1.35*inch, 0.45*inch]))

    # Stores
    feature_section("Stores (State Management)", [
        ['Auth Store', 'stores/authStore', 'Yes', 'Unit', 'signIn, signOut, signUp, resetPassword, fetchProfile, updateProfile (19 tests)', 'initialize() callback behavior, onAuthStateChange lifecycle', 'Med'],
        ['Chat Store', 'stores/chatStore', 'Yes', 'Unit', 'fetch, send, delete, clear, rateLimit (29 tests, 100% stmt)', 'Timeout behavior in context, concurrent sends', 'Low'],
        ['Goal Store', 'stores/goalStore', 'Yes', 'Unit', 'fetch, create, archive, toggleTask (26 tests)', 'Unauthenticated paths (5), fetchTodayCheckIn/Tasks error', 'Low'],
        ['Session Store', 'stores/sessionStore', 'Yes', 'Unit', 'start, pause, resume, end, updateElapsed, restoreTimerFromMMKV (26 tests)', 'All 9 restore branches now tested', 'Low'],
        ['Subscription Store', 'stores/subscriptionStore', 'Yes', 'Unit', 'init, entitlement, offerings, purchase, restore, deriveFromCustomerInfo (40 tests)', 'Happy init path (mock limitation)', 'Low'],
    ])

    # Services
    feature_section("Services (Data Layer)", [
        ['Auth Service', 'services/auth', 'Yes', 'Unit', 'signUp+profile, signIn, signOut, reset, getSession (9 tests)', 'onAuthStateChange listener', 'Low'],
        ['Chat Service', 'services/chat', 'Yes', 'Unit', 'send, getMessages, delete, clear (11 tests)', 'None significant', 'Low'],
        ['Check-in Service', 'services/checkin', 'Yes', 'Unit', 'getTodayCheckIn, startCheckIn+streak, getRecent (8 tests)', '90-day cap enforcement', 'Low'],
        ['Goals Service', 'services/goals', 'Yes', 'Unit', 'getActive, create+deactivate, archive, getGoals (7 tests)', 'Archived filter', 'Low'],
        ['Profile Service', 'services/profile', 'Yes', 'Unit', 'get, update whitelist, completeOnboarding CAS, delete (10 tests)', 'signOut error in delete', 'Low'],
        ['Promises Service', 'services/promises', 'Yes', 'Unit', 'CRUD, trustScore formula, history clamping (15 tests)', 'broken_reason now properly cleared when kept=true', 'Low'],
        ['Sessions Service', 'services/sessions', 'Yes', 'Unit', 'create, update whitelist, end, recent, stats (11 tests)', 'Stats with 0 sessions', 'Low'],
        ['Shields Service', 'services/shields', 'Yes', 'Unit', 'award CAS, use CAS, getCount (10 tests)', 'null vs empty-array edge', 'Low'],
        ['Subscription Svc', 'services/subscription', 'Yes', 'Unit', 'get, update safe fields, trialStatus (13 tests)', 'Explicit whitelist proof', 'Low'],
        ['Tasks Service', 'services/tasks', 'Yes', 'Unit', 'getForCheckIn, getToday, toggle, create (11 tests)', 'None significant', 'Low'],
    ])

    # Edge Functions
    feature_section("Edge Functions (Server-side, Deno Runtime)", [
        ['ai-chat', 'supabase/fn/ai-chat', 'Partial', 'Deno', 'sanitizeForPrompt (11), detectShameLanguage (8), timezone, rate limit constant', 'HTTP handler, OpenAI call, DB persist, auth, timeout', 'Med'],
        ['ai-checkin', 'supabase/fn/ai-checkin', 'No', 'None', 'Nothing', 'ALL: auth, rate limit, input validation, OpenAI, response parsing, check-in upsert, task insert (444 lines, ~21 branches)', 'CRIT'],
        ['activate-trial', 'supabase/fn/activate-trial', 'No', 'None', 'Nothing', 'ALL: auth, rate limit, CAS guard, already-subscribed 409, INSERT fallback (155 lines, ~10 branches)', 'High'],
        ['revenuecat-webhook', 'supabase/fn/revenuecat-webhook', 'Partial', 'Deno', 'signPayload (3), event mapping (10 types incl REFUND+PRODUCT_CHANGE), UUID regex (3)', 'HTTP handler, HMAC verification, idempotency, DB upsert (317 lines)', 'Med'],
        ['delete-account', 'supabase/fn/delete-account', 'No', 'None', 'Nothing', 'ALL: auth, rate limit, soft-delete, sign-out (119 lines, ~8 branches)', 'Med'],
        ['data-export', 'supabase/fn/data-export', 'No', 'None', 'Nothing', 'ALL: auth, rate limit, 8-table fetch, JSON response (192 lines, ~7 branches)', 'Med'],
    ])

    story.append(PageBreak())

    # Screens
    feature_section("Screens (UI + Business Logic)", [
        ['Root Layout', 'app/_layout', 'Partial', 'Logic', 'Route protection logic (10 tests), 30-day auto-logout (5 tests)', 'Rendering, PASSWORD_RECOVERY deep link, theme, SplashScreen', 'Med'],
        ['Home Screen', 'app/(tabs)/index', 'No', 'None', 'Nothing', 'Task toggle, data fetching, goal display, refresh (346 lines)', 'Med'],
        ['Progress Screen', 'app/(tabs)/progress', 'No', 'None', 'Nothing', 'Period selector, stats, session history, FlatList (812 lines)', 'Low'],
        ['Chat Screen', 'app/(tabs)/chat', 'No', 'None', 'Nothing', 'Optimistic UI, rate limit display, load-more, prefill, shame redirect (348 lines)', 'Med'],
        ['Settings Screen', 'app/(tabs)/settings', 'No', 'None', 'Nothing', 'Toggle switches, sign-out, navigation (439 lines)', 'Low'],
        ['Check-In Screen', 'app/check-in', 'No', 'None', 'Nothing', 'Energy select, AI task gen, clarification loop (now capped at 3), task editing (861 lines)', 'High'],
        ['Timer Screen', 'app/timer', 'Partial', 'Logic', 'formatStartTime (5), goal-reached (3), elapsed capping (2), cold-start (2), setup validation (4)', 'Rendering, tick interval, AppState reconciliation (374 lines)', 'Med'],
        ['Session Rating', 'app/session-rating', 'Partial', 'Logic', 'Rating map (4), formatDuration (5), auth guard (2), save branching (2)', 'Rendering, app-quit fallback integration, streak update (294 lines)', 'Med'],
        ['Promises Screen', 'app/promises', 'No', 'None', 'Nothing', 'Promise CRUD, trust score display, history (423 lines)', 'Med'],
        ['Paywall Screen', 'app/paywall', 'Partial', 'Logic', 'deriveFromCustomerInfo (7), store state (5), result structures (5)', 'Rendering, purchase flow integration (175 lines)', 'Med'],
        ['Shame Emergency', 'app/shame-emergency', 'No', 'None', 'Nothing', 'Evidence fetch, micro-actions, grounding flow (420 lines)', 'Low'],
        ['Edit Profile', 'app/edit-profile', 'No', 'None', 'Nothing', 'Profile form, goal display (286 lines)', 'Low'],
        ['Bad Day Toolbox', 'app/bad-day-toolbox', 'No', 'None', 'Nothing', 'Category display, action selection (225 lines)', 'Low'],
        ['Data Export', 'app/data-export', 'No', 'None', 'Nothing', 'Export trigger, share flow (170 lines)', 'Low'],
        ['Delete Account', 'app/delete-account', 'No', 'None', 'Nothing', 'Confirmation, soft-delete, sign-out (133 lines)', 'Med'],
    ])

    # Infrastructure
    feature_section("Infrastructure", [
        ['MMKV storage', 'lib/mmkv', 'Yes', 'Unit', 'Timer state R/W, activity tracking, parse error (24 tests)', 'None significant', 'Low'],
        ['Sentry', 'lib/sentry', 'Yes', 'Unit', 'init, captureError, setUser, breadcrumb (13 tests)', 'setSentryEnabled, beforeSend scrub', 'Low'],
        ['Timeout utility', 'lib/timeout', 'Yes', 'Unit', 'withTimeout, TimeoutError, timer cleanup, PromiseLike (9 tests)', 'None significant', 'Low'],
        ['fireAndForget', 'lib/fireAndForget', 'No', 'None', 'Nothing', 'Promise rejection capture to Sentry', 'Low'],
        ['Supabase client', 'lib/supabase', 'No', 'None', 'Nothing', 'Client init, secure-store adapter, env validation', 'Low'],
        ['useAppState hook', 'hooks/useAppState', 'Yes', 'Unit', 'Foreground, background, cleanup (7 tests)', 'None', 'Low'],
        ['Time utils', 'utils/time', 'Yes', 'Unit', 'All formatters and helpers (~76 tests)', 'None', 'Low'],
        ['Constants', 'utils/constants', 'Yes', 'Unit', 'All values/structure validated (~26 tests)', 'None', 'Low'],
        ['CI/CD Pipeline', '.github/workflows/ci.yml', 'N/A', 'N/A', '5 jobs: tsc, lint, test, security, build + 70% coverage threshold', 'No Deno test job', 'Med'],
        ['DB Migrations', 'supabase/migrations/', 'Partial', 'Deno', 'RLS on 8 tables, auth.uid() SELECT policies, atomic functions exist (8 tests)', 'UPDATE/DELETE policies, atomic function behavior', 'Med'],
    ])
    story.append(PageBreak())

    # ── 3. UNTESTED / WEAKLY TESTED (DETAILED) ──────────────────────────────
    story.append(Paragraph("3. Untested / Weakly Tested Features (Detailed)", styles['SectionHead']))

    untested = [
        ('ai-checkin Edge Function (444 lines)', 'CRITICAL', 'Unit+Integration',
         'Auth, rate limiting, energy level validation (1-5), message/hardReason length caps, parseAiResponse (JSON extraction from markdown fences + fallback), clarification vs task response branching, check-in upsert, task row batch insert, partial success handling, OpenAI timeout, 15s AbortController',
         'Invalid AI response crashes check-in flow. Task generation with malformed JSON breaks daily routine. Uncapped input fields enable payload attacks. Clarification infinite-loop now capped at 3 rounds client-side, but server has no cap.'),
        ('activate-trial Edge Function (155 lines)', 'HIGH', 'Unit',
         'Auth, rate limiting (5/hr), atomic CAS guard (.not("status","in","(active,trialing)")), already-subscribed 409 response, missing subscription row INSERT fallback, trial end date calculation',
         'Rate limit bypass enables trial farming. CAS guard regression allows duplicate active trials. INSERT fallback failure leaves user in limbo.'),
        ('authStore.initialize() callback (lines 64-79)', 'HIGH', 'Unit',
         'onAuthStateChange callback invocation: session present \u2192 fetchProfile fire-and-forget, session null \u2192 clear profile, captureError on profile fetch failure',
         'Auth lifecycle hook tested only for return type, not actual behavior. Profile never loads if callback breaks. Silent failures in profile fetch leave stale data.'),
        ('data-export Edge Function (192 lines)', 'MEDIUM', 'Unit',
         'Auth, rate limit, 8-table fetch with row cap (10,000), JSON response structure, null data handling, Content-Disposition headers',
         'Export returns malformed data if any table query fails. Row cap not enforced. GDPR compliance risk.'),
        ('delete-account Edge Function (119 lines)', 'MEDIUM', 'Unit',
         'Auth, rate limiting (3/hr), soft-delete profile, sign-out after deletion, error recovery',
         'Rate limit bypass enables deletion harassment. Soft-delete failure leaves account in inconsistent state.'),
        ('Check-In Screen (861 lines, ~38 branches)', 'MEDIUM', 'Component',
         'Energy selection flow, AI task generation, clarification loop (now capped at 3), task editing/reordering, handleConfirm navigation, handleRestDay shield CAS, custom time input validation (5-180)',
         'Clarification loop cap only tested via static code review, not runtime. Shield CAS failure path not rendered. Custom time bypasses 5-180 range validation display.'),
        ('Database Migrations / RLS Policies', 'MEDIUM', 'Integration',
         'All RLS policies on 8 tables verified via SQL regex. UPDATE/DELETE policies, atomic functions (swap_active_goal, increment_rate_limit, update_streak) behavior, index effectiveness',
         'Static SQL regex cannot verify runtime behavior. Misconfigured RLS exposes cross-tenant data.'),
        ('fireAndForget.ts (16 lines)', 'LOW', 'Unit',
         'Promise rejection capture to Sentry with context string',
         'Broken reason silently dropped. Used throughout app for non-critical writes.'),
    ]

    for name, priority, test_type, missing, impact in untested:
        story.append(KeepTogether([
            Paragraph(f"<b>{name}</b>", styles['BodyBold']),
            make_table([
                [Paragraph('<b>Feature</b>', styles['CB']), Paragraph('<b>Priority</b>', styles['CB']),
                 Paragraph('<b>Test Type</b>', styles['CB']), Paragraph('<b>Missing Scenarios</b>', styles['CB']),
                 Paragraph('<b>Failure Impact</b>', styles['CB'])],
                [Paragraph(name.split(' (')[0], styles['C']), Paragraph(priority, styles['C']),
                 Paragraph(test_type, styles['C']), Paragraph(missing, styles['C']),
                 Paragraph(impact, styles['C'])],
            ], [1.1*inch, 0.7*inch, 0.7*inch, 2.5*inch, 2.2*inch]),
            SP(0.1),
        ]))
    story.append(PageBreak())

    # ── 4. HIGH PRIORITY BREAKPOINTS ─────────────────────────────────────────
    story.append(Paragraph("4. High Priority Breakpoints (Top 10 Risks)", styles['SectionHead']))
    story.append(HR())

    risks = [
        ('1. ai-checkin: 444 lines of unprotected business logic',
         'The AI-powered daily check-in flow has zero tests. It handles OpenAI API calls with JSON extraction from markdown fences, task generation, database upserts, and partial failure recovery. A malformed AI response or timeout would crash the primary user workflow.',
         'Users unable to complete daily check-in, broken task generation, stuck loading states',
         'CRITICAL'),
        ('2. activate-trial: CAS guard and INSERT fallback untested',
         'The atomic CAS guard that prevents duplicate trials (.not("status","in","(active,trialing)")) has zero tests. If a Supabase query builder API change alters the .not() behavior, users could activate unlimited free trials. The INSERT fallback path for new subscriptions is also untested.',
         'Revenue loss from infinite free trials, subscription state corruption',
         'HIGH'),
        ('3. authStore.initialize() callback never exercised',
         'The onAuthStateChange callback is the single entry point for auth lifecycle in the app. Tests verify only the return type ({unsubscribe}), never the callback behavior. If fetchProfile fails silently in the callback, users see stale profiles indefinitely.',
         'Stale user profiles, broken onboarding detection, incorrect entitlement display',
         'HIGH'),
        ('4. All 26 screens have zero rendering tests',
         '6,883 lines of screen code with zero component rendering tests. No @testing-library/react-native setup. Screen-level bugs (broken navigation, incorrect state display, accessibility violations) are invisible to the test suite.',
         'User-facing bugs in every screen, no regression protection for UI changes',
         'HIGH'),
        ('5. Edge Function HTTP handlers never integration-tested',
         'All 6 Edge Functions have their pure logic partially tested (sanitize, event mapping, etc.), but the actual Deno.serve() HTTP handler \u2014 including auth extraction, rate limit orchestration, and response formatting \u2014 has zero integration tests.',
         'Auth bypass, rate limit bypass, malformed API responses',
         'HIGH'),
        ('6. Database RLS policies verified only by SQL regex',
         'RLS tests use regex to confirm policies exist in migration SQL, but never verify runtime behavior. No test confirms User A cannot read User B\'s chat messages, sessions, or subscription data.',
         'Cross-tenant data exposure, GDPR violation',
         'MEDIUM'),
        ('7. delete-account soft-delete + sign-out flow untested',
         'The account deletion flow (soft-delete profile, then sign-out) has zero tests. If soft-delete fails midway, the account is left in a broken state \u2014 user is signed out but data is not deleted.',
         'Inconsistent account state, compliance violation, user unable to re-register',
         'MEDIUM'),
        ('8. data-export GDPR compliance untested',
         'The data export function fetches from 8+ tables with a 10,000-row cap per table. No test verifies the export payload structure, Content-Disposition headers, or handling when individual table queries fail.',
         'Incomplete data export, GDPR non-compliance, malformed export files',
         'MEDIUM'),
        ('9. No E2E tests for critical user flows',
         'Zero Detox/Maestro/Playwright configuration. Critical flows like sign-up \u2192 onboarding \u2192 check-in \u2192 timer \u2192 rating \u2192 promise have never been tested end-to-end.',
         'Multi-step flow failures invisible to unit tests',
         'MEDIUM'),
        ('10. CI pipeline has no Deno test job',
         'The 48 Deno tests for Edge Functions and RLS policies are not executed in CI. The ci.yml only runs Jest. A regression in Edge Function logic would pass CI.',
         'Edge Function regressions deployed to production undetected',
         'MEDIUM'),
    ]

    for title, description, impact, severity in risks:
        story.append(Paragraph(f"<font color='#333366'>{title}</font>", styles['SubSection3']))
        story.append(Paragraph(f"How it breaks: {description}", styles['Body']))
        story.append(Paragraph(f"Impact: {impact}", styles['Body']))
        story.append(Paragraph(f"Severity: {severity}", styles['BodyBold']))
        story.append(SP(0.05))

    story.append(PageBreak())

    # ── 5. AUDIT TRAIL ───────────────────────────────────────────────────────
    story.append(Paragraph("5. What Was Checked (Audit Trail)", styles['SectionHead']))
    story.append(HR())

    story.append(Paragraph("<b>Files Analyzed:</b>", styles['BodyBold']))
    for item in [
        "All 26 screen files in app/ (6,883 lines)",
        "All 5 store files in src/stores/ (1,056 lines)",
        "All 11 service files in src/services/ (922 lines)",
        "All 5 lib files in src/lib/ (228 lines)",
        "All 17 component files in src/components/ (1,498 lines)",
        "All 6 Edge Function files in supabase/functions/ (1,564+ lines)",
        "4 database migration files in supabase/migrations/ (486 lines)",
        "All 33 test files (6,171 lines, 509 tests)",
        "jest.config.js, jest.setup.js, jest.fix-expo.js",
        ".github/workflows/ci.yml (104 lines)",
        "package.json, tsconfig.json, app.json",
    ]:
        story.append(Paragraph(f"\u2022 {item}", styles['Bullet']))

    story.append(SP(0.15))
    story.append(Paragraph("<b>Test Files Mapped:</b>", styles['BodyBold']))
    for item in [
        "src/stores/__tests__/ \u2014 7 files (authStore, chatStore, goalStore, sessionStore x2, subscriptionStore x2)",
        "src/services/__tests__/ \u2014 10 files (auth, chat, checkin, goals, profile, promises, sessions, shields, subscription, tasks)",
        "src/lib/__tests__/ \u2014 6 files (mmkv, sentry, timeout, routeProtection, sessionRating, timerLogic)",
        "src/utils/__tests__/ \u2014 3 files (constants, time, time.additional)",
        "src/hooks/__tests__/ \u2014 1 file (useAppState)",
        "src/components/__tests__/ \u2014 3 files (Button, Card, ErrorBoundary)",
        "supabase/functions/ \u2014 3 Deno test files (ai-chat, revenuecat-webhook, rls_policy)",
    ]:
        story.append(Paragraph(f"\u2022 {item}", styles['Bullet']))

    story.append(SP(0.15))
    story.append(Paragraph("<b>Assumptions Made:</b>", styles['BodyBold']))
    for item in [
        "No tests were executed. All findings from static code analysis and test file mapping.",
        "Coverage percentages for src/ from the last recorded Jest --coverage run (74.40% stmt).",
        "Edge Function coverage estimated from pure-function test count vs total branch count.",
        "Deno tests (48 tests) are written but NOT executed in CI \u2014 marked as available but unverified.",
        "Branch counts are manual approximations based on if/else/switch/try-catch/ternary analysis.",
        "@testing-library/react-native is listed in devDependencies but no screen tests use it.",
    ]:
        story.append(Paragraph(f"\u2022 {item}", styles['Bullet']))

    story.append(PageBreak())

    # ── 6. FINAL VERDICT ─────────────────────────────────────────────────────
    story.append(Paragraph("6. Final Verdict", styles['SectionHead']))
    story.append(HR2())
    story.append(SP(0.15))
    story.append(Paragraph("<b>Can this system safely go to production?</b>", styles['SubSection']))
    story.append(Paragraph("CONDITIONAL YES \u2014 with known risks accepted and mitigations in place.", styles['VerdictOrange']))

    story.append(Paragraph("Justification (direct, no hedging):", styles['BodyBold']))
    for item in [
        "The core business logic layer (stores + services) is well-tested at 87%+ coverage with 248 tests across 17 suites. Critical paths like subscription management, session persistence, chat rate limiting, and goal state transitions have comprehensive unit tests.",
        "Recent improvements have closed previously-critical gaps: REFUND webhook handler added, prompt injection defenses hardened, restoreTimerFromMMKV fully branch-tested, signUp tested, route protection logic verified, clarification loop capped, CI coverage threshold enforced at 70%.",
        "The remaining HIGH-risk items are: (1) ai-checkin Edge Function with 444 lines and 0 tests, (2) activate-trial CAS guard untested, (3) authStore.initialize() callback behavior untested, (4) zero screen rendering tests.",
        "The 48 Deno tests for Edge Functions and RLS policies exist but are NOT integrated into CI. Until a `deno test` job is added to ci.yml, these provide documentation value only.",
        "Zero E2E tests means multi-step user flows (onboarding \u2192 check-in \u2192 timer \u2192 rating) are only validated by the sum of their unit tests, not as integrated journeys.",
    ]:
        story.append(Paragraph(f"\u2022 {item}", styles['Bullet']))

    story.append(SP(0.15))
    story.append(Paragraph("<b>Minimum gates before full production confidence:</b>", styles['BodyBold']))
    gates = [
        ("1. Add Deno test job to CI pipeline", "HIGH", "BLOCKING"),
        ("2. Write integration tests for ai-checkin (all 21 branches)", "HIGH", "BLOCKING"),
        ("3. Write tests for activate-trial CAS guard + INSERT fallback", "HIGH", "BLOCKING"),
        ("4. Test authStore.initialize() callback behavior (invoke the subscription callback)", "HIGH", "HIGH"),
        ("5. Write tests for delete-account soft-delete flow", "MEDIUM", "HIGH"),
        ("6. Write tests for data-export payload structure", "MEDIUM", "HIGH"),
        ("7. Set up @testing-library/react-native and test check-in.tsx", "MEDIUM", "MEDIUM"),
        ("8. Add live RLS integration tests (User A cannot read User B's data)", "MEDIUM", "MEDIUM"),
        ("9. Set up E2E framework (Maestro recommended for React Native)", "LOW", "MEDIUM"),
        ("10. Write fireAndForget.ts tests", "LOW", "LOW"),
    ]
    for gate, priority, urgency in gates:
        story.append(Paragraph(f"{gate} \u2014 {priority} priority, {urgency}", styles['Bullet']))

    story.append(SP(0.3))
    story.append(HR2())
    story.append(Paragraph(
        f"Report generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} | "
        "Methodology: Static code + test file mapping | No tests executed | "
        "All branch counts are manual approximations",
        styles['SmallNote']))

    doc.build(story)
    print(f"PDF generated: {OUTPUT_PATH}")


if __name__ == '__main__':
    build_pdf()
