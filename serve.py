# -*- coding: utf-8 -*-
"""本地静态服务器：为 WebGAL 游戏目录提供 HTTP 服务。

用法:
    python serve.py [port]
默认端口 8000，被占用时自动向后寻找可用端口。

相对 `python -m http.server` 的改进：
  * 剧本 / 配置 / 样式带 no-cache，改完刷新浏览器即生效
  * 正确声明字体与图片的 MIME（woff2 / webp / mp3）
  * 屏蔽编辑器专用的 /api/webgalsync 探测，避免 404 噪音
  * 日志只打印异常请求
"""
import http.server
import socketserver
import os
import sys
import socket

GAME_ROOT = os.path.dirname(os.path.abspath(__file__))

# 补全 Python 标准库未注册的 MIME
EXTRA_TYPES = {
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".json": "application/json",
    ".scss": "text/plain; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        **EXTRA_TYPES,
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=GAME_ROOT, **kwargs)

    def do_GET(self):
        # 编辑器热重载用的 WebSocket 端点，静态部署下不存在，直接返回 204
        if self.path.startswith("/api/webgalsync"):
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        # 内容文件每次都校验，改完刷新即生效
        if self.path.endswith((".txt", ".json", ".css", ".scss")):
            self.send_header("Cache-Control", "no-cache")
        elif self.path.endswith((".woff2", ".png", ".jpg", ".webp", ".mp3")):
            self.send_header("Cache-Control", "public, max-age=86400")
        super().end_headers()

    def log_message(self, fmt, *args):
        # 只打印非 200/204/304，避免刷屏
        code = str(args[1]) if len(args) > 1 else ""
        if code not in ("200", "204", "304"):
            sys.stderr.write("  [%s] %s\n" % (code, fmt % args))


def free_port(start):
    for p in range(start, start + 40):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", p)) != 0:
                return p
    raise RuntimeError("8000-8039 全部被占用")


if __name__ == "__main__":
    want = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    port = free_port(want)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
        url = "http://127.0.0.1:%d/" % port
        print("=" * 60)
        print("  请和我交往吧 —— 本地预览")
        print("  " + url)
        print("  目录: " + GAME_ROOT)
        print("  Ctrl+C 停止")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已停止。")
