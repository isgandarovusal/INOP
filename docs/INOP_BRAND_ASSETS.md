# INOP web logo assets

Source reference: the user's attached INOP image (12 October2026, Asia/Baku). The attachment was visible to the assistant, but its original binary/vector master was not exposed as a downloadable workspace file. These are explicitly **web derivatives from that visual reference**, prepared with the image editing tool and inspected; not a claim of pixel-identical original master/vector artwork.

The first transparent extraction had visible white artifacts and was rejected. The accepted dark tile retains the silver/violet INOP wordmark and original subtitle on a near-black field; no new logo symbol, UI glow or CSS gradient is added. Both intermediate tool files remain outside the repo in `/workspace/generated_images`; neither large PNG is shipped.

Only proportional resize/WebP compression follows the inspected tile: `Frontend/src/assets/brand/inop-320.webp` (320×128, about3.6KB) and `inop-640.webp` (640×256, about7.3KB). The shared INOPLogo supplies intrinsic dimensions, responsive srcset, meaningful alt text and asynchronous decoding. Login and both shell brand positions reuse it. Hash filenames from Vite permit public asset caching; no private data or external font request is added.

The final official source/vector, if exact master fidelity is required, remains a branding handoff rather than a fabricated claim. Replacing these files with company-approved equivalents must retain the aspect ratio/alt/intrinsic-size contract and the small transfer budget. It never changes HR authorization.
