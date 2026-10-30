# Shopping price history

Use price history when deciding whether an advertised discount is meaningful or whether to buy now.
Treat it as one evidence channel alongside the current seller's offer, product quality and service.
Use existing browser or mobile tools; this guide adds no API, crawler or runtime dependency.

## Choose an accessible route

| Route | Starting point | Capability to verify |
| --- | --- | --- |
| Browser | [慢慢买 home](https://www.manmanbuy.com/) → 查历史价, or the [official query page](https://tool.manmanbuy.com/HistoryLowest.aspx) | Input a real product link, then check whether a product-specific result and chart actually load |
| Existing mobile App | Copy a Taobao/JD product link, then open 慢慢买; follow the App's visible query controls | Device connection, correct App, authorization, link recognition and actual chart access |
| Other accessible source | Store offer history or another existing price-history service | Exact product, source coverage, dates, conditions and access restrictions |

The query page's FAQ says computer users can paste Taobao/JD links or Taobao share codes;
mobile users can copy a link from those shopping Apps and open 慢慢买.
This is an official capability statement, not a guarantee for every link or environment.
The [official App page](https://home.manmanbuy.com/app.aspx) is a discovery/download route, not price evidence.
An installed App, logged-in account or connected phone still needs a successful query check.

## Run a small query

1. Obtain a real product URL from an accessible product page or the user's supplied link.
   Retain the original source and selected model, SKU, variant and seller; never invent an item ID.
2. Prefer the browser when it provides enough evidence. Paste the full link into the official query form.
   If using an already authorized phone/App, use its visible link query flow instead.
3. Inspect the returned product identity before reading prices. Resolve a wrong variant or store first.
   A short link or share code may resolve to a different offer; check the final destination.
4. Read the available chart period, dated price points, price labels and promotion details.
   Hover/tap a point when supported; use a focused screenshot if the chart is absent from text extraction.
5. Compare a recent comparable historical point and the visible minimum with today's eligible offer.
   Return to the seller's current terms before recommending a purchase.

A loaded query form, successful redirect, search snippet, download banner or sample chart is not a result.
Report a product-specific price only when its identity, amount, date and scope were actually observed.
Do not infer prices or dates from an unreadable curve, a hidden chart or promotional artwork.

Read back the entered URL/share text before submitting, including punctuation and the complete item ID.
A tool reporting successful text entry does not prove the App received the intended link: an input method
may transform characters. If that happens, clear the field and use the available clipboard-write capability
with the normal system paste action, then read back the field again. On Android, use `KEYCODE_PASTE`
when supported by the connected tool; do not assume a particular tool namespace or command syntax.
Recheck the returned product identity even after the pasted text matches.

## Access and observed limits

- Public access to the input form does not establish anonymous access to the result.
- In an anonymous browser check, a real JD product URL opened a 微信登录 / APP扫码登录 dialog.
  No product-specific historical curve or historical price was read before that login boundary.
  This check establishes a browser login barrier for that attempt; it does not prove all queries require login.
- A separate device check confirmed one real JD link could return matching model/seller information,
  a dated historical minimum and a visible curve in the App. Verify each new query independently.
  This does not establish complete product-detail or comment access; Taobao queries remain unverified.
  Browser failure does not establish App failure or universal App-only access.
- At login, CAPTCHA, download/install, paid access or another barrier, record the actual requirement.
  Use an accessible authorized route or let the user handle the prerequisite; do not bypass restrictions.
- Do not assume website and App sessions are shared, or copy cookies/credentials between them.
  Use only designated research sessions/accounts; an existing login does not authorize account changes.
- Do not describe the whole service as free from a public query form or a free-registration link.
  Record any observed charge and what it buys; a blocked query leaves later access and fees unverified.

## Read the price correctly

The official query FAQ says its displayed prices combine coupons, reductions, promotions and user reports
and aim to approximate an actual purchase price. It gives no fixed collection interval in that FAQ.
Treat these as the service's stated approach, not proof that every point includes every applicable benefit.

- Match platform, item ID, specification/capacity/colour/pack size, seller and new/refurbished status.
  The same model name, another seller or a changed bundle does not establish a comparable SKU price.
- Separate the record's offer date, collection/update date, chart range and your retrieval time.
  If collection frequency, timezone or a date is not shown, record it as unknown.
- Check coupon eligibility and quantity, order threshold, cross-store reductions and promotion timing.
  Check membership, new-user, region, payment-method and government/trade-in subsidy conditions separately.
  Retain labels excluding red packets or limited-time subsidies. If precise pricing requests shopping-account
  authorization, record that boundary; do not treat the displayed estimate as an authorized checkout quote.
- Keep immediate cash payment separate from delayed cashback, returned shopping cards/credit and gifts.
  Do not subtract a future benefit at full face value without its redemption conditions and the user's use case.
- Include shipping and required extra purchases where known; explain unavailable eligibility or cost details.
- A historical minimum is the lowest visible record within the source's scope and selected period.
  It is not a guaranteed current checkout price, a promise to recur, or the lowest price across all channels.
- Missing points, new listings, delisting, changed pages or incomplete collection can limit the record.
  “No history returned” does not establish that the item never sold cheaper or that today's discount is genuine.

## Keep evidence and report the decision

Keep the compact query record outside the public skill; reuse the [channel coverage record](channels.md#coverage-record).
Record product/source URL, selected SKU and seller, browser/App route, retrieval time and observed access state.
For each quoted price, retain its date, chart range, collection/update date if shown, conditions and evidence location.
Label official descriptions, directly observed points and unresolved eligibility separately.
Record `blocked` for a login/CAPTCHA barrier, `partial` for an incomplete chart, and `not_searched` for untested routes.
Store no account identifiers, login QR codes, cookies or private screenshots in the repository.

Give the user a short decision: comparable historical range/minimum, current eligible price, whether waiting
has evidence behind it, and the most important unresolved condition. If blocked, say no historical price was read.
Avoid claiming continuous tracking, complete platform history, all-channel coverage or a guaranteed purchase price.
