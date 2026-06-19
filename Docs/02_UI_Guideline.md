# 黑地平线：原体觉醒 — UI 设计规范 v3.6

> 合并自 Docs/UI/ 目录下全部 11 个子文档。最后更新：2026-06-14

---

## 1. 设计令牌 (Design Tokens)

```css
:root {
    /* 背景体系 */
    --bg-deep:        #050508;
    --bg-panel:       rgba(10,15,25,0.85);
    --bg-card:        rgba(5,5,10,0.8);
    --bg-modal:       rgba(5,10,15,0.98);
    --border-dim:     #1a2a3a;

    /* 语义色 */
    --accent-red:     #ff4455;   /* 危险/敌人/HP/攻击 */
    --accent-green:   #00ff88;   /* 成功/营地/RAM/治疗 */
    --accent-blue:    #00d4ff;   /* 信息/档案/护盾/反伤 */
    --accent-yellow:  #ffd54f;   /* 金币/涂层/克制/闪避 */
    --accent-purple:  #ce93d8;   /* 炼金/魔药/毒性 */
    --accent-orange:  #cc7000;   /* 操作/回合结束/蓄力 */

    /* 种族色 */
    --race-mutant:    #ff6b4a;   /* 异变者 — 血肉暗红 */
    --race-swarm:     #9acd32;   /* 寄生群落 — 酸蚀黄绿 */
    --race-ember:     #4ab8ff;   /* 机械余烬 — 电弧冰蓝 */

    /* 文字层级 */
    --text-main:      #c8e6c9;
    --text-dim:       #78909c;
    --text-disabled:  #555555;
    --text-white:     #ffffff;

    /* 辉光 */
    --glow-green:     0 0 12px rgba(0,255,136,0.5);
    --glow-red:       0 0 12px rgba(255,68,85,0.5);

    /* 统一度量 */
    --btn-radius:     6px;
}
```

## 2. 文字排版

| 类名 | 字号 | 用途 |
|------|------|------|
| `.txt-xs` | 13px | 正文、标签、说明 |
| `.txt-sm` | 14px | 次标题 |
| `.txt-md` | 18px | 弹窗标题 |
| `.txt-lg` | 24px | 大标题 |

| 类名 | 颜色变量 | 用途 |
|------|---------|------|
| `.txt-white` | `--text-white` | 强调/标题 |
| `.txt-dim` | `--text-dim` | 次要/说明 |
| `.txt-green` | `--accent-green` | 成功/日志 |
| `.txt-red` | `--accent-red` | 危险/HP |
| `.txt-gold` | `--accent-yellow` | BP/涂层 |
| `.txt-purple` | `--accent-purple` | 毒性/魔药 |
| `.txt-blue` | `--accent-blue` | 信息/护盾 |
| `.txt-bold` | — | 加粗 |

**规则**：最小字号 13px（允许 12px 仅限极小按钮）。禁用颜色简写（`#f44`、`#0f8`）。

## 3. 按钮系统

| 语义 | 类名 | 背景 | 文字色 | 边框 |
|------|------|------|--------|------|
| 成功 | `.btn-green` | `#1a3a1a` | `--accent-green` | `--accent-green` |
| 危险 | `.btn-red` | `#3a1111` | `--accent-red` | `--accent-red` |
| 信息 | `.btn-blue` | `#112233` | `--accent-blue` | `--accent-blue` |
| 炼金 | `.btn-purple` | `#1a1020` | `--accent-purple` | `#9c27b0` |
| 涂层 | `.btn-gold` | `#1a1a00` | `--accent-yellow` | `#f57f17` |
| 操作 | `.btn-orange` | `#3a1a00` | `--text-white` | `--accent-orange` |
| 禁用 | `.btn-gray` | `#1a1a1a` | `--text-disabled` | `#333333` |

- hover: `filter: brightness(1.15); transform: translateY(-1px)`
- active: `transform: translateY(1px)`
- disabled: `opacity: 0.4; filter: grayscale(0.5)`
- `btn-sm`: padding 4×12, 13px
- `btn-capsule`: border-radius 25px

## 4. 状态条

