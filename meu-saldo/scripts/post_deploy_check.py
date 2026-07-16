import json
import os
import sys
import urllib.error
import urllib.request


BACKEND_URL = os.getenv("MEUSALDO_BACKEND_URL", "https://meusaldo.onrender.com").rstrip("/")
FRONTEND_URL = os.getenv("MEUSALDO_FRONTEND_URL", "https://meusaldo-frontend.vercel.app").rstrip("/")


def check(url: str, expected_content: str | None = None) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "MeuSaldo post-deploy check"})
    with urllib.request.urlopen(request, timeout=60) as response:
        body = response.read().decode("utf-8", errors="replace")
        if response.status != 200:
            raise RuntimeError(f"{url} retornou HTTP {response.status}")
        if expected_content and expected_content not in body:
            raise RuntimeError(f"{url} nao retornou o conteudo esperado")
        print(json.dumps({"url": url, "status": response.status, "ok": True}))


def main() -> int:
    try:
        check(f"{BACKEND_URL}/health", '"healthy"')
        check(f"{BACKEND_URL}/health/db", '"connected"')
        check(f"{BACKEND_URL}/health/ready", '"ready"')
        check(f"{FRONTEND_URL}/login", 'id="root"')
    except (OSError, RuntimeError, urllib.error.URLError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
