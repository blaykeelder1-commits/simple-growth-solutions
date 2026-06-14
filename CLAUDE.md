# Simple Growth Solutions — Project Rules

These rules govern all work in this repository and bind any agent that produces
website work for customers — human admin, Claude, or Andy/NanoClaw automation.

## Website Edit Review Protocol (MANDATORY)

**Before any website build or edit is submitted to a customer for approval/denial
(status → `review_ready`), it MUST pass three independent review passes, each
from a different vantage point. If any pass finds a problem, fix it and re-run
all three. A draft only reaches the customer once all three are clean.**

1. **Requirement fidelity** — does it fully solve the original request? No
   partial work, no faked/stubbed/placeholder pieces, no band-aid over the real
   ask. Capture context for any ambiguity or trade-off.
2. **Code & build quality** — read the full diff as a senior engineer: no slop,
   rushed shortcuts, band-aid fixes, or silent failures (empty catches, swallowed
   errors). Trace the full data flow and the failure paths. Build clean
   (type-check, lint, no console errors).
3. **Design & function (live)** — load the actual page and walk every affected
   flow on desktop **and** mobile (iPhone). No dead/backdrop buttons, no layout
   breaks, links/forms work, no console errors, professional polish.

Record what each pass checked and what was fixed. The bar: *would a staff
engineer approve this going in front of a paying customer?*

Full protocol: [`docs/website-edit-review-protocol.md`](docs/website-edit-review-protocol.md).
When the SGS edit automation is wired into Andy/NanoClaw, it must load this
protocol and run the three passes before setting `review_ready`.
