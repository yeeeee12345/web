# 请和我交往吧

一部以校园生活与恋爱选择为主题的 WebGAL 互动视觉小说。

## 本地运行

这是可直接部署的静态 WebGAL 构建目录。请通过本地 HTTP 服务器打开，勿直接双击 `index.html`（`file://` 会影响模块资源加载）。

```sh
python -m http.server 8000
```

然后访问 <http://localhost:8000>。部署时请将整个目录原样发布，保留 `assets/`、`game/`、`icons/`、`manifest.json` 和 `webgal-serviceworker.js` 的相对路径。

## 内容目录

- `game/scene/`：章节脚本
- `game/background/`、`game/figure/`：背景与角色素材
- `game/bgm/`、`game/vocal/`：音乐与语音
- `assets/`：WebGAL 引擎构建资源

启动页支持鼠标、触控和键盘（Tab 聚焦后按 Enter 或空格）。"# web" 