| 属性 | 填充色 | 填充类 | 高度 | 圆角 |
|------|--------|--------|------|------|
| 生命 | `--accent-red` | `.hp-fill` | 10px | 4px |
| 进程 | `--accent-green` | `.ram-fill` | 10px | 4px |
| 毒性 | `--accent-purple` | `.tox-fill` | 10px | 4px |
| 等阶 | `--accent-blue` | `.xp-fill` | 10px | 4px |
| 怪物 | `--accent-red` | `.hp-fill` | 8px | 4px |

通用容器：`.progress-container` — 宽100%、高12px、`#1a1a1a` 背景、圆角6px、overflow:hidden。

## 5. 弹窗系统

所有弹窗宽度统一 `min(700px,90vw)`，背景 `var(--bg-modal)`，圆角 12px。

| 弹窗 | 函数 | 边框色 | 备注 |
|------|------|--------|------|
| 档案 | `showStatusModal()` | `--accent-blue` | 核心指标 + 器官状态 + 专精流派 |
| 实验室 | `showReorganizeModal()` | `--accent-green` | 器官装备 + 魔药 + 涂层 + 组件库存 + 合成 |
| 图鉴 | `showBestiaryModal()` | `--accent-yellow` | 按种族分组、颜色标题、上方击杀统计 |
| 存档 | `showSaveModal()` | `--accent-purple` | 3槽位 + 导入导出 |
| 手册 | `showHelpPanel()` | `--accent-blue` | 4标签(基础/战斗/实验室/配方) |
| 合成 | `_showSynthesizeModal()` | `--accent-yellow` | 选择3组件→预览→确认 |
| 通知 | `showNotification()` | 动态 | 1px边框、淡入淡出1.6s |
| 死亡 | 内联 | `--accent-red` | 序列崩解 + BP扣减 + 确认重组按钮 |

框外说明栏：弹窗上/下方20px间距，背景 `var(--bg-card)`，边框 `var(--border-dim)`，圆角4px。

## 6. 图标系统

共 **41 个 SVG 图标**，来源：
- 35 个 Game-icons.net (CC-BY 3.0)
- 6 个 Lucide (MIT)：shield-check、swords、shield-off、paintbrush、bug、move-up-right、archive、hard-drive

全部 base64 内联到 CSS，使用 `mask-image` + `currentColor` 方案。

| 图标类 | 用途 |
|--------|------|
| `icon-dna` | 原体标识/实验室按钮 |
| `icon-atk` `icon-def` `icon-gland` | 战斗三技能 |
| `icon-health` `icon-ram` `icon-tox` `icon-upgrade` | 状态条 |
| `icon-mutant` `icon-swarm` `icon-ember` | 种族标识 |
| `icon-crossed-swords` | 种族克制 |
| `icon-shield-crack` | 破甲 |
| `icon-paintbrush` | 涂层 |
| `icon-insect` | 对寄生增伤/图鉴按钮 |
| `icon-dodge` | 闪避 |
| `icon-archive` `icon-save` | 档案/存档按钮 |
| `icon-poison-gas` `icon-energy-shield` `icon-enrage` `icon-dripping-blade` `icon-lightning-arc` | 战斗状态标签 |

**规则**：禁止使用 emoji 作为信息载体。

## 7. 自定义光标

| 状态 | 光标 |
|------|------|
| 默认 | 绿色扫描准星 (SVG inline) |
| 可点击 | 绿色实心锁定 |
| 禁用 | 灰色淡化 |
| 文字输入 | 绿色竖线 |
| 右键 | 禁止 (preventDefault) |

全部使用 `data:image/svg+xml,...` 内联 SVG 格式。

## 8. 加载序列

新游戏触发 6 步终端打字动画：
1. `> 神经链路已建立。`
2. `> 生命已补充完成。` + 生命进度条 0→100%
3. `> 进程已补充完成。` + 进程进度条 0→100%
4. `> 指令扫描中...`
5. 任务面板逐行打字
6. 房间信息打字 + 路径卡片弹入

点击任意位置跳过动画。已有存档 (>0步) 直接跳过加载序列。

## 9. 布局结构 (v3.6)

