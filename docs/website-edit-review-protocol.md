# Website Edit Review Protocol — MANDATORY

**Applies to every website build or edit** produced for a customer — whether the
draft is created by a human admin, by Claude, or by Andy/NanoClaw automation.

**The rule:** Before a draft's status is moved to `review_ready` (i.e. before it
is submitted to the customer to **approve or deny**), it MUST pass **three
independent review passes, each from a different vantage point.** If any pass
finds a problem, **fix it and re-run all three.** A draft only goes to the
customer once all three passes are clean. The goal is to catch slop code, rushed
code, and bandaid fixes — anything that doesn't truly satisfy the original
request — *before* the customer ever sees it.

This is not optional polish. A rough draft that reaches the customer with
silent failures, half-done work, or band-aid fixes is a defect in the process,
not just the code.

---

## Pass 1 — Requirement fidelity (does it actually solve the ask?)

Review against the **original change request / project brief**, not against the
work you just did.

- Re-read the original request verbatim. List every item it asked for.
- Confirm **every** item is fully addressed — no partial work, no "good enough,"
  no band-aid that papers over the real ask.
- Confirm nothing was **faked, stubbed, hardcoded, or placeholdered** to look
  finished while not actually working.
- If the request was ambiguous, or the correct fix differs from what was literally
  asked, **capture that context in writing** so the customer understands the
  decision and any trade-off when they review.

## Pass 2 — Code & build quality (slop / rushed / band-aid hunt)

Read the **full diff as a senior engineer** whose job is to reject sloppy work.

- Hunt for: slop code, rushed shortcuts, band-aid fixes, **silent failures**
  (empty catches, swallowed errors, no-op fallbacks), dead/placeholder code,
  copy-paste drift, leftover debug code.
- Trace the **full data flow** for the change. Check the **failure paths**, not
  just the happy path. Fix the class of bug, not just the one instance.
- Verify it follows existing patterns and introduces no regression or new tech
  debt.
- Confirm the build is clean: type-check, lint, no broken imports, no console
  errors/warnings. **Nothing fails silently.**

## Pass 3 — Design & function (the customer's eyes, live)

Load the **actual page/site** and use it the way the customer will.

- Walk every affected flow on **both desktop and mobile (iPhone viewport).**
- Check: visual polish, responsiveness, no layout breaks, **no dead/backdrop
  buttons**, links work, forms submit, no console/network errors, acceptable
  load speed.
- Confirm it looks and feels like **finished, professional work** — not a rough
  placeholder a customer would be embarrassed to show.

---

## Gate

Only after **all three passes are clean** — and any issue found was **fixed and
re-reviewed** — may the draft move to `review_ready` for the customer to approve
or deny.

**Record** what each pass checked and what was fixed, so there is context if an
issue surfaces later. A passed review with no notes is not a passed review.

> Would a staff engineer approve this going in front of a paying customer? If the
> answer is anything but a confident yes, it is not ready to submit.
