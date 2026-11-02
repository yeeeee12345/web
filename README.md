# 请和我交往吧

一部以校园生活与恋爱选择为主题的 WebGAL 互动视觉小说。

- 引擎：WebGAL 4.6.1（MPL-2.0）
- 语言：简体中文
- 时长：单周目约 1.7 万字，三条路线

## 运行

需要通过 HTTP 提供（剧本以 `fetch` 加载，`file://` 无法读取）：

```bash
python -m http.server 8000
# 打开 http://localhost:8000
```

## 结构

```
game/
  config.txt          游戏配置
  scene/              剧本（WebGAL 脚本）
    start.txt         序章
    第一章..第十二章    共通线
    i/  w/  y/        三条角色线
    番外/              条件支线
  background/         背景与 CG（1920×1080）
  figure/             角色立绘（透明 PNG）
  bgm/                背景音乐
  template/           界面样式（SCSS，运行时加载）
  animation/          动画预设
```

## 编辑

- 剧本直接改 `game/scene/*.txt`，保存后刷新即可生效，无需重新构建。
- 界面配色与字体改 `game/userStyleSheet.css`，或 `game/template/**/*.scss`。
- 立绘与背景可直接替换同名文件。

## 素材说明

背景、立绘、CG 均为本项目自绘的矢量插画（SVG 渲染为位图），
不包含第三方图片素材。
