# Offline English static-vector proof; no app route/provider activation.
import hashlib, json, math, os, pathlib, resource, socket, sys, time
MODEL_WHEEL_SHA256 = "5e6329fe3fecedb1d1a02c3ea2172ee0fede6cea6e4aefb6a02d832dba78a310"
MODEL_FILES = {'config.cfg': '24b1b17065a74a6a3f999dd9c722f5532dc6bb5994b6a7ba5aa4f2ce09d434cc', 'meta.json': '5bcf739c5ac3b0038fc218d3227f8600e35a420e29fbe4c6bcc643688ab63b1b', 'tokenizer': 'b014e8bba4958b120af2d0c1c63eabb7c00379f2bacaf10df7c5325efd2ea467', 'vocab/key2row': '1a1825f75ae9d691024317632021a49970ce61bcc007bc176f77ca429c3bcf5c', 'vocab/lookups.bin': 'fce9c883c56165f29573cc938c2a1c9d417ac61bd8f56b671dd5f7996de70682', 'vocab/strings.json': 'efd814b36290d2513b683c924571d9e3b25bf6c60bb89c13cb8c3436d2cb6cfa', 'vocab/vectors': '22d102290ba09bb681c5a2e6063e9b4cea4c41dec9517565181a907b6ba6a830', 'vocab/vectors.cfg': 'ff4359091952c8cd16f1f0482f5770fb82d1707368d5cca3c46aa501f552e3c5'}

def reject():
    raise ValueError("LOCAL_SEMANTIC_REJECTED")

def disabled_network(*_args, **_kwargs):
    raise RuntimeError("LOCAL_SEMANTIC_NETWORK_DISABLED")

def main():
    if len(sys.argv) != 2:
        reject()
    model_dir = pathlib.Path(sys.argv[1])
    if not model_dir.is_absolute() or model_dir.is_symlink() or not model_dir.is_dir():
        reject()
    raw = sys.stdin.buffer.read(65537)
    if len(raw) > 65536:
        reject()
    request = json.loads(raw)
    if not isinstance(request, dict) or set(request) != {"texts"}:
        reject()
    texts = request["texts"]
    if not isinstance(texts, list) or not 2 <= len(texts) <= 25 or any(not isinstance(t, str) or not t.strip() or len(t) > 500 for t in texts):
        reject()
    for entry in model_dir.rglob("*"):
        relative = entry.relative_to(model_dir).as_posix()
        if entry.is_symlink() or (entry.is_dir() and relative != "vocab") or (not entry.is_dir() and relative not in MODEL_FILES):
            reject()
    for relative, expected in MODEL_FILES.items():
        file = model_dir / relative
        if file.is_symlink() or not file.is_file() or file.stat().st_size > 64 * 1024 * 1024:
            reject()
        digest = hashlib.sha256()
        with file.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(block)
        if digest.hexdigest() != expected:
            reject()
    # Reject network operations even if an imported runtime attempts them.
    # This is an extra process-level guard, not an OS network namespace claim.
    class OfflineSocket(socket.socket):
        connect = disabled_network
        connect_ex = disabled_network
        bind = disabled_network
        listen = disabled_network
        sendto = disabled_network
    socket.socket = OfflineSocket
    socket.create_connection = disabled_network
    socket.getaddrinfo = disabled_network
    os.environ["OMP_NUM_THREADS"] = "1"
    os.environ["OPENBLAS_NUM_THREADS"] = "1"
    started = time.perf_counter()
    import spacy
    if spacy.__version__ != "3.8.8":
        reject()
    spacy.require_cpu()
    model = spacy.load(model_dir, exclude=["tok2vec", "tagger", "parser", "senter", "ner", "attribute_ruler", "lemmatizer"])
    if model.pipe_names or model.vocab.vectors_length != 300:
        reject()
    loaded = time.perf_counter()
    vectors = [model.make_doc(text).vector.tolist() for text in texts]
    if any(len(vector) != 300 or any(not math.isfinite(value) for value in vector) for vector in vectors):
        reject()
    finished = time.perf_counter()
    return {"vectors": vectors, "metadata": {
        "model": "en_core_web_md", "version": "3.8.0", "runtime": "spacy", "runtimeVersion": spacy.__version__,
        "kind": "english-static-word-vector-mean", "language": "en", "dimensions": 300,
        "modelWheelSha256": MODEL_WHEEL_SHA256, "verifiedModelFiles": len(MODEL_FILES),
        "loadMs": round(1000 * (loaded - started), 3), "embeddingMs": round(1000 * (finished - loaded), 3),
        "peakRssKiB": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        "productionReady": False,
    }}

if __name__ == "__main__":
    try:
        sys.stdout.write(json.dumps(main(), allow_nan=False) + "\n")
    except Exception:
        # Never echo model paths, input text, environment or unfiltered exceptions.
        sys.stderr.write("LOCAL_SEMANTIC_REJECTED\n")
        sys.exit(1)
