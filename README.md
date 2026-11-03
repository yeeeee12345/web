# 请和我交往吧

一部以校园生活与恋爱选择为主题的 WebGAL 互动视觉小说。

- 引擎：WebGAL 4.6.1（MPL-2.0）
- 语言：简体中文
- 时长：单周目约 2.2 万字，两条路线
- 分支：共通线 12 章 → 第十二章分线 → 角色线 6 章 → 终章

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
    i/                 Ivan 线
    w/                 运谦线
    番外/              条件支线（两人暗中较劲）
  background/         背景与 CG（1920×1080）
  figure/             角色立绘（透明 PNG）
  bgm/                背景音乐
  template/           界面样式（SCSS，运行时加载）
  animation/          动画预设
```

## 系统

- 好感度：`Ivan_Love`、`WanHim_Love`，全篇共 75 处数值更新，角色线每章都有选择收益。
- 学习风格：`StudyStyle` 记录月考前的复习选择，影响第十一章考场回忆与第十二章午餐对话。
- 考试结果：`ExamResult` 记录考场发挥，影响后续对白。
- 角色线选择记忆：`IvanBookStyle`、`IvanDrinkStyle`、`IvanWeekStyle`、`IvanStageStyle`、`IvanReportStyle`、`IvanRainStyle`、`WanNameStyle`、`WanShopStyle`、`WanSampleStyle`、`WanStageStyle`、`WanRadioStyle`、`WanRecordStyle`，各自在后文回响。
- 高好感番外：`i/第十六章` 与 `w/第十六章` 末尾按 `Ivan_Love>74` / `WanHim_Love>74` 进入。
- 三人番外：`Ink_Count>1` 时进入 `番外/两人暗中较劲.txt`。

## 编辑

- 剧本直接改 `game/scene/*.txt`，保存后刷新即可生效，无需重新构建。
- 界面配色与字体改 `game/userStyleSheet.css`，或 `game/template/**/*.scss`。
- 立绘与背景可直接替换同名文件。

## 素材说明

背景、立绘、CG 均为本项目自绘的矢量插画（SVG 渲染为位图），
不包含第三方图片素材。
