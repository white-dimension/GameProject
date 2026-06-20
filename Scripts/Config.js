/**
 * Config.js — v3.0 游戏数值配置
 * 所有价格/公式/初始属性/楼层配置集中管理
 */
window.GameConfig = (function () {
    'use strict';

    // =========================================================================
    // 1. 楼层节点配置
    // =========================================================================
    var FLOOR_NODES = {
        1:  { monster: 2, elite: 1, camp: 0, relic: 1, dungeon: 0, bossId: null, depth: 1 },
        2:  { monster: 2, elite: 1, camp: 1, relic: 1, dungeon: 1, bossId: null, depth: 2 },
        3:  { monster: 3, elite: 1, camp: 1, relic: 1, dungeon: 1, bossId: null, depth: 3 },
        4:  { monster: 3, elite: 2, camp: 1, relic: 1, dungeon: 1, bossId: null, depth: 4 },
        5:  { monster: 3, elite: 2, camp: 1, relic: 1, dungeon: 1, bossId: null, depth: 5 },
        6:  { monster: 4, elite: 2, camp: 1, relic: 1, dungeon: 1, bossId: null, depth: 6 },
        7:  { monster: 4, elite: 2, camp: 1, relic: 1, dungeon: 2, bossId: null, depth: 7 },
        8:  { monster: 4, elite: 3, camp: 1, relic: 1, dungeon: 2, bossId: null, depth: 8 },
        9:  { monster: 5, elite: 3, camp: 1, relic: 2, dungeon: 2, bossId: null, depth: 9 },
        10: { monster: 5, elite: 3, camp: 1, relic: 2, dungeon: 3, bossId: null, depth: 10 }
    };

    // =========================================================================
    // 2. 玩家初始属性
    // =========================================================================
    var PLAYER_START = {
        hp: 100, hp_max: 100,
        process: 10, process_max: 10,
        toxicity: 0, toxicity_max: 50,
        atk: 12, atk_base: 12,
        def: 5, def_base: 5,
        bp: 50, process_recovery: 3,
        level: 1, xpToNext: 30,
        availableMasteryPoints: 1
    };

    // =========================================================================
    // 3. 等级/经验
    // =========================================================================
    var LEVEL_CAP = 30;
    function xpForLevel(lv) { return Math.ceil(30 * Math.pow(1.6, lv - 1)); }

    // =========================================================================
    // 4. 基因研究价格
    // =========================================================================
    var RESEARCH_COSTS = [500, 1500, 3000]; // Lv.1 数值透明, Lv.2 伤害+10%, Lv.3 掉落+25%

    // =========================================================================
    // 5. 器官同调价格
    // =========================================================================
    var SYNC_COSTS = [0, 2000, 5000]; // Lv.1, Lv.2, Lv.3

    // =========================================================================
    // 6. 基因突变价格
    // =========================================================================
    var MUTATION_COSTS = { atk: 800, def: 600, hp: 500 };

    // =========================================================================
    // 7. 器官进阶公式
    // =========================================================================
    function organUpgradeCost(currentTier) { return Math.ceil(5 * Math.pow(1.6, currentTier)); }

    // =========================================================================
    // 8. 组件购买价格
    // =========================================================================
    var COMPONENT_BUY_COST = 150;
    var COMPONENT_UNLOAD_COST = 10;

    // =========================================================================
    // 9. 毒素清除价格
    // =========================================================================
    var CLEAR_TOXICITY_COST = 50;

    // =========================================================================
    // 10. 伤害减免公式
    // =========================================================================
    function calcDamageReduction(def) { return def / (def + 40); }

    // =========================================================================
    // 11. 楼层/周目难度缩放
    // =========================================================================
    function getMapLevelScaling(gs) {
        var ml = (gs.mapState.mapLevel || 1) - 1;
        var loop = gs.mapState.loop || 1;
        var loopMult = 1 + (loop - 1) * 0.3;
        if (ml <= 0 && loop === 1) return { hpMul: 1, atkMul: 1, defMul: 1, bpMul: 1, xpMul: 1 };
        return {
            hpMul: (1 + ml * 0.08) * loopMult,
            atkMul: (1 + ml * 0.06) * loopMult,
            defMul: (1 + ml * 0.05) * loopMult,
            bpMul: (1 + ml * 0.20) * (1 + (loop - 1) * 0.2),
            xpMul: (1 + ml * 0.15)
        };
    }

    // =========================================================================
    // 12. 专精属性加成
    // =========================================================================
    var MASTERY_STATS = {
        mutant: { hp_max: 5, atk: 1.5, def: 0.5 },
        swarm:  { hp_max: 3, atk: 2.0 },
        ember:  { hp_max: 2, def: 1.0, process_max: 0.5 }
    };

    // =========================================================================
    // 13. Boss器官阶位
    // =========================================================================
    var BOSS_ORGAN_TIER = 3;

    // =========================================================================
    // 14. 合成比例
    // =========================================================================
    var SYNTH_REQUIRE = 3; // 3个相同 → ⭐→⭐⭐→⭐⭐⭐

    // =========================================================================
    // 15. 魔药携带上限
    // =========================================================================
    var MAX_POTIONS = 3;

    // =========================================================================
    // 16. 怪物池配置
    // =========================================================================
    var MONSTER_POOLS = {
        common: ['MON_CH1_ZOMBIE','MON_CH1_RIOT','MON_CH1_RAT','MON_CH1_LARVA','MON_CH1_CLEANER_ROBOT','MON_CH1_WATCHER','MON_CH1_AMALGAM','MON_CH1_MOTH','MON_CH1_DRONE','MON_CH2_WORM','MON_CH2_CAMERA','MON_CH2_GROWTH','MON_CH2_PARASITE','MON_CH2_VULTURE'],
        elite: ['MON_CH1_CLEANER','MON_CH1_GUARD','MON_CH1_SPORE','MON_CH1_HIVE','MON_CH1_BEE','MON_CH1_SENTINEL','MON_CH2_GHOST','MON_CH2_BEAST','MON_CH2_BROODMOTHER','MON_CH2_CANNON','MON_CH2_ABOMINATION'],
        boss: ['MON_CH1_TYRANT', 'MON_CH1_QUEEN', 'MON_CH1_CORE']
    };

    // =========================================================================
    // 17. 路径环境词缀池
    // =========================================================================
    var ENV_AFFIXES = [
        { id: 'high_process', name: '高能反应', desc: '开局额外获得 2 点进程', color: 'var(--accent-green)' },
        { id: 'weak_bio', name: '生物辐射', desc: '全场敌人初始降低 20% HP', color: 'var(--accent-red)' },
        { id: 'data_rich', name: '信号富集', desc: '击败后获得的经验提升 50%', color: 'var(--accent-blue)' },
        { id: 'scrap_rich', name: '金属堆积', desc: '击败后额外获得 1 个组件碎片', color: 'var(--accent-yellow)' },
        { id: 'corrosive', name: '酸蚀环境', desc: '进入后敌人获得 3 层中毒', color: 'var(--accent-purple)' }
    ];

    // =========================================================================
    // 18. 种族颜色映射
    // =========================================================================
    var RACE_COLORS = {
        mutant: { hex: '#ff6b4a', bg: 'rgba(255,107,74,0.08)', bd: 'rgba(255,107,74,0.2)' },
        swarm:  { hex: '#9acd32', bg: 'rgba(154,205,50,0.08)', bd: 'rgba(154,205,50,0.2)' },
        ember:  { hex: '#4ab8ff', bg: 'rgba(74,184,255,0.08)', bd: 'rgba(74,184,255,0.2)' }
    };

    // =========================================================================
    // 19. 专精插槽数量
    // =========================================================================
    var MASTERY_SLOTS_BASE = 2;
    var MASTERY_SLOTS_LOOP2 = 3;

    // =========================================================================
    // 20. 涂层持续回合
    // =========================================================================
    var COATING_DURATION = 100;

    return {
        // 数据
        FLOOR_NODES: FLOOR_NODES,
        PLAYER_START: PLAYER_START,
        LEVEL_CAP: LEVEL_CAP,
        RESEARCH_COSTS: RESEARCH_COSTS,
        SYNC_COSTS: SYNC_COSTS,
        MUTATION_COSTS: MUTATION_COSTS,
        COMPONENT_BUY_COST: COMPONENT_BUY_COST,
        COMPONENT_UNLOAD_COST: COMPONENT_UNLOAD_COST,
        CLEAR_TOXICITY_COST: CLEAR_TOXICITY_COST,
        BOSS_ORGAN_TIER: BOSS_ORGAN_TIER,
        SYNTH_REQUIRE: SYNTH_REQUIRE,
        MAX_POTIONS: MAX_POTIONS,
        MASTERY_SLOTS_BASE: MASTERY_SLOTS_BASE,
        MASTERY_SLOTS_LOOP2: MASTERY_SLOTS_LOOP2,
        COATING_DURATION: COATING_DURATION,
        MONSTER_POOLS: MONSTER_POOLS,
        ENV_AFFIXES: ENV_AFFIXES,
        RACE_COLORS: RACE_COLORS,
        MASTERY_STATS: MASTERY_STATS,
        // 函数
        xpForLevel: xpForLevel,
        organUpgradeCost: organUpgradeCost,
        calcDamageReduction: calcDamageReduction,
        getMapLevelScaling: getMapLevelScaling
    };
})();
