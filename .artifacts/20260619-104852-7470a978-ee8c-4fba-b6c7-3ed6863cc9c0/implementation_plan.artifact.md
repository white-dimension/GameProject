# 游戏 BUG 修复与逻辑完善计划

在对《黑地平线：原体觉醒》的代码全盘检查中，我发现了若干影响核心体验和数值平衡的 BUG。本计划旨在修复这些问题，并确保系统逻辑与设计初衷保持一致。

## 待修复 Bug 列表

1.  **地下城深度 Bug**：由于 UI 和逻辑判定上限设为 2，玩家无法进入地下城第 3 层（Boss 层）。
2.  **Boss 逃跑规则缺失**：`flee()` 函数未实现“首回合逃跑”判定，且逃跑失败后缺乏对世界 Boss 的数值碾压（惩罚）。
3.  **被动技能描述不符**：`mutant+swarm` 被动的日志显示 40% 概率，而实际代码为 55%。
4.  **Ember+Mutant 数值崩坏**：该被动导致玩家每次受击都获得 100% 防御值的护盾，导致后期绝对无敌。应调整为受击时获得少量护盾。
5.  **存档一致性风险**：在 `WorldSystem.discover` 进入新房间及某些随机事件产生结果后缺少 `save()` 调用，可能导致进度丢失。
6.  **进程恢复精度问题**：机械专精提供的 `0.5` 恢复点在战斗结算时被 `Math.floor` 舍弃，导致奇数点专精无收益。

## 提议的更改

### 1. 战斗系统逻辑 ([Combat.js](file:///D:/01_DesignProjects/App_Build/GameProject/Scripts/Combat.js))

#### 修复地下城深度
- 将 `dungeonDeep` 中的判定逻辑及 `_dungeonFloor` 的传递进行修正。
- 确保 `_battleState` 初始化时能正确继承 `_dungeonFloor`。

#### 完善逃跑逻辑
- 在 `flee()` 中加入 `_battleState.turn === 1` 的判定。
- 若针对世界 Boss 且逃跑失败，触发一次性的高额伤害（数值碾压）。

#### 修正被动平衡性
- `mutant+swarm`：统一日志描述与代码概率（建议保持 55%）。
- `ember+mutant`：将受击获得的护盾从 `p.def` 调整为 `Math.ceil(p.def * 0.3)`，并确保该收益有上限。

#### 优化进程恢复
- 将 `Math.floor(GS().player.process_recovery)` 调整为更合理的逻辑，或在 `recalcPlayerStats` 中统一处理为整数。

---

### 2. 世界探索逻辑 ([World.js](file:///D:/01_DesignProjects/App_Build/GameProject/Scripts/World.js))

#### 增加存档点
- 在 `discover` 函数成功切换房间后，显式调用 `GameState.save()`。

---

### 3. UI 交互 ([UI.js](file:///D:/01_DesignProjects/App_Build/GameProject/Scripts/UI.js))

#### 修复地下城按钮显示
- 将地下城“深入”按钮的显示判定从 `< 2` 提升至 `< 3`，确保能进入 Boss 层。

#### 强化 BP 置灰提示
- 确保在 `showReorganizeModal` 中，卸载组件的 BP 检查有更明显的视觉反馈。

## 验证计划

### 自动化/脚本测试
- 模拟地下城连续点击“深入”，验证是否能正常触发第 3 层的 Boss 战斗。
- 模拟世界 Boss 战斗中的逃跑行为，验证首回合限制及失败惩罚。

### 手动验证
- 检查 `mutant+swarm` 激活时的日志显示。
- 验证 `ember+mutant` 在多轮受击后的护盾增长是否回归正常范围。
- 进入房间后强行刷新页面，验证进度是否已保存。
