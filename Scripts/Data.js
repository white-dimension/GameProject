/**
 * Data.js — v3.0 游戏数据入口（组装 Monsters + Items + Skills）
 */

window.GameData = (function () {
    'use strict';

    var M = window.MonsterDB;
    var I = window.ItemDB;
    var RACE = M.RACE;
    var RACE_LORE = M.RACE_LORE;
    var MONSTERS = M.MONSTERS;
    var COMPONENTS = I.COMPONENTS;
    var BOSS_ORGANS = I.BOSS_ORGANS;
    var _bossOrganPools = I._bossOrganPools;
    var _getRandomBossOrgan = I._getRandomBossOrgan;
    var POTIONS = I.POTIONS;
    var COATINGS = I.COATINGS;

const MASTERIES = {
        mutant: {
            id: 'mutant',
            name: '异变者专精',
            statsPerPoint: { hp_max: 5, atk: 1.5, def: 0.5 },
            traits: ['物理反伤', '进程饱满破甲']
        },
        swarm: {
            id: 'swarm',
            name: '寄生群落专精',
            statsPerPoint: { hp_max: 3, atk: 2.0 },
            traits: ['无视护盾挂毒', '毒素传染']
        },
        ember: {
            id: 'ember',
            name: '机械余烬专精',
            statsPerPoint: { hp_max: 2, def: 1.0, process_max: 0.5 },
            traits: ['电荷过载偏转', '进程极速恢复']
        }
    };

    const DUAL_CLASSES = {
        'mutant+mutant': {
            name: '源初毁灭者',
            passive: '超量撕裂',
            passiveDesc: '所有攻击卡牌物理伤害倍率 ×1.4，无视目标 30% 防御',
            color: 'var(--accent-red)'
        },
        'mutant+swarm': {
            name: '酸蚀肉山',
            passive: '骨疽自溶',
            passiveDesc: '受击时 55% 概率大范围毒素播撒',
            color: 'var(--accent-purple)'
        },
        'ember+mutant': {
            name: '钢骨原体',
            passive: '动能回馈',
            passiveDesc: '防御值转护盾，受击+1进程，免疫一切流血',
            color: 'var(--accent-blue)'
        },
        'swarm+swarm': {
            name: '瘟疫主宰',
            passive: '无限蚀骨',
            passiveDesc: '毒素发作每回合 5%→10%，无视护盾',
            color: 'var(--accent-purple)'
        },
        'ember+swarm': {
            name: '电子真菌',
            passive: '触突过载',
            passiveDesc: '打出毒素技能时 35% 概率不消耗进程',
            color: 'var(--accent-yellow)'
        },
        'ember+ember': {
            name: '终焉母核',
            passive: '格式化电弧',
            passiveDesc: '每回合释放雷电链，随机对 2 只怪物造成 防御×1.2 电离伤害',
            color: 'var(--accent-blue)'
        }
    };

    function calcTierUpgradeCost(currentTier) {
        const baseCost = 5;
        return Math.ceil(baseCost * Math.pow(1.6, currentTier));
    }

    const STATUS_CONSTANTS = {
        bleed: { damagePerTurn: 4 },
        processRecoveryPerTurn: 3,
        processMax: 10,
        encounterChance: 0.03,
        counterBonus: 0.5
    };

    const TUTORIALS = {
        fight: {
            title: '战斗协议引导 v4.1',
            sections: [
                { key: '1', label: '主要打击', desc: '核心物理手段。连续命中寄生种族 2 次可施加 [崩解]；命中机械种族可施加 [电离]。', color: 'var(--accent-red)' },
                { key: '2', label: '防御增殖', desc: '生成科技护盾。护盾存在时可阻挡大部分非毒素伤害。', color: 'var(--accent-green)' },
                { key: '3', label: '连招引爆', desc: '引爆 [中毒/崩解] 标记。中毒引爆造成 300% 爆破+吸血；崩解引爆使目标闪避归零并陷入 50% 易伤。', color: 'var(--accent-yellow)' },
                { key: '0', label: '深入地下城', desc: '地下城战斗胜利后，按 0 直接进入下一层，继承当前 HP 继续猎杀。', color: 'var(--accent-green)' },
                { key: 'Space', label: '结束回合', desc: '进入代谢循环，回复进程点数。', color: 'var(--accent-orange)' },
                { key: 'R', label: '种族克制', desc: '异变者 克 寄生群落 → 寄生 克 机械余烬 → 机械 克 异变者。专精种族对克制目标伤害 +50% 无视防御。', color: 'var(--accent-yellow)' }
            ],
            tip: '异变→寄生→机械→异变 形成克制循环。右下角「动态预测」面板显示精确伤害，克制时点亮红色双剑标记。'
        },
        lab: {
            title: '基因重组实验室引导',
            sections: [
                { label: '器官进阶', desc: '消耗材料提升插槽阶位 (Tier)。不仅加属性，还会让突变技能的伤害倍率动态成长。', color: 'var(--accent-green)' },
                { label: '深度同调', desc: '消耗同名副本器官提升 Lv。Lv.3 觉醒后赋予真伤、溅射或吸盾等终极特效。', color: 'var(--accent-yellow)' },
                { label: '基因突变', desc: '消耗积压的基因点数 (BP) 永久提升基础攻击、防御和生命上限。', color: 'var(--accent-blue)' },
                { label: '合成与镶嵌', desc: '3个相同组件可合成为 ⭐/⭐⭐/⭐⭐⭐ 高级版，属性翻倍增长。', color: 'var(--accent-purple)' }
            ],
            tip: '多余的领主器官是进行「深度同调」的关键素材，千万不要随意丢弃。'
        },
        stats: {
            title: '核心系统说明',
            sections: [
                { key: 'MAX', label: '巅峰等级', desc: '等阶上限提升至 30 级。满级后将以 MAX 状态展示在状态栏。10级后每级额外获得 1 专精点。', color: 'var(--accent-blue)' },
                { key: 'Rank', label: '深度研究', desc: '在图鉴中消耗 BP 提升研究等级。Lv.1 解锁战斗数值透明，Lv.2 增伤，Lv.3 掉落加成。', color: 'var(--accent-yellow)' },
                { key: 'Loop', label: '超越进化', desc: '通关地下十层后开启无限循环。保留所有属性和物资，每轮怪物属性 ×1.5，BP 收益同步上扬。无硬上限，直到你无法战胜翻倍的敌人。Loop 2 解锁第三专精槽 + 精英词缀。', color: 'var(--accent-orange)' },
                { key: 'Event', label: '感官异常', desc: '路径跳转间 10% 概率触发随机事件，抉择可能改变你的进化路线或即时状态。', color: 'var(--accent-purple)' }
            ],
            tip: '当您进入 Loop 2 后，原体将自动解锁「第三专精插槽」，支持三系毒株融合。'
        },
        craft: {
            title: '组件合成 · 器官觉醒 · 炼金配方',
            sections: [
                { key: '合成', label: '组件合成', desc: '3个相同组件 → 升级为 ⭐ 版。⭐ 再3个 → ⭐⭐。⭐⭐ 再3个 → ⭐⭐⭐。每级属性翻倍。不同组件混合 → 随机新组件。', color: 'var(--accent-yellow)' },
                { key: '魔药', label: '魔药炼制', desc: '消耗 2~3 个组件碎片炼制战斗魔药。最多携带 3 瓶。[4][5][6] 快捷键在战斗中使用。注意毒性累积！', color: 'var(--accent-purple)' },
                { key: '涂层', label: '基因涂层', desc: '消耗 2 个组件碎片涂抹基因涂层。针对特定种族敌人造成额外伤害。持续 100 回合。', color: 'var(--accent-yellow)' },
                { key: '暴君', label: '暴君核心 觉醒 (Sync Lv.3)', desc: '攻击转化为「真实伤害」—— 无视目标全部防御力。完克机械余烬的科技护盾。', color: 'var(--race-mutant)' },
                { key: '蜂后', label: '蜂后髓核 觉醒 (Sync Lv.3)', desc: '召唤突袭时额外吸取伤害值 50% 的护盾。攻守一体，正面硬刚。', color: 'var(--race-swarm)' },
                { key: '电泳', label: '高能电泳核 觉醒 (Sync Lv.3)', desc: '电弧攻击升级为「全场溅射」—— 对其他敌人造成 50% 伤害。清场神器。', color: 'var(--race-ember)' }
            ],
            tip: 'Boss 器官初始为 1 阶，通过消耗同名器官 + BP 进行深度同调（最高 Lv.3）以解锁觉醒特效。'
        }
    };

    const RANDOM_EVENTS = {
        'EVT_ALCHEMIST': {
            id: 'EVT_ALCHEMIST',
            title: '非法炼金商',
            desc: '你在废弃的走廊角落发现了一个披着厚重防化服的人。他正守着一堆闪烁着不详微光的瓶瓶罐罐。“嘿，进化中的同类，”他嘶哑地低声说道，“想要点违禁的好货吗？或者...你想试试别的？”',
            options: [
                {
                    label: '购买黑市组件',
                    desc: '消耗 150 基因点数，获得 1 个随机高级组件碎片。',
                    cost: { bp: 150 },
                    action: function(gs) {
                        var comps = Object.keys(COMPONENTS);
                        var cid = comps[Math.floor(Math.random() * comps.length)];
                        gs.inventory.components[cid] = (gs.inventory.components[cid] || 0) + 1;
                        return { msg: '你获得了：' + cid, type: 'reward' };
                    }
                },
                {
                    label: '暴力抢劫',
                    desc: '不消耗基因点数，获得 1 瓶强效魔药，但毒性会大幅增加 (+30)。',
                    action: function(gs) {
                        var pots = ['POT_BERSERK', 'POT_ANTIDOTE', 'POT_SHIELD_CORE', 'POT_HEAL', 'POT_DEFENSE', 'POT_RAM'];
                        var pid = pots[Math.floor(Math.random() * pots.length)];
                        gs.inventory.potions.push(pid);
                        gs.player.toxicity += 30;
                        return { msg: '你粗暴地夺走了 ' + POTIONS[pid].name + '，体内的基因稳定性受到剧烈震荡。', type: 'hazard' };
                    }
                },
                {
                    label: '无视并离开',
                    desc: '不产生任何效果。',
                    action: function() { return { msg: '你谨慎地绕过了这个可疑的家伙。', type: 'info' }; }
                }
            ]
        },
        'EVT_REMAINS': {
            id: 'EVT_REMAINS',
            title: '前代原体残骸',
            desc: '一具早已冰冷的躯壳倚靠在实验室的防爆门上。它的形态与你惊人地相似，但胸口那道巨大的撕裂伤宣告了进化的失败。你可以尝试从它的残骸中提取一些有价值的东西。',
            options: [
                {
                    label: '吸收生物记忆',
                    desc: '获得 100 点经验值，但会感到轻微的不适 (+10 毒性)。',
                    action: function(gs) {
                        window.GameState.gainXp(100);
                        gs.player.toxicity += 10;
                        return { msg: '无数破碎的战斗画面涌入脑海，你的适应性得到了提升。', type: 'reward' };
                    }
                },
                {
                    label: '剥离备用组织',
                    desc: '获得 3 个随机组织碎片。',
                    action: function(gs) {
                        var pool = ['变异组织', '活性孢子', '几丁质装甲'];
                        var cid = pool[Math.floor(Math.random() * pool.length)];
                        gs.inventory.components[cid] = (gs.inventory.components[cid] || 0) + 3;
                        return { msg: '你从残骸中剥离出了可用的 ' + cid + ' ×3。', type: 'reward' };
                    }
                }
            ]
        },
        'EVT_OVERLOAD': {
            id: 'EVT_OVERLOAD',
            title: '能量网路过载',
            desc: '前方的配电板正不断喷吐着蓝色的电弧，由于逻辑锁死，这里的能量流转已经彻底失控。传感器显示，这股高能反应中蕴含着能够优化你神经链路的数据。',
            options: [
                {
                    label: '冒险手动修复',
                    desc: '扣除 15 点生命值，永久提升进程上限 +1。',
                    action: function(gs) {
                        gs.player.hp = Math.max(1, gs.player.hp - 15);
                        gs.player.process_max = Math.min(15, gs.player.process_max + 1);
                        window.GameState.recalcPlayerStats();
                        return { msg: '电弧灼烧了你的表皮，但神经链路的带宽得到了永久性拓宽！', type: 'reward' };
                    }
                },
                {
                    label: '紧急汲取残能',
                    desc: '不消耗生命，进程瞬间回满，但增加 15 点毒性。',
                    action: function(gs) {
                        gs.player.process = gs.player.process_max;
                        gs.player.toxicity += 15;
                        return { msg: '一股狂暴的电流灌入核心，你的行动效能瞬间达到了顶峰。', type: 'reward' };
                    }
                }
            ]
        },
        'EVT_COLONY': {
            id: 'EVT_COLONY',
            title: '突变菌落',
            desc: '一团巨大的、色彩斑斓的真菌覆盖了整面墙壁。它们在缓慢地起伏呼吸，散发出一种致幻的微甜气味。这些菌落似乎是由某种高纯度的基因培养液催生出来的。',
            options: [
                {
                    label: '采集高纯度基因',
                    desc: '获得 300 基因点数，但由于孢子感染，最大生命上限临时降低 10 点。',
                    action: function(gs) {
                        gs.player.bp += 300;
                        gs.player.hp_max = Math.max(50, gs.player.hp_max - 10);
                        gs.player.hp = Math.min(gs.player.hp, gs.player.hp_max);
                        return { msg: '你小心地提取了基因质，但你的生物特征出现了某种永久性的萎缩。', type: 'hazard' };
                    }
                },
                {
                    label: '焚毁并中和',
                    desc: '不获得点数，毒性清零，且下一次战斗伤害提升 20%。',
                    action: function(gs) {
                        gs.player.toxicity = 0;
                        gs.player._tempAtkBuff = 1.2;
                        return { msg: '你彻底清除了感染源。身体感到前所未有的轻盈，杀戮欲望正在膨胀。', type: 'reward' };
                    }
                }
            ]
        },
        'EVT_CRATE': {
            id: 'EVT_CRATE',
            title: '废弃补给箱',
            desc: '一个带有「黑地平线安保」标志的金属箱半掩在瓦砾中。箱体受损严重，电子锁已经失效。',
            options: [
                {
                    label: '暴力拆解',
                    desc: '获得 100 基因点数 + 2 个随机组件碎片。',
                    action: function(gs) {
                        gs.player.bp += 100;
                        var comps = Object.keys(COMPONENTS);
                        for(var i=0; i<2; i++) {
                            var cid = comps[Math.floor(Math.random() * comps.length)];
                            gs.inventory.components[cid] = (gs.inventory.components[cid] || 0) + 1;
                        }
                        return { msg: '箱盖在撬棍下呻吟着裂开。你搜刮到了不少有用的补给。', type: 'reward' };
                    }
                },
                {
                    label: '作为掩体',
                    desc: '本场不获得任何物品，但下一场战斗初始获得 50 点护盾。',
                    action: function(gs) {
                        gs.player._tempShield = 50;
                        return { msg: '你将补给箱推到了易于防守的位置。你已经占据了地理优势。', type: 'info' };
                    }
                }
            ]
        },
        'EVT_STORM': {
            id: 'EVT_STORM',
            title: '基因突变风暴',
            desc: '一股高浓度的生化雾气从通风管道涌入。暴露其中会让你的基因序列发生不可逆的突变——可能是祝福，也可能是诅咒。',
            options: [
                { label: '走进风暴中心', desc: '随机获得 +3 攻击 或 -5 最大生命（永久）。', action: function(gs) {
                    if (Math.random() < 0.5) { gs.player.atk += 3; gs.player.atk_base += 3; return { msg: '狂野的能量涌入原体！攻击力永久 +3。', type: 'reward' }; }
                    else { gs.player.hp_max = Math.max(50, gs.player.hp_max - 5); gs.player.hp = Math.min(gs.player.hp, gs.player.hp_max); return { msg: '基因序列崩溃了一小段。最大生命永久 -5。', type: 'hazard' }; }
                }},
                { label: '远离这片区域', desc: '放弃风险，获得 50 基因点数。', action: function(gs) {
                    gs.player.bp += 50; return { msg: '你选择了保守路线，绕开了那片诡异的风暴。', type: 'reward' };
                }}
            ]
        },
        'EVT_LAB': {
            id: 'EVT_LAB',
            title: '废弃实验室',
            desc: '一个被遗弃的小型实验站。设备已经停转，但控制台上还残留着一些未完成的同调实验数据。或许可以在这里尝试一次便宜的同调。',
            options: [
                { label: '注入实验数据', desc: '消耗 300 BP，随机一个已装备 Boss 器官同调等级 +1（最高 Lv.3）。', action: function(gs) {
                    var p = gs.player; var slots = ['predatory_organ','chitin_epidermis','gland_core'];
                    var equipped = slots.filter(function(s){
                        var eq = p[s].equipped;
                        return eq && BOSS_ORGANS[eq] && (gs.inventory.organSyncLevels[eq] || 1) < 3;
                    });
                    if (equipped.length === 0) { gs.player.bp += 300; return { msg: '没有可同调的器官。300 BP 已退还。', type: 'info' }; }
                    if (gs.player.bp < 300) { return { msg: '基因点数不足 300，无法激活设备。', type: 'info' }; }
                    var slot = equipped[Math.floor(Math.random() * equipped.length)];
                    var oid = p[slot].equipped;
                    gs.player.bp -= 300;
                    var prev = gs.inventory.organSyncLevels[oid] || 1;
                    gs.inventory.organSyncLevels[oid] = prev + 1;
                    return { msg: '实验数据注入成功！' + oid + ' 同调等级提升至 Lv.' + (prev+1) + '。', type: 'reward' };
                }},
                { label: '无视离开', desc: '不消耗任何资源，直接离开。', action: function(gs) {
                    return { msg: '你对这些过时的设备不感兴趣。', type: 'info' };
                }}
            ]
        },
        'EVT_RIFT': {
            id: 'EVT_RIFT',
            title: '时空裂隙',
            desc: '一道扭曲的蓝色裂隙悬浮在半空中。透过它，你隐约看到了下一层楼的景象。某种引力正在拉扯周围的一切。',
            options: [
                { label: '穿越裂隙', desc: '立即跳过当前楼层，直接进入下一层（传送门）。不可在最后一层（地下十层）使用。', action: function(gs) {
                    if (gs.mapState.currentFloor >= 10) return { msg: '裂隙的能量在这里变得极不稳定，无法穿越。', type: 'info' };
                    gs.mapState.bossDefeated = true; gs.mapState.portalUnlocked = true;
                    return { msg: '世界在眼前折叠又展开。你发现自己已站在了下一层的边缘。', type: 'reward' };
                }},
                { label: '封印裂隙', desc: '获得 200 基因点数，但下一场战斗怪物伤害 +30%。', action: function(gs) {
                    gs.player.bp += 200; gs.player._riftPenalty = true;
                    return { msg: '裂隙在你面前缓缓坍缩，释放出大量可提炼的基因残片。', type: 'reward' };
                }}
            ]
        },
        'EVT_INFECTION': {
            id: 'EVT_INFECTION',
            title: '寄生感染',
            desc: '一条细小的寄生蠕虫不知何时钻入了你左臂的组织。它正在啃噬你的生命，但它的生物质纯度极高——如果你能撑住的话。',
            options: [
                { label: '强行剥离', desc: '扣除 30% 最大生命，获得 400 基因点数。', action: function(gs) {
                    var loss = Math.ceil(gs.player.hp_max * 0.3);
                    gs.player.hp = Math.max(1, gs.player.hp - loss);
                    gs.player.bp += 400;
                    return { msg: '你咬紧牙关把蠕虫扯了出来。伤口很深，但收获颇丰。获得 400 BP，损失 ' + loss + ' HP。', type: 'hazard' };
                }},
                { label: '共生共存', desc: '最大生命永久 +15，但毒性永久 +20。', action: function(gs) {
                    gs.player.hp_max += 15; gs.player.hp += 15;
                    gs.player.toxicity += 20;
                    return { msg: '你选择与寄生虫达成共生协议。生命上限 +15，但体内永远残留了它的毒素。', type: 'reward' };
                }}
            ]
        },
        'EVT_CLONE': {
            id: 'EVT_CLONE',
            title: '原体克隆',
            desc: '一台标有"黑地平线 Alpha-7"的原体复制仪正嗡嗡作响。它似乎可以制造一个你的战术分身——但启动它需要付出代价。',
            options: [
                { label: '激活分身', desc: '消耗 10 点进程上限（永久），下一场战斗获得一个辅助分身。', action: function(gs) {
                    if (gs.player.process_max <= 5) return { msg: '进程上限已过低，设备拒绝启动。', type: 'info' };
                    gs.player.process_max -= 1;
                    gs.player._cloneActive = true;
                    return { msg: '机器发出刺眼的光芒，一个和你一模一样的身影从舱室中走出。下一场战斗将获得分身支援。', type: 'reward' };
                }},
                { label: '拆解设备', desc: '获得 250 基因点数 + 3 个随机组件。', action: function(gs) {
                    gs.player.bp += 250;
                    var comps = Object.keys(COMPONENTS);
                    for(var i=0; i<3; i++) {
                        var cid = comps[Math.floor(Math.random() * comps.length)];
                        gs.inventory.components[cid] = (gs.inventory.components[cid] || 0) + 1;
                    }
                    return { msg: '你把设备拆成了最原始的零件。虽然失去了分身，但材料足够值钱。', type: 'reward' };
                }}
            ]
        }
    };

    var STATUS_TEMPLATES = {
        poison: { id:'poison',name:'毒素发作',icon:'icon-poison-gas',color:'var(--accent-purple)',maxStacks:9,stackable:true,tooltip:'每回合损失5%最大生命值（瘟疫主宰10%）',hooks:{onTurnStart:{type:'dot',formula:'ceil(hpMax*dotPct)+dotBonus+statusDamage'},onExpire:{msg:'毒素已自行分解。'}}},
        bleed: { id:'bleed',name:'流血',icon:'icon-dripping-blade',color:'var(--accent-red)',maxStacks:9,stackable:true,tooltip:'每回合损失固定伤害值',hooks:{onTurnStart:{type:'dot',formula:'bleedDmg'},onExpire:{msg:'流血已止住。'}}},
        compromised: { id:'compromised',name:'生物崩解',icon:'icon-hazard-sign',color:'var(--accent-yellow)',maxStacks:1,stackable:false,tooltip:'防御归零+闪避无效。被腺体脉冲引爆后陷入易伤',hooks:{onApply:{effects:[{type:'setFlag',flag:'_dodging',value:false},{type:'setFlag',flag:'_compDefZero',value:true}]},onExpire:{effects:[{type:'setFlag',flag:'_compDefZero',value:false}]}}},
        ionized: { id:'ionized',name:'电离标记',icon:'icon-lightning-arc',color:'var(--accent-blue)',maxStacks:1,stackable:false,tooltip:'下次捕食打击引爆：剥离护盾+全场溅射',hooks:{}},
        stunned: { id:'stunned',name:'眩晕',icon:'icon-time-trap',color:'var(--accent-yellow)',maxStacks:1,stackable:false,tooltip:'跳过本回合行动',hooks:{onExpire:{msg:'眩晕已解除。'}}}
    };

    var PASSIVE_TEMPLATES = {
        'dual_mutant+mutant': { id:'dual_mutant+mutant',name:'超量撕裂',color:'var(--accent-red)',passiveDesc:'所有攻击物理伤害x1.4，无视30%防御',triggers:[{on:'onBeforeDamage',condition:'slot==="predatory_organ"',effects:[{type:'multiplyDamage',value:1.4},{type:'setFlag',flag:'dualIgnoreDef',value:true}]}]},
        'dual_mutant+swarm': { id:'dual_mutant+swarm',name:'骨疽自溶',color:'var(--accent-purple)',passiveDesc:'受击时55%概率毒雾反击',triggers:[{on:'onDamaged',condition:'Math.random()<0.55',effects:[{type:'applyStatus',status:'poison',target:'attacker',params:{duration:3}}]}]},
        'dual_ember+mutant': { id:'dual_ember+mutant',name:'动能回馈',color:'var(--accent-blue)',passiveDesc:'防御转护盾，受击+1进程，流血免疫',triggers:[{on:'onBattleStart',effects:[{type:'gainShield',formula:'player.def'}]},{on:'onDamaged',effects:[{type:'gainShield',formula:'ceil(player.def*0.3)'},{type:'gainProcess',formula:'1'}]}]},
        'dual_swarm+swarm': { id:'dual_swarm+swarm',name:'瘟疫主宰',color:'var(--accent-purple)',passiveDesc:'毒素发作5%->10%，无视护盾',triggers:[]},
        'dual_ember+swarm': { id:'dual_ember+swarm',name:'电子真菌',color:'var(--accent-yellow)',passiveDesc:'毒技能35%概率不消耗进程',triggers:[{on:'onSkillUse',condition:'slot==="gland_core"&&Math.random()<0.35',effects:[{type:'setFlag',flag:'_freeSkill',value:true}]}]},
        'dual_ember+ember': { id:'dual_ember+ember',name:'终焉母核',color:'var(--accent-blue)',passiveDesc:'每回合连锁闪电x2，防御x1.2伤害，清除闪避',triggers:[{on:'onTurnStart',effects:[{type:'setFlag',target:'allEnemies',flag:'_dodging',value:false},{type:'chainLightning',formula:'ceil(player.def*1.2)',count:2}]}]}
    };

    var POTION_TEMPLATES = {
        POT_BERSERK: { effect: function(bs,p,decay){ bs.playerStatus['berserk']=99; if(decay<1)bs.playerStatus['berserkMult']=decay; } },
        POT_ANTIDOTE: { effect: function(bs,p,decay,getMon,getMonData,_log){
            var cm=getMon(),md2=getMonData();
            if(cm){ if(md2&&md2.immuneToPhysicalCC)_log(cm.name+' 免疫物理控制。');
            else{ var sc=(md2&&md2.tier==='world_boss'?0.6:1.0)*decay; if(md2&&md2.drugResist)sc*=(1-md2.drugResist);
            if(Math.random()<sc){ cm.intent={label:'<span class=\"icon icon-time-trap\"></span> 行动延后',type:'stun'}; _log('<span style=\"color:var(--accent-purple);\">神经抑制生效：'+cm.name+' 行动被延后。</span>'); }
            else _log('<span style=\"color:var(--text-dim);\">'+cm.name+' 判定抗性通过，神经抑制失败。</span>'); } }
            bs._noProcessRecovery=true;
        }},
        POT_SHIELD_CORE: { effect: function(bs,p,decay){ bs.shieldAmount=(bs.shieldAmount||0)+Math.ceil(p.hp_max*0.4*decay); bs._toxResistDebuff=true; } },
        POT_HEAL: { effect: function(bs,p,decay){ p.hp=Math.min(p.hp_max,p.hp+Math.ceil(p.hp_max*0.4*decay)); bs.playerStatus['defDebuff']=3; } },
        POT_DEFENSE: { effect: function(bs,p,decay){ bs.playerStatus['defBoost']=3; bs.playerStatus['atkDebuff']=3; } },
        POT_RAM: { effect: function(bs,p,decay){ bs.playerProcess=Math.min(window.GameState.getState().player.process_max,bs.playerProcess+8); window.GameState.getState().player.process=bs.playerProcess; window.GameState.getState().player.toxicity+=5; } }
    };

    var AFFIX_TEMPLATES = [
        { id:'thorns',name:'反馈',desc:'反弹 10% 伤害',color:'var(--accent-red)',onApply:function(mon){}},
        { id:'regen',name:'再生',desc:'每回合恢复 5% HP',color:'var(--accent-green)',onApply:function(mon){}},
        { id:'berserk',name:'死誓',desc:'伤害+50%，每回合扣 5% HP',color:'var(--accent-orange)',onApply:function(mon){ mon._atkMult=(mon._atkMult||1)*1.5; }},
        { id:'jammer',name:'扰频',desc:'玩家每回合进程回复 -1',color:'var(--accent-blue)',onApply:function(mon){}}
    ];

    var PATH_AFFIX_TEMPLATES = [
        { id:'high_process',name:'高能反应',desc:'开局额外获得 2 点进程',color:'var(--accent-green)',onBattleStart:function(bs,gs){ bs.playerProcess=Math.min(gs.player.process_max,bs.playerProcess+2); }},
        { id:'weak_bio',name:'生物辐射',desc:'全场敌人初始降低 20% HP',color:'var(--accent-red)',onBattleStart:function(bs,gs){ bs.monsters.forEach(function(m){ var loss=Math.ceil(m.hp*0.2); m.hp-=loss; }); }},
        { id:'data_rich',name:'信号富集',desc:'击败后获得的经验提升 50%',color:'var(--accent-blue)',onBattleStart:function(){}, xpMult:1.5 },
        { id:'scrap_rich',name:'金属堆积',desc:'击败后额外获得 1 个组件碎片',color:'var(--accent-yellow)',onBattleStart:function(){}, extraDrop:1 },
        { id:'corrosive',name:'酸蚀环境',desc:'进入后敌人获得 3 层中毒',color:'var(--accent-purple)',onBattleStart:function(bs){ bs.monsters.forEach(function(m){ m.status['poison']=3; }); }}
    ];

    var RESEARCH_PERKS = {
        1: { showExactHP: true, desc: '显示精确HP' },
        2: { damageBonus: 0.1, desc: '伤害永久+10%' },
        3: { dropRateBonus: 0.25, desc: '组件掉落率+25%' }
    };

    var DIFFICULTY_CONFIG = {
        loopScale: { hpMul: 1.5, atkMul: 1.5, defMul: 1.0, bpMul: 1.2, xpMul: 1.0 },
        dungeonFloors: { bossFloor: 3, monsterPool: ['MON_CH1_CLEANER','MON_CH1_GUARD','MON_CH1_SPORE','MON_CH1_HIVE','MON_CH1_BEE','MON_CH1_SENTINEL'], bossPool: ['MON_CH1_TYRANT','MON_CH1_QUEEN','MON_CH1_CORE'], monstersPerFloor: 2 },
        floorNames: ['','地下一层','地下二层','地下三层','地下四层','地下五层','地下六层','地下七层','地下八层','地下九层','地下十层']
    };

    return {
        RACE: RACE,
        RACE_LORE: RACE_LORE,
        MONSTERS: MONSTERS,
        COMPONENTS: COMPONENTS,
        BOSS_ORGANS: BOSS_ORGANS,
        POTIONS: POTIONS,
        COATINGS: COATINGS,
        MASTERIES: MASTERIES,
        DUAL_CLASSES: DUAL_CLASSES,
        STATUS_CONSTANTS: STATUS_CONSTANTS,
        TUTORIALS: TUTORIALS,
        RANDOM_EVENTS: RANDOM_EVENTS,
        STATUS_TEMPLATES: STATUS_TEMPLATES,
        PASSIVE_TEMPLATES: PASSIVE_TEMPLATES,
        POTION_TEMPLATES: POTION_TEMPLATES,
        AFFIX_TEMPLATES: AFFIX_TEMPLATES,
        PATH_AFFIX_TEMPLATES: PATH_AFFIX_TEMPLATES,
        RESEARCH_PERKS: RESEARCH_PERKS,
        DIFFICULTY_CONFIG: DIFFICULTY_CONFIG,
        calcTierUpgradeCost: calcTierUpgradeCost,
        getRandomBossOrgan: _getRandomBossOrgan
    };
})();
