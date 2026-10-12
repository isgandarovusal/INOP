# INOP web logo assets

Source reference: the user's attached INOP image (12 October2026, Asia/Baku). The attachment was visible to the assistant, but its original binary/vector master was not exposed as a downloadable workspace file. These are explicitly **web derivatives from that visual reference**, prepared with the image editing tool and inspected; not a claim of pixel-identical original master/vector artwork.

The first transparent extraction had visible white artifacts and was rejected. The accepted dark tile retains the silver/violet INOP wordmark and original subtitle on a near-black field; no new logo symbol, UI glow or CSS gradient is added. Both intermediate tool files remain outside the repo in `/workspace/generated_images`; neither large PNG is shipped.

The retained proportional WebP derivatives are `Frontend/src/assets/brand/inop-320.webp` (320×128, about3.6KB) and `inop-640.webp` (640×256, about7.3KB). These original local assets remain unchanged for provenance; they are no longer requested by the shared wordmark component.

Phase20 replaces the dark tile in login and shell with `Frontend/src/Components/INOPLogo.tsx`: an inline, transparent SVG interpretation of the supplied reference. The user explicitly reconfirmed this vector interpretation after automatic approval review initially rejected it. This is not an official or pixel-identical vector master. The angular letters, violet ring and subtitle preserve the reference identity; navy letters on white and light letters on navy remain readable without a rectangular background. No image, background rectangle, CSS gradient, script, external font or logo network request is introduced. Intrinsic320×128 dimensions preserve the existing2.5aspect layout; inline markup stays below4KB and sidebar width remains144px. The accessible SVG name is INOP — Internal Operations Platform.

The final official source/vector, if exact master fidelity is required, remains a branding handoff rather than a fabricated claim. Replacing these files with company-approved equivalents must retain the aspect ratio/alt/intrinsic-size contract and the small transfer budget. It never changes HR authorization.