```
#app (100vw × 100vh, flex column)
│
├── .hud-top                       ← 顶栏 (min-height:60px)
│   ├── hud-col-l: 原体-II + 路径/基因信息
│   ├── hud-col-c: 生命/进程/毒性/等阶 4条状态
│   └── hud-col-r: ? 按钮
│
├── .main-viewport                 ← 中间内容区 (flex:1, flex row)
│   ├── .left-panel-col            ← 左侧面板
│   │   ├── #ui-task-panel         ← 指令面板
│   │   ├── #ui-room-info          ← 房间信息
│   │   └── .log-wrap              ← 日志面板
│   ├── #ui-divider                ← 分隔线 (1px)
│   └── #_mainView / #_battleView  ← 探索/战斗视图
│
└── .action-bar                    ← 底部操作栏 (高度:130px)
    ├── 探索模式: 楼层进度条 + 按钮(实验室/档案/图鉴/存档)
    └── 战斗模式: 技能卡 + 魔药 + 结束回合 + 逃跑
```

响应式断点：≤900px 压缩按钮/面板宽度；≤700px 隐藏左侧面板和战斗提示。

## 10. 战斗界面与战术标记

### 10.1 怪物卡片与词缀
*   **怪物维度词缀**: Loop 2+ 出现的词缀（如 [反馈]）紧凑显示在名称右侧，配备故障动效。
*   **弱点锁定 (方案 A)**: 种族克制时，右上角显示红色 `icon-crossed-swords`，附带 `mastery-pulse` 2s 循环呼吸动画。

### 10.2 动态战术预测 (v4.4)
*   **实时数值**: 右下角面板数值必须随目标切换即时刷新。
*   **计算链**: `基础值 * (1 + 克制 + 研究加成) * 器官倍率 * 护盾/防御系数`。
*   **意图穿透**: 1 级研究怪物的攻击描述需括号标注具体伤害点数。

## 11. 颜色语义与日志规范 (v4.1)

### 11.1 战斗日志着色标准
为了提升信息解析效率，日志必须严格遵循以下着色模板：
*   **红色 (`--accent-red`)**: 物理伤害、怪物死亡、玩家序列崩解、资源不足警告。
*   **紫色 (`--accent-purple`)**: 基因毒素触发、使用炼金魔药、神经阻断生效。
*   **蓝色 (`--accent-blue`)**: 护盾吸收、反噬伤害、环境异变说明、维度词缀提醒。
*   **绿色 (`--accent-green`)**: 属性回复、成功脱离战斗、中立营地抵达。
*   **橙色 (`--accent-orange`)**: 回合转换线、Boss 狂怒预警。

### 11.2 按键标识规范
所有可交互的战斗卡牌必须在标题中显式包含 `[Key]` 前缀。例如：`[1] 捕食打击`、`[Space] 结束回合`。

## 12. 反模式禁止清单

- ❌ font-size < 13px
- ❌ 颜色简写 (#f44, #0f8 等)
- ❌ 同语义多色混用
- ❌ 无 hover/active 反馈的按钮
- ❌ Emoji 作为唯一信息载体
- ❌ 平台独占 Emoji
- ❌ opacity < 0.7 的文字
- ❌ 硬编码色值 (必须用 CSS 变量)

---

## 13. 系统鲁棒性与同步逻辑 (v3.8)

**视图切换清理**
- 进入战斗视图前，必须重置 `_modalOverlay` 和 `help-popup`。
- 退出战斗视图时，必须清空 `_battleView.innerHTML` 并隐藏，确保探索视图 `_mainView` 的层级正确。

**属性同步验证**
- 所有的状态条（生命、进程、毒性、等阶）均通过 `_renderHUD` 实时读取 `GameState` 数据。
- 战斗中的 `playerProcess` 必须在每回合及战斗结束出口（胜利、逃跑、死亡）与 `GameState` 保持强一致性同步。
- 存档迁移必须通过 `validateNum` 进行数据清洗，防止由于 `NaN` 导致的 UI 渲染崩溃（如进度条宽度溢出）。

---

> v1.0 初始 | v2.0 字体+状态条+光标 | v2.1 布局重构 | v3.6 颜色/图标/地图/战斗全面重制 | v3.8 逻辑同步与清理 | **V2.0 正式版 (2026-06-19)**
