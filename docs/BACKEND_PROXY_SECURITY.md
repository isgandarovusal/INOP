# Proxy and rate limiting

Cause: server.js left Express trust proxy at its false default while Render sends X-Forwarded-For. express-rate-limit reports ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and otherwise counts the gateway socket address, grouping clients. Helmet/CORS/JSON/error standardization, /api-only limit 100 per 15 minutes, localized 429 shape and auth routes are preserved.

Prepared configuration: trust at most ONE immediate hop only when official Render variables identify RENDER=true and RENDER_SERVICE_TYPE=web. Local/other/private-service runtimes stay false. INOP_TRUST_RENDER_PROXY=false is a fail-closed opt-out. Never trust=true; no client-controlled CF-Connecting-IP/True-Client-IP substitute or broad RFC1918 CIDR trust. The default IPv6 subnet normalization of express-rate-limit remains enabled.

Sources checked 2026-10-14:
- https://render.com/docs/web-services: public traffic goes through Render; the application port is not directly public; the gateway terminates TLS then forwards HTTP.
- https://render.com/docs/environment-variables: RENDER and RENDER_SERVICE_TYPE are documented platform variables.
- https://expressjs.com/en/guide/behind-proxies/: numeric trust walks from socket then XFF right-to-left, with a warning about shorter alternate paths.
- https://express-rate-limit.mintlify.app/reference/error-codes and /guides/troubleshooting-proxy-issues: false trust with XFF causes the warning/global bucket.
- https://feedback.render.com/features/p/send-the-correct-x-forwarded-for: provider statement and later conflicting user observations. This is NOT a stable guarantee of an exact deployed chain.

Important deployment limit: the live INOP header chain and Render ingress peer addresses were not measured. One immediate hop is a conservative bounded attribution choice, not a claim that the platform always has exactly one proxy. For appended chains, arbitrary forged left entries cannot change the nearest untrusted address. If an additional platform proxy is the nearest XFF value, attribution may still group users; DO NOT increase trust blindly. Before an authorized backend release, verify the service type, sanitized forwarding chain and absence of untrusted direct/private paths using controlled ingress observations or Render support. No public IP echo endpoint was added. For custom upstream proxies or untrusted direct peers use verified peer CIDRs/network restrictions, or disable this trust with the opt-out; numerical trust alone cannot distinguish a direct malicious internal peer from a gateway.

Local tests use synthetic socket/XFF chains, not production clients: spoofed left values share the real rightmost client's quota; different clients behind one socket are independent; direct/local XFF is ignored; IPv6 rotations retain a subnet bucket; missing headers fall back to socket; real synthetic JWT verification and localized/error-standardized 429 and health bypass work. Rate limiting remains process-local MemoryStore as before; no distributed store, API schema or DB change.
