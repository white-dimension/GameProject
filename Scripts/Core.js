/**
 * Core.js — v3.0 全局持久化状态管理 + 基因数据突变引擎 + 路径地图生成
 */

window.GameState = (function () {
    'use strict';

    const GD = function () { return window.GameData; };

    // =========================================================================
    // 楼层配置 — 每层节点类型数量 + Boss ID
    // =========================================================================
    var FLOOR_CONFIG = {
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

    var _allMonsters = ['MON_CH1_ZOMBIE','MON_CH1_RIOT','MON_CH1_RAT','MON_CH1_LARVA','MON_CH1_CLEANER_ROBOT','MON_CH1_WATCHER','MON_CH1_AMALGAM','MON_CH1_MOTH','MON_CH1_DRONE','MON_CH2_WORM','MON_CH2_CAMERA','MON_CH2_GROWTH','MON_CH2_PARASITE','MON_CH2_VULTURE'];
    var _eliteMonsters = ['MON_CH1_CLEANER','MON_CH1_GUARD','MON_CH1_SPORE','MON_CH1_HIVE','MON_CH1_BEE','MON_CH1_SENTINEL','MON_CH2_GHOST','MON_CH2_BEAST','MON_CH2_BROODMOTHER','MON_CH2_CANNON','MON_CH2_ABOMINATION'];
    var _bossMonsters = ['MON_CH1_TYRANT', 'MON_CH1_QUEEN', 'MON_CH1_CORE'];

    var _raceColors = { mutant: 'var(--race-mutant)', swarm: 'var(--race-swarm)', ember: 'var(--race-ember)', _default: 'var(--text-main)' };
    // 描述文案池（按击杀数渐进）
    function _pickDesc(list, gs) {
        var kills = gs ? Object.values(gs.bestiary.killCount || {}).reduce(function(a,b){return a+b;},0) : 0;
        // 杀得越多，越深的描述越容易出现
        if (kills >= 15 && list.length >= 6) return list[Math.floor(Math.random() * (list.length - 3)) + 3];
        if (kills >= 5 && list.length >= 4) return list[Math.floor(Math.random() * list.length)];
        return list[Math.floor(Math.random() * Math.min(list.length, 3))];
    }
    var _raceDescs = {
        mutant: [
            '走廊的灯光忽明忽暗，墙壁上覆盖着一层薄薄的黏液。角落里堆着几具早已无法辨认的实验体残骸。',
            '空气中弥漫着淡淡的腐臭，通道两侧的保温箱被打翻在地，里面曾经的东西已经爬走了。',
            '破碎的实验器皿散落一地，变异组织仍在缓慢蠕动，似乎仍未完全失去活性。',
            '腐败的肉纤维从天花板垂落，地面覆盖着黏滑的分泌物。墙上的抓痕深可见骨。',
            '肉质的触须从通风口垂下，随着不知来源的脉搏节律微微颤动。这里已经彻底沦为了某个生物的巢穴。',
            '整条走廊被一层厚厚的生物膜覆盖，每一步都能感受到地面在脚下的黏弹。传感器显示这里的生物质密度已经达到了警戒值。',
            '一股温热的气流扑面而来，带着浓重的铁锈味。墙角的实验舱门被从内部撑爆，里面的东西不知去向。',
            '地板上凝结着一层暗红色的胶状物，踩上去会发出令人不安的黏连声。某种巨型生物刚刚经过这里。',
            '数个培养皿被撞翻在地，碎裂的玻璃中残留着暗绿色的培养液。一条湿漉漉的拖痕延伸进黑暗。'
        ],
        swarm: [
            '通风管道中传出细微的沙沙声，像是无数细小的节肢在金属表面爬行。',
            '空气里飘浮着一层淡黄色的薄雾，带着微甜、令人昏沉的气味——这是孢子扩散的迹象。',
            '几只拇指大的飞虫从面前掠过，消失在走廊深处的黑暗里。地面上散落着透明的虫蜕。',
            '蜂巢状的有机结构覆盖了原来的金属墙壁，不断有幼虫从中钻出。空气中漂浮着致幻的孢子云雾。',
            '酸性黏液腐蚀了地板，每走一步都能听到金属溶解的嘶嘶声。整个区域已经被改造成了一个巨大的虫巢。',
            '嗡嗡声震耳欲聋，空气中弥漫着浓烈的信息素。墙壁上每一个孔洞都可能是攻击的源头——这里已经是虫群的领域。',
            '天花板上的通风口不断滴落黏稠的液体，在地面聚成一滩发光的绿色水洼。某种幼虫在其中蠕动。',
            '墙壁被一层半透明的蛹状物质覆盖，透过薄壳能看到内部有东西在缓慢跳动。这里是一个孵化场。',
            '地面上散落着数以千计的微小虫卵，每一个都随着脚步声微微发亮。踩碎它们会释放出刺鼻的信息素。'
        ],
        ember: [
            '远处的服务器机柜发出低沉的嗡鸣，几根光纤从断裂的天花板垂下，末端闪着微弱的红光。',
            '走廊被冷却液泄漏形成的雾气笼罩，地面上有几道被高温灼烧过的黑色痕迹。',
            '墙壁上嵌着一排排早已停摆的监控摄像头，它们的镜头统一转向黑暗深处——像在注视着什么。',
            '电弧在破损的线缆间跳跃，烧焦的电路板散发出刺鼻的臭氧。机械残骸堆砌成巢穴的形状。',
            '冷却液泄漏形成的雾气笼罩着整个区域，纳米菌丝爬满了控制面板。红色的传感器光点在黑暗中明灭。',
            '整个走廊就是一座巨大的电路坟场。每一块金属表面都爬满了接入电极的银色菌丝，它们正在用电流改写自己的基因编码。',
            '一台高大的工业机器人瘫倒在走廊中央，胸腔被内部生长的真菌菌丝撑裂。散热风扇仍在无力地转动。',
            '墙壁上的电路板已经和生物组织融为一体——银色的纳米菌丝与铜质导线交织成某种半机械、半有机的神经网络。',
            '空气中弥漫着高浓度臭氧，每靠近一步，皮肤表面都会产生微弱的静电刺痛。这里的电磁场极不稳定。'
        ]
    };
    var _eliteDescs = [
        '传感器读数突然飙升——前方存在高浓度生物信号，远超普通变异体的阈值。',
        '通道尽头传来沉重的撞击声，每一次震动都让脚下的金属板跟着颤抖。门后有什么大家伙。',
        '这里的空气厚重得几乎无法呼吸，某种强大的存在用它的领域压制着一切闯入者。',
        '大量生物质堆积在此处，形成了一个扭曲的巢穴。中心的那个身影正注视着你。',
        '警告指示灯在墙壁上疯狂闪烁，整个区域的生物信号浓度已经超出了传感器的上限。',
        '你脚下的金属地板在颤抖——不是机器运转的震动，而是某种巨型生物的呼吸引起的共振。这是一个被标记为红色禁忌的领域。'
    ];
    var _campDescs = [
        '角落里的应急灯还在工作，投射出一小片安全的暖黄色光晕。几瓶未开封的营养液整齐地摆在架子上。',
        '废弃的医疗舱尚有余温，墙壁上残留的消毒痕迹说明不久前还有幸存者在此歇息。',
        '天然形成的有机腔室隔绝了外界的污染，空气中甚至能闻到一丝草木的气息。',
        '某种频率极低的共振波笼罩着这片区域，神经链路自动进入低功耗模式。这里安全。',
        '一束柔和的生物荧光从天花板的裂缝中洒下，这里似乎被某种共生菌群保护着。墙壁上刻着前人留下的简笔标记——他们曾经活着。',
        '这是一个意外惊喜：完整运转的低温休眠舱。虽然破旧，但它的环境控制系统依然在线，足以维持人类生存所需的空气和温度。'
    ];
    var _dungeonDescs = [
        '厚重的防爆门半开半合，门缝中涌出的冷风带着古老的腐臭。门上依稀可见「危险：生化隔离区」。',
        '螺旋向下的阶梯深入黑暗，每一步都伴随着金属疲劳的呻吟。你感到深处的某种东西正在等待。',
        '巨大的垂直通道贯穿了多层实验室架构，电缆如同藤蔓般垂落。下方黑暗中闪烁着不祥的生物光。',
        '电梯井已被变异组织完全覆盖，但一条狭窄的通气管道仍然敞开。空气流动的声响暗示着下方有巨大的空间。',
        '门上的警示标签已经被时间腐蚀得难以辨认，但门后传来的低频轰鸣不会骗人——这是一个还在运作的深层隔离区。'
    ];
    var _dungeonEnvs = [
        { name: '底层代码变异', desc: '全技能 [进程] 消耗 +1', effect: { ramPenalty: 1 } },
        { name: '高压电弧环境', desc: '每回合结束受到 5 点电离伤害', effect: { turnDamage: 5 } },
        { name: '机械浓度超标', desc: '非机械类技能伤害降低 30%', effect: { nonEmberAtkMult: 0.7 } },
        { name: '生化隔离泄露', desc: '初始 [毒性] +20，脱离后重置', effect: { startTox: 20 } }
    ];
    var _portalDescs = [
        '空间在这里如同融化的玻璃一样扭曲，一道发光的裂隙悬浮在半空，透过它可以隐约看到另一端的实验室。',
        '量子隧穿效应在此处形成了一个临时的时空褶皱，周围的空气电离化，皮肤能感受到微弱的电流穿过。',
        '一个不断旋转的能量漩涡发出低沉的嗡嗡声，周围的灰尘和碎片在它的引力场中缓慢漂浮。这是实验室快速通勤系统的残骸。',
        '空气中弥漫着臭氧的味道，一道不断变换形状的电磁门悬在走廊尽头。传感器无法解析门后的空间结构——这通向未知的深层。'
    ];
    var _bossDescsBase = [
        '整个区域都笼罩在它的恐怖之中。墙壁上布满了它留下的痕迹，空气本身都在为它的存在而颤抖。',
        '生物信号强度超出了传感器的上限。它的每一次呼吸都让天花板掉落锈蚀的金属碎片。',
        '通道突然开阔，一个巨大的腔室展现在眼前。在腔室的中心，它正等待着下一个挑战者。',
        '这片区域的一切都被它的存在扭曲了——金属墙板像纸一样被撕开，地板上刻着深深的爪痕，每一道都有两米长。',
        '你终于来到了它的面前。空气中弥漫着浓烈的信息素，每一个细胞都在尖叫着让你逃离。但你已经没有退路了。'
    ];
    var _relicDescs = [
        '墙壁的裂缝中隐约透出微弱的生物荧光，传感器检测到高浓度基因碎片残留。',
        '一堆废弃的科研设备中，有几管未破损的基因样本仍在发出淡蓝色的辉光。捡到宝了。',
        '角落里的低温储存柜半开着，里面的试剂瓶蒙着一层薄霜。一些组件碎片散落在周围。',
        '一具穿着白色实验服的人类遗骸倚在墙边，手中还紧握着一个小型数据板。数据板上的红灯仍在一闪一闪。',
        '打开的门后是一间小型实验室，实验台上散落着各种基因样本和半成品的突变体器官——这是某个研究员临死前留下的宝藏。'
    ];

    // 生成单层节点池
    function _genFloorNodePool(floor, gs) {
        var cfg = FLOOR_CONFIG[floor] || FLOOR_CONFIG[1];
        var nodes = [];
        var id = 0;

        // 母巢（B1起点固定名称）
        if (floor === 1) {
            nodes.push({ id: 'node_' + (id++), type: 'camp', label: '<span class="icon icon-campfire"></span> 源初母巢', desc: '半透明的生物膜包裹着整个舱室，营养液在壁面上缓缓流淌。微弱的心跳声从深处传来——那是你自己的脉搏。这是唯一安全的地方。', exhausted: false, isStart: true });
        }

        // 怪物
        for (var mi = 0; mi < cfg.monster; mi++) {
            var mid = _allMonsters[Math.floor(Math.random() * _allMonsters.length)];
            var m = GD().MONSTERS[mid];
            var raceSuffix = { mutant: '异变者', swarm: '寄生群落', ember: '机械余烬' };
            var _MONSTER_ICONS = { mutant: 'icon-monster-mutant', swarm: 'icon-monster-swarm', ember: 'icon-monster-ember' };
            nodes.push({ id: 'node_' + (id++), type: 'monster', monsterId: mid, raceClr: _raceColors[m.race] || _raceColors._default, label: '<span class="icon ' + ((m.icon ? "icon-mid-" + m.icon : _MONSTER_ICONS[m.race] || "icon-infested-mass")) + '"></span> ' + m.name + ' <span style="opacity:0.6;">' + (raceSuffix[m.race] || '领地') + '</span>', desc: _pickDesc(_raceDescs[m.race] || _raceDescs.mutant, gs), exhausted: false });
        }

        // 精英
        for (var ei = 0; ei < cfg.elite; ei++) {
            var eid = _eliteMonsters[Math.floor(Math.random() * _eliteMonsters.length)];
            var em = GD().MONSTERS[eid];
            var raceSuffix2 = { mutant: '异变者', swarm: '寄生群落', ember: '机械余烬' };
            var _ELITE_ICONS = { mutant: 'icon-elite-mutant', swarm: 'icon-elite-swarm', ember: 'icon-elite-ember' };
            nodes.push({ id: 'node_' + (id++), type: 'elite', monsterId: eid, raceClr: _raceColors[em.race] || _raceColors._default, label: '<span class="icon ' + ((em.icon ? "icon-mid-" + em.icon : _ELITE_ICONS[em.race] || "icon-fanged-skull")) + '"></span> 强敌：' + em.name + ' <span style="opacity:0.6;">' + (raceSuffix2[em.race] || '') + '</span>', desc: _pickDesc(_eliteDescs, gs), exhausted: false });
        }

        // 营地（非B1）
        for (var ci = 0; ci < cfg.camp; ci++) {
            nodes.push({ id: 'node_' + (id++), type: 'camp', label: '<span class="icon icon-campfire"></span> 中立细胞核营地', desc: _pickDesc(_campDescs, gs), exhausted: false });
        }

        // 遗物
        for (var ri = 0; ri < cfg.relic; ri++) {
            nodes.push({ id: 'node_' + (id++), type: 'relic', label: '<span class="icon icon-upgrade"></span> 基因遗物', desc: _pickDesc(_relicDescs, gs), exhausted: false });
        }

        // 地下城
        for (var di = 0; di < cfg.dungeon; di++) {
            var env = _dungeonEnvs[Math.floor(Math.random() * _dungeonEnvs.length)];
            nodes.push({ id: 'node_' + (id++), type: 'dungeon', label: '<span class="icon icon-dungeon-light"></span> 地下城入口', desc: _pickDesc(_dungeonDescs, gs), env: env, exhausted: false });
        }

        // Boss（随机或在 B4 从三个领主中随机抽）
        var bossId = cfg.bossId || _bossMonsters[Math.floor(Math.random() * _bossMonsters.length)];
        var bm = GD().MONSTERS[bossId];
        var bossRaceSuffix = { mutant: '异变者', swarm: '寄生群落', ember: '机械余烬' };
        var _BOSS_ICONS = { mutant: 'icon-mutant', swarm: 'icon-swarm', ember: 'icon-ember' };
        nodes.push({ id: 'node_' + (id++), type: 'boss', monsterId: bossId, raceClr: _raceColors[bm.race] || _raceColors._default, label: '<span class="icon ' + ((bm.icon ? "icon-mid-" + bm.icon : _BOSS_ICONS[bm.race] || "icon-crown")) + '"></span> 领主：' + bm.name + ' <span style="opacity:0.6;">' + (bossRaceSuffix[bm.race] || '') + '</span>', desc: _pickDesc(_bossDescsBase, gs).replace('它', bm.name), exhausted: false, hidden: true });

        // 传送门（预置，portalUnlocked 时启用）
        nodes.push({ id: 'node_' + (id++), type: 'portal', label: '<span class="icon icon-portal"></span> 传送门', desc: _portalDescs[Math.floor(Math.random() * _portalDescs.length)], exhausted: false, hidden: true });

        // 打乱（保持首个节点不动——母巢起点）
        var startIdx = (nodes[0] && nodes[0].isStart) ? 1 : 0;
        for (var si = nodes.length - 1; si > startIdx; si--) {
            var j = startIdx + Math.floor(Math.random() * (si - startIdx + 1));
            var tmp = nodes[si]; nodes[si] = nodes[j]; nodes[j] = tmp;
        }
        // 确保 Boss 不在前 2 个位置（非起点）
        var bossNode = null, bossIdx = -1;
        for (var bi = 0; bi < nodes.length; bi++) { if (nodes[bi].type === 'boss') { bossNode = nodes[bi]; bossIdx = bi; break; } }
        if (bossNode && bossIdx < nodes.length - 2 && bossIdx > startIdx) {
            nodes.splice(bossIdx, 1);
            nodes.splice(nodes.length - 1, 0, bossNode);
        }

        // [新增] 路径词缀系统：为战斗类节点赋予环境加成
        var envAffixes = [
            { id: 'high_process', name: '高能反应', desc: '开局额外获得 2 点进程', color: 'var(--accent-green)' },
            { id: 'weak_bio', name: '生物辐射', desc: '全场敌人初始降低 20% HP', color: 'var(--accent-red)' },
            { id: 'data_rich', name: '信号富集', desc: '击败后获得的经验提升 50%', color: 'var(--accent-blue)' },
            { id: 'scrap_rich', name: '金属堆积', desc: '击败后额外获得 1 个组件碎片', color: 'var(--accent-yellow)' },
            { id: 'corrosive', name: '酸蚀环境', desc: '进入后敌人获得 3 层中毒', color: 'var(--accent-purple)' }
        ];

        nodes.forEach(function(n) {
            if (['monster', 'elite', 'boss', 'dungeon'].indexOf(n.type) !== -1) {
                if (Math.random() < 0.4) { // 40% 概率带词缀
                    n.synapseAffix = envAffixes[Math.floor(Math.random() * envAffixes.length)];
                }
            }
        });

        return nodes;
    }

    function _genDiscoveryPaths(gs) {
        var ms = gs.mapState;
        if (!ms.floorNodePool || ms.floorNodePool.length === 0) {
            ms.floorNodePool = _genFloorNodePool(ms.currentFloor || 1, gs);
        }
        var pool = ms.floorNodePool;
        var paths = [];
        // [修复] 仅在 B1F 的第一个母巢（ stepsTaken 为 0）内限制路径类型，作为新手教学区
        // 之后的普通营地不再限制后续路径，防止出现无路可走的 BUG
        var isTutorialCamp = ms.currentRoom && ms.currentRoom.type === 'camp' && ms.currentFloor === 1 && ms.stepsTaken <= 1;

        var available = [];
        for (var i = 0; i < pool.length; i++) {
            if (pool[i].exhausted || pool[i].hidden) continue;
            if (isTutorialCamp && (pool[i].type === 'boss' || pool[i].type === 'camp' || pool[i].type === 'elite' || pool[i].type === 'dungeon' || pool[i].type === 'portal')) continue;
            available.push(i);
        }

        // 领主解锁：清掉 ≥60% 非Boss非传送门节点后才出现
        if (!ms.bossDefeated) {
            var totalNodes = 0, doneNodes = 0;
            for (var ni = 0; ni < pool.length; ni++) { if (pool[ni].type !== 'boss' && pool[ni].type !== 'portal') { totalNodes++; if (pool[ni].exhausted) doneNodes++; } }
            if (totalNodes > 0 && doneNodes / totalNodes >= 0.6) {
                for (var bi = 0; bi < pool.length; bi++) { if (pool[bi].type === 'boss' && pool[bi].hidden) { pool[bi].hidden = false; break; } }
                // 重新计算 available
                available = [];
                for (var ri = 0; ri < pool.length; ri++) { if (!pool[ri].exhausted && !pool[ri].hidden) { if (!(isTutorialCamp && (pool[ri].type === 'boss' || pool[ri].type === 'camp' || pool[ri].type === 'elite' || pool[ri].type === 'dungeon' || pool[ri].type === 'portal'))) available.push(ri); } }
            }
        }

        // 如果所有可见节点用完：
        if (available.length === 0) {
            if (!ms.bossDefeated) {
                for (var bi2 = 0; bi2 < pool.length; bi2++) { if (pool[bi2].type === 'boss' && !pool[bi2].hidden) { if (pool[bi2].exhausted) pool[bi2].exhausted = false; available.push(bi2); break; } }
            }
            // Boss击败后若无可选节点，强制显示传送门推进进度（全楼层通用）
            if (available.length === 0 && ms.bossDefeated && ms.currentFloor <= 10) {
                for (var pi2 = 0; pi2 < pool.length; pi2++) { if (pool[pi2].type === 'portal') { pool[pi2].hidden = false; available.push(pi2); break; } }
            }
        }

        // 通关：10F 传送门已穿越，或 10F Boss 已击败且传送门已解锁
        if (ms.currentFloor > 10 || (ms.bossDefeated && ms.currentFloor >= 10)) {
            paths.push({ id: 'victory', type: 'victory', label: '<span class="icon icon-crown"></span> 基因序列完整', desc: '三股毁灭力量已被清除。黑地平线实验室终于归于沉寂。你的原体完成了终极进化。' });
            return paths;
        }

        // 如果传送门已解锁，确保它在可见池中
        if (ms.portalUnlocked) {
            for (var pi = 0; pi < pool.length; pi++) {
                if (pool[pi].type === 'portal' && pool[pi].hidden) { pool[pi].hidden = false; break; }
            }
            // 重新扫描 available
            available = []; for (var ai = 0; ai < pool.length; ai++) { if (!pool[ai].exhausted && !pool[ai].hidden) available.push(ai); }
        }

        var count = Math.min(available.length, 2 + Math.floor(Math.random() * 2));
        // 洗牌取前 count 个
        for (var ci = available.length - 1; ci > 0; ci--) { var ji = Math.floor(Math.random() * (ci + 1)); var ti = available[ci]; available[ci] = available[ji]; available[ji] = ti; }
        for (var pi3 = 0; pi3 < count; pi3++) {
            var node = pool[available[pi3]];
            paths.push({
                id: node.id, type: node.type, monsterId: node.monsterId,
                label: node.label, desc: node.desc, raceClr: node.raceClr,
                _poolIndex: available[pi3],
                synapseAffix: node.synapseAffix // [新增] 传递词缀
            });
        }

        // 兜底：如果路径为空且不是通关状态，生成一条空路径防止软锁
        if (paths.length === 0) {
            if (ms.bossDefeated && ms.currentFloor >= 10) {
                paths.push({ id: 'victory', type: 'victory', label: '<span class="icon icon-crown"></span> 基因序列完整', desc: '三股毁灭力量已被清除。黑地平线实验室终于归于沉寂。你的原体完成了终极进化。' });
            } else {
                paths.push({ id: 'empty', type: 'empty', label: '信号微弱', desc: '传感器无法锁定任何有效路径。尝试重新校准。' });
            }
        }

        return paths;
    }

    function createNewGame() {
        var gs = {
            mapState: {
                currentRoom: { type: 'camp', label: '源初母巢', desc: '半透明的生物膜包裹着整个舱室，营养液在壁面上缓缓流淌。微弱的心跳声从深处传来——那是你自己的脉搏。这是唯一安全的地方。' },
                currentFloor: 1,
                floorNodePool: [],
                bossDefeated: false,
                portalUnlocked: false,
                stepsTaken: 0,
                completedTasks: [],
                mapLevel: 1,
                loop: 1 // [新增] 周目计数
            },
            player: {
                hp: 100, hp_max: 100, process: 10, process_max: 10, toxicity: 0, toxicity_max: 50,
                atk: 12, atk_base: 12, def: 5, def_base: 5, bp: 50, process_recovery: 3,
                level: 1, xp: 0, xpToNext: 30, availableMasteryPoints: 1,
                masteryPoints: { mutant: 0, swarm: 0, ember: 0 },
                introSeen: false,
                predatory_organ: { equipped: null, tier: 1, component_slots: [null, null] },
                chitin_epidermis: { equipped: null, tier: 1, component_slots: [null, null] },
                gland_core: { equipped: null, tier: 1, component_slots: [null, null] },
                masteries: [null, null],
                _potionHistory: [], _potionHistoryTick: 0, _potionsUsed: 0,
                activeCoating: null, coatingTurnsLeft: 0,
                relicsFound: 0, dungeonsEntered: 0,
                claimedTaskRewards: [],
                bossFailCount: 0 // 连败计数
            },
            inventory: { components: {}, potions: [], organs: [], organSyncLevels: {} },
            bestiary: { scanned: [], killCount: {}, researchLevels: {} },
            meta: { version: '3.0.0', createdAt: Date.now(), lastSavedAt: null, gameTime: 0 }
        };
        gs.mapState.floorNodePool = _genFloorNodePool(1, gs);
        gs.mapState.discoveryPaths = _genDiscoveryPaths(gs);
        return gs;
    }

    function recalcPlayerStats() {
        var gs = getState(); if (!gs) return; var p = gs.player; var data = GD(); if (!data) return;
        // 基础重置
        p.atk = p.atk_base || 10;
        p.def = p.def_base || 5;
        p.hp_max = 100;
        p.process_max = 10;
        p.process_recovery = 3;
        var slots = ['predatory_organ', 'chitin_epidermis', 'gland_core'];
        var slotTypes = { 'predatory_organ': 'atk', 'chitin_epidermis': 'def', 'gland_core': 'process' };
        slots.forEach(function (sn) {
            var slot = p[sn]; if (!slot) return;
            var tierBonus = Math.max(0, (slot.tier || 1) - 1);
            if (slotTypes[sn] === 'atk') { p.atk += tierBonus * 3; p.hp_max += tierBonus * 5; }
            else if (slotTypes[sn] === 'def') { p.def += tierBonus * 3; p.hp_max += tierBonus * 3; }
            else {
                p.process_max = Math.min(20, p.process_max + tierBonus);
                p.process_recovery += tierBonus; // 代谢腺体每阶+1恢复
            }
            if (slot.equipped && data.BOSS_ORGANS && data.BOSS_ORGANS[slot.equipped]) {
                var bo = data.BOSS_ORGANS[slot.equipped];
                var syncLvl = gs.inventory.organSyncLevels[slot.equipped] || 1;
                var syncMult = 1 + (syncLvl - 1) * 0.5;
                if (bo.tier >= 2) { p.atk += Math.ceil(bo.tier * syncMult); p.def += Math.ceil(bo.tier * syncMult); }
                if (bo.tier >= 3) { p.hp_max += Math.ceil(30 * syncMult); }
            }
            if (!slot.component_slots) return;
            slot.component_slots.forEach(function (cid) {
                if (!cid || !data.COMPONENTS) return;
                var aff = _resolveCompAffixes(data, cid); if (!aff) return;
                if (aff.atkBonus) p.atk += aff.atkBonus;
                if (aff.defBonus) p.def += aff.defBonus;
                if (aff.flatDefBonus) p.def += aff.flatDefBonus;
                if (aff.shieldBonus) p.hp_max += aff.shieldBonus;
                if (aff.poisonImmune) p.poisonImmune = true;
                if (aff.physMultiplier) p.atk = Math.ceil(p.atk * aff.physMultiplier);
            });
        });
        // 基因共鸣：同Boss三件套联动加成
        if (data && data.BOSS_ORGANS) {
            var eq1 = p.predatory_organ.equipped;
            var eq2 = p.chitin_epidermis.equipped;
            var eq3 = p.gland_core.equipped;
            if (eq1 && eq2 && eq3) {
                var b1 = data.BOSS_ORGANS[eq1], b2 = data.BOSS_ORGANS[eq2], b3 = data.BOSS_ORGANS[eq3];
                if (b1 && b2 && b3 && b1.bossSource === b2.bossSource && b2.bossSource === b3.bossSource) {
                    p._setBonus = b1.bossSource; // MON_CH1_TYRANT / MON_CH1_QUEEN / MON_CH1_CORE
                    if (b1.bossSource === 'MON_CH1_TYRANT') {
                        p.atk = Math.ceil(p.atk * 1.2);
                        p.hp_max += 50;
                    } else if (b1.bossSource === 'MON_CH1_QUEEN') {
                        p.process_recovery += 2;
                        p._toxDmgBonus = 0.3;
                    } else if (b1.bossSource === 'MON_CH1_CORE') {
                        p._shieldBonus = 0.3;
                        p.process_max = Math.min(20, p.process_max + 3);
                    }
                } else {
                    p._setBonus = null;
                }
            } else {
                p._setBonus = null;
            }
        }
        if (p.masteryPoints) {
            var mData = data.MASTERIES;
            if (mData) {
                // 检测同系叠加 (A+A+B)，触发 150% 增幅
                var dupBonus = {};
                if (p.masteries) {
                    var raceCount = {};
                    p.masteries.forEach(function(r) { if (r) raceCount[r] = (raceCount[r] || 0) + 1; });
                    Object.keys(raceCount).forEach(function(r) { if (raceCount[r] >= 2) dupBonus[r] = true; });
                }
                Object.keys(p.masteryPoints).forEach(function (race) {
                var pts = p.masteryPoints[race] || 0; if (pts <= 0 || !mData[race]) return;
                var mult = dupBonus[race] ? 1.5 : 1.0;
                var sp = mData[race].statsPerPoint;
                p.hp_max += (sp.hp_max || 0) * pts * mult; p.atk += (sp.atk || 0) * pts * mult; p.def += (sp.def || 0) * pts * mult;
                p.process_max = Math.min(20, p.process_max + (sp.process_max || 0) * pts * mult);
                if (race === 'ember') { p.process_recovery += pts * mult * 0.5; }
            });
            }
        }
        p.hp = Math.min(p.hp, p.hp_max); p.process = Math.min(p.process, p.process_max);
    }

    // 解析组件属性（支持动态 ⅠⅡⅢ 级）
    function _resolveCompAffixes(data, cid) {
        var comp = data.COMPONENTS[cid];
        if (comp && comp.affixes) return comp.affixes;
        // 可能为Ⅰ/Ⅱ/Ⅲ动态组件：根据基础组件推算
        var baseName = cid.replace(/[ⅠⅡⅢ]$/, '');
        if (baseName === cid) return null;
        var baseComp = data.COMPONENTS[baseName];
        if (!baseComp || !baseComp.affixes) return null;
        var tierIdx = cid.length - baseName.length;
        var multiplier = Math.pow(2, tierIdx);
        var affixes = {};
        Object.keys(baseComp.affixes).forEach(function(ak) {
            var v = baseComp.affixes[ak];
            if (typeof v === 'boolean') affixes[ak] = v;
            else if (ak === 'critMultiplier') affixes[ak] = v + 0.5 * tierIdx;
            else affixes[ak] = v * multiplier;
        });
        return affixes;
    }

    function xpForLevel(level) {
        if (level >= 30) return 0; // [优化] 等级上限根据用户需求提升至 30
        return Math.ceil(30 * Math.pow(1.6, level - 1));
    }

    function gainXp(amount) {
        var gs = getState(); if (!gs) return null; var p = gs.player;
        if (p.level >= 30) {
            p.xp = 0; p.xpToNext = 0; return { leveled: false };
        }

        p.xp += amount; var leveled = false;
        while (p.xp >= p.xpToNext && p.level < 30) {
            p.xp -= p.xpToNext;
            p.level += 1;
            if (p.level >= 30) {
                p.xp = 0;
                p.xpToNext = 0;
            } else {
                p.xpToNext = xpForLevel(p.level);
            }
            p.availableMasteryPoints += 1;
            p.hp = p.hp_max;
            leveled = true;
        }
        recalcPlayerStats(); save();
        return { leveled: leveled, newLevel: p.level, points: p.availableMasteryPoints };
    }

    function learnMastery(race, slotIndex) {
        var gs = getState(); if (!gs) return { success: false, error: '状态未初始化' }; var p = gs.player;
        var validRaces = ['mutant', 'swarm', 'ember'];
        if (validRaces.indexOf(race) === -1) return { success: false, error: '无效种族' };

        // [新增] 支持第三个专精槽 (Loop 2 解锁)
        var maxSlots = (gs.mapState.loop >= 2) ? 3 : 2;
        if (slotIndex < 0 || slotIndex >= maxSlots) return { success: false, error: '无效专精槽' };

        if (p.availableMasteryPoints < 1) return { success: false, error: '无可用专精点' };
        if (p.masteries[slotIndex] === race) {
            p.availableMasteryPoints -= 1; p.masteryPoints[race] = (p.masteryPoints[race] || 0) + 1;
        } else {
            // 切换流派：退还旧投入
            var oldRace = p.masteries[slotIndex];
            if (oldRace) { p.availableMasteryPoints += (p.masteryPoints[oldRace] || 0); p.masteryPoints[oldRace] = 0; }
            p.availableMasteryPoints -= 1; p.masteryPoints[race] = (p.masteryPoints[race] || 0) + 1; p.masteries[slotIndex] = race;
        }
        recalcPlayerStats(); save();
        return { success: true, race: race, slot: slotIndex, masteryPoints: p.masteryPoints[race] };
    }

    function resetMastery(slotIndex) {
        var gs = getState(); if (!gs) return { success: false, error: '未初始化' };
        var p = gs.player;
        var maxSlots = (gs.mapState.loop >= 2) ? 3 : 2;
        if (slotIndex < 0 || slotIndex >= maxSlots) return { success: false, error: '无效专精槽' };

        var oldRace = p.masteries[slotIndex];
        if (!oldRace) return { success: false, error: '该槽无专精' };
        var refunded = p.masteryPoints[oldRace] || 0;
        p.availableMasteryPoints += refunded;
        p.masteryPoints[oldRace] = 0;
        p.masteries[slotIndex] = null;
        recalcPlayerStats(); save();
        return { success: true, refunded: refunded };
    }

    function equipOrgan(slot, organId) {
        var gs = getState(); if (!gs) return { success: false, error: '状态未初始化' };
        if (['predatory_organ', 'chitin_epidermis', 'gland_core'].indexOf(slot) === -1) return { success: false, error: '无效插槽' };
        var p = gs.player; var inv = gs.inventory;
        // 卸下：organId 为 null
        if (organId === null || organId === undefined) {
            var old = p[slot].equipped; if (old) { inv.organs.push(old); p[slot].equipped = null; recalcPlayerStats(); save(); return { success: true, unequipped: old }; }
            return { success: false, error: '无已装备器官' };
        }
        var idx = inv.organs.indexOf(organId); if (idx === -1) return { success: false, error: '仓库中无此器官' };
        var data = GD();
        if (data && data.BOSS_ORGANS && data.BOSS_ORGANS[organId]) { if (data.BOSS_ORGANS[organId].slotType !== slot) return { success: false, error: '类型不匹配' }; }
        var old = p[slot].equipped; if (old) inv.organs.push(old);
        p[slot].equipped = organId; inv.organs.splice(idx, 1);
        recalcPlayerStats(); save();
        return { success: true, equipped: organId, unequipped: old };
    }

    function upgradeOrganTier(slot) {
        var gs = getState(); if (!gs || !gs.player[slot]) return { success: false, error: '无效' };
        var cost = Math.ceil(5 * Math.pow(1.6, gs.player[slot].tier));
        var inv = gs.inventory.components;
        var getWeight = function(cid) { if (cid.endsWith('Ⅲ')) return 4; if (cid.endsWith('Ⅱ')) return 3; if (cid.endsWith('Ⅰ')) return 2; return 1; };
        var total = 0; Object.keys(inv).forEach(function (k) { total += (inv[k] || 0) * getWeight(k); });
        if (total < cost) return { success: false, error: '材料不足，需' + cost + '碎片（当前加权合计' + total + '）' };
        var remaining = cost;
        Object.keys(inv).sort(function(a,b){ return getWeight(b) - getWeight(a); }).forEach(function (k) {
            if (remaining <= 0) return;
            while (inv[k] > 0 && remaining > 0) { inv[k] -= 1; remaining -= getWeight(k); }
        });
        gs.player[slot].tier += 1; recalcPlayerStats(); save();
        return { success: true, slot: slot, newTier: gs.player[slot].tier, cost: cost };
    }

    function upgradeOrganTierWithSelection(slot, selectedComponents) {
        var gs = getState(); if (!gs || !gs.player[slot]) return { success: false, error: '无效' };
        var cost = Math.ceil(5 * Math.pow(1.6, gs.player[slot].tier));
        var inv = gs.inventory.components;
        var getWeight = function(cid) { if (cid.endsWith('Ⅲ')) return 4; if (cid.endsWith('Ⅱ')) return 3; if (cid.endsWith('Ⅰ')) return 2; return 1; };
        var totalWeight = 0; selectedComponents.forEach(function(cid) { totalWeight += getWeight(cid); });
        if (totalWeight < cost) return { success: false, error: '加权不足，需' + cost + '，当前' + totalWeight };
        // 检查库存
        var need = {}; selectedComponents.forEach(function(cid) { need[cid] = (need[cid]||0) + 1; });
        var missing = []; Object.keys(need).forEach(function(cid) { if ((inv[cid]||0) < need[cid]) missing.push(cid); });
        if (missing.length > 0) return { success: false, error: '库存不足: ' + missing.join(',') };
        // 消耗
        Object.keys(need).forEach(function(cid) { inv[cid] -= need[cid]; });
        gs.player[slot].tier += 1; recalcPlayerStats(); save();
        return { success: true, slot: slot, newTier: gs.player[slot].tier };
    }

    function socketComponent(slot, socketIndex, componentId) {
        var gs = getState(); if (!gs) return { success: false, error: '未初始化' };
        if (socketIndex !== 0 && socketIndex !== 1) return { success: false, error: '无效孔' };
        var data = GD(); if (!data || !data.COMPONENTS) return { success: false, error: '数据库未加载' };
        var comp = data.COMPONENTS[componentId];
        // 动态组件（ⅠⅡⅢ升级版）：根据基础组件重建数据
        if (!comp) {
            var baseName = componentId.replace(/[ⅠⅡⅢ]$/, '');
            var baseComp = data.COMPONENTS[baseName];
            if (!baseComp) return { success: false, error: '未知碎片' };
            var tierIdx = componentId.length - baseName.length;
            var multiplier = Math.pow(2, tierIdx);
            comp = { allowedSlots: baseComp.allowedSlots, affixes: {} };
            Object.keys(baseComp.affixes).forEach(function(ak) {
                var v = baseComp.affixes[ak];
                if (typeof v === 'boolean') comp.affixes[ak] = v;
                else if (ak === 'critMultiplier') comp.affixes[ak] = v + 0.5 * tierIdx;
                else comp.affixes[ak] = v * multiplier;
            });
        }
        if (comp.allowedSlots.indexOf(slot) === -1) return { success: false, error: '不匹配此插槽' };
        var inv = gs.inventory.components; if (!inv[componentId] || inv[componentId] <= 0) return { success: false, error: '库存不足' };
        var old = gs.player[slot].component_slots[socketIndex]; if (old) { if (!inv[old]) inv[old] = 0; inv[old] += 1; }
        inv[componentId] -= 1; gs.player[slot].component_slots[socketIndex] = componentId;
        recalcPlayerStats(); save();
        return { success: true, slot: slot, index: socketIndex, component: componentId };
    }

    function craftPotion(potionId) {
        var gs = getState(); if (!gs) return { success: false, error: '未初始化' };
        var data = GD(); if (!data || !data.POTIONS || !data.POTIONS[potionId]) return { success: false, error: '未知魔药' };
        if (gs.inventory.potions.length >= 3) return { success: false, error: '最多3瓶' };
        var cost = data.POTIONS[potionId].toxicity >= 35 ? 3 : 2;
        var inv = gs.inventory.components; var total = 0; Object.keys(inv).forEach(function (k) { total += (inv[k] || 0); });
        if (total < cost) return { success: false, error: '碎片不足' };
        var rem = cost; Object.keys(inv).forEach(function (k) { if (rem <= 0) return; var take = Math.min(inv[k] || 0, rem); inv[k] -= take; rem -= take; });
        gs.inventory.potions.push(potionId); save();
        return { success: true, potion: potionId, cost: cost };
    }

    function craftPotionWithSelection(potionId, selectedComponents) {
        var gs = getState(); if (!gs) return { success: false, error: '未初始化' };
        var data = GD(); if (!data || !data.POTIONS || !data.POTIONS[potionId]) return { success: false, error: '未知魔药' };
        if (gs.inventory.potions.length >= 3) return { success: false, error: '最多3瓶' };
        var cost = data.POTIONS[potionId].toxicity >= 35 ? 3 : 2;
        if (selectedComponents.length !== cost) return { success: false, error: '需选择 ' + cost + ' 个碎片' };
        var inv = gs.inventory.components;
        var need = {}; selectedComponents.forEach(function (cid) { need[cid] = (need[cid] || 0) + 1; });
        var missing = []; Object.keys(need).forEach(function (cid) { if ((inv[cid] || 0) < need[cid]) missing.push(cid); });
        if (missing.length > 0) return { success: false, error: '库存不足: ' + missing.join(',') };
        Object.keys(need).forEach(function (cid) { inv[cid] -= need[cid]; });
        gs.inventory.potions.push(potionId); save();
        return { success: true, potion: potionId, cost: cost };
    }

    function applyCoating(coatingId) {
        var gs = getState(); if (!gs) return { success: false, error: '未初始化' };
        var data = GD(); if (!data || !data.COATINGS || !data.COATINGS[coatingId]) return { success: false, error: '未知涂层' };
        var coat = data.COATINGS[coatingId]; var inv = gs.inventory.components;
        var missing = []; Object.keys(coat.cost).forEach(function (m) { if (!inv[m] || inv[m] < coat.cost[m]) missing.push(m); });
        if (missing.length > 0) return { success: false, error: '碎片不足: ' + missing.join(',') };
        Object.keys(coat.cost).forEach(function (m) { inv[m] -= coat.cost[m]; });
        gs.player.activeCoating = coatingId; gs.player.coatingTurnsLeft = coat.duration; save();
        return { success: true, coating: coatingId };
    }

    function applyCoatingWithSelection(coatingId, selectedComponents) {
        var gs = getState(); if (!gs) return { success: false, error: '未初始化' };
        var data = GD(); if (!data || !data.COATINGS || !data.COATINGS[coatingId]) return { success: false, error: '未知涂层' };
        var coat = data.COATINGS[coatingId]; var inv = gs.inventory.components;
        // 按基础名统计（ⅠⅡⅢ回退）
        var getBase = function(cid) { return cid.replace(/[ⅠⅡⅢ]$/, ''); };
        var need = {}; Object.keys(coat.cost).forEach(function (m) { need[m] = coat.cost[m]; });
        var provided = {}; selectedComponents.forEach(function (cid) { var b = getBase(cid); provided[b] = (provided[b] || 0) + 1; });
        var missing = []; Object.keys(need).forEach(function (m) { if ((provided[m] || 0) < need[m]) missing.push(m); });
        if (missing.length > 0) return { success: false, error: '材料不匹配，缺少: ' + missing.join(',') };
        // 消耗
        var consume = {}; selectedComponents.forEach(function (cid) { consume[cid] = (consume[cid] || 0) + 1; });
        Object.keys(consume).forEach(function (cid) { inv[cid] -= consume[cid]; });
        gs.player.activeCoating = coatingId; gs.player.coatingTurnsLeft = coat.duration; save();
        return { success: true, coating: coatingId };
    }

    function unloadComponent(slot, socketIndex) {
        var gs = getState(); if (!gs) return { success: false, error: '未初始化' };
        if (gs.player.bp < 10) return { success: false, error: 'BP不足(需10)' };
        var cid = gs.player[slot].component_slots[socketIndex]; if (!cid) return { success: false, error: '空孔' };
        gs.player.bp -= 10; gs.player[slot].component_slots[socketIndex] = null;
        var inv = gs.inventory.components; if (!inv[cid]) inv[cid] = 0; inv[cid] += 1;
        recalcPlayerStats(); save();
        return { success: true, slot: slot, returned: cid, bpCost: 10 };
    }

    function save() {
        var state = window._activeGameState; if (!state) return false;
        state.meta.lastSavedAt = Date.now();
        try { localStorage.setItem('blackHorizon_save', JSON.stringify(state)); return true; } catch (e) { return false; }
    }

    function load() {
        try { var raw = localStorage.getItem('blackHorizon_save'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    }

    function getState() { return window._activeGameState; }
    function getMapLevelScaling(gs) {
        var ml = (gs.mapState.mapLevel || 1) - 1;
        var loop = gs.mapState.loop || 1;
        // [优化] 基础倍率随楼层增长，且二周目怪物强度大幅提升
        var loopMult = 1 + (loop - 1) * 0.3; // 每多一周目，基础属性提升 30%

        if (ml <= 0 && loop === 1) return { hpMul: 1, atkMul: 1, defMul: 1, bpMul: 1, xpMul: 1 };
        return {
            hpMul: (1 + ml * 0.08) * loopMult,
            atkMul: (1 + ml * 0.06) * loopMult,
            defMul: (1 + ml * 0.05) * loopMult,
            bpMul: (1 + ml * 0.20) * (1 + (loop-1)*0.2),
            xpMul: (1 + ml * 0.15)
        };
    }
    function calcDamageReduction(def) { return def / (def + 40); }
    function exportSaveText() {
        var state = getState(); if (!state) return '';
        try {
            var json = JSON.stringify(state);
            return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, function(_, p1) { return String.fromCharCode(parseInt(p1, 16)); }));
        } catch (e) { return ''; }
    }

    function importSaveText(str) {
        if (!str) return { success: false, error: '空序列' };
        try {
            var bin = atob(str);
            var encoded = bin.split('').map(function(c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('');
            var decoded = JSON.parse(decodeURIComponent(encoded));
            if (decoded && decoded.player && decoded.mapState) {
                // [修正] 确保导入旧版存档时也同步 meta.version
                decoded.meta = decoded.meta || {};
                decoded.meta.version = '3.0.0';
                _migrateOldSave(decoded);
                window._activeGameState = decoded;
                save();
                return { success: true };
            }
            return { success: false, error: '序列残缺' };
        } catch (e) { return { success: false, error: '解码失败' }; }
    }

    // --- 多槽位存档 ---
    function saveToSlot(slotIndex) {
        var state = getState(); if (!state) return false;
        state.meta.lastSavedAt = Date.now();
        try { localStorage.setItem('blackHorizon_save_' + slotIndex, JSON.stringify(state)); return true; } catch (e) { return false; }
    }

    function loadFromSlot(slotIndex) {
        try { var raw = localStorage.getItem('blackHorizon_save_' + slotIndex); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    }

    function deleteSlot(slotIndex) {
        try { localStorage.removeItem('blackHorizon_save_' + slotIndex); return true; } catch (e) { return false; }
    }

    function listSlots() {
        var slots = [];
        for (var i = 0; i < 3; i++) {
            var data = loadFromSlot(i);
            if (data && data.player) {
                slots.push({ slot: i, level: data.player.level, steps: data.mapState ? data.mapState.stepsTaken : 0, bp: data.player.bp, time: data.meta ? data.meta.lastSavedAt : null });
            } else {
                slots.push({ slot: i, empty: true });
            }
        }
        return slots;
    }

    function reset() { localStorage.removeItem('blackHorizon_save'); window._activeGameState = null; return true; }

    function _migrateOldSave(state) {
        if (!state.player) return;
        var p = state.player;

        // 关键属性有效性检查与默认值补全
        var validateNum = function(val, def) { return (typeof val === 'number' && isFinite(val)) ? val : def; };

        p.level = validateNum(p.level, 1);
        p.xp = validateNum(p.xp, 0);
        p.xpToNext = validateNum(p.xpToNext, xpForLevel(p.level));
        p.availableMasteryPoints = validateNum(p.availableMasteryPoints, 1);
        if (!p.masteryPoints) p.masteryPoints = { mutant: 0, swarm: 0, ember: 0 };
        p.bp = validateNum(p.bp, 50);
        p._potionsUsed = validateNum(p._potionsUsed, 0);
        p.relicsFound = validateNum(p.relicsFound, 0);
        p.dungeonsEntered = validateNum(p.dungeonsEntered, 0);
        if (p.claimedTaskRewards === undefined) p.claimedTaskRewards = [];

        p.process = validateNum(p.process, 10);
        p.process_max = validateNum(p.process_max, 10);
        p.process_recovery = validateNum(p.process_recovery, 3);

        if (!state.inventory) state.inventory = { components: {}, potions: [], organs: [], organSyncLevels: {} };
        if (!state.inventory.organs) state.inventory.organs = [];
        if (!state.inventory.organSyncLevels) state.inventory.organSyncLevels = {};
        if (state.inventory.components) {
            ['暴君核心','蜂后髓核','高能电泳核'].forEach(function(oid) {
                if (state.inventory.components[oid]) {
                    var c2 = state.inventory.components[oid];
                    for (var oi = 0; oi < c2; oi++) state.inventory.organs.push(oid);
                    delete state.inventory.components[oid];
                }
            });
        }
        if (!state.bestiary) state.bestiary = { scanned: [], killCount: {}, researchLevels: {} };
        if (!state.bestiary.killCount) state.bestiary.killCount = {};
        if (!state.bestiary.researchLevels) state.bestiary.researchLevels = {};
        if (!state.meta) state.meta = { version: '3.0.0', createdAt: Date.now(), lastSavedAt: null, gameTime: 0 };

        // 楼层系统迁移
        if (!state.mapState) state.mapState = {};
        var ms = state.mapState;
        ms.currentFloor = validateNum(ms.currentFloor, 1);
        if (ms.bossDefeated === undefined) ms.bossDefeated = false;
        if (ms.portalUnlocked === undefined) ms.portalUnlocked = false;

        // 迁移 introSeen 到 player 对象
        if (ms.introSeen !== undefined && p.introSeen === undefined) {
            p.introSeen = ms.introSeen;
            delete ms.introSeen;
        }
        if (p.introSeen === undefined) p.introSeen = false;

        if (!ms.floorNodePool || ms.floorNodePool.length === 0) {
            ms.floorNodePool = _genFloorNodePool(ms.currentFloor, state);
        }
        if (!ms.discoveryPaths || ms.discoveryPaths.length === 0) {
            ms.discoveryPaths = _genDiscoveryPaths(state);
        }
        if (!ms.currentRoom) {
            ms.currentRoom = { type: 'camp', label: '未知区域', desc: '你在混乱中重组。' };
        }
        ms.mapLevel = validateNum(ms.mapLevel, 1);
        ['predatory_organ', 'chitin_epidermis', 'gland_core'].forEach(function (s) {
            if (!p[s]) p[s] = { equipped: null, tier: 1, component_slots: [null, null] };
            p[s].tier = validateNum(p[s].tier, 1);
            if (!Array.isArray(p[s].component_slots)) p[s].component_slots = [null, null];
            for (var ci = 0; ci < p[s].component_slots.length; ci++) {
                if (p[s].component_slots[ci] !== null && typeof p[s].component_slots[ci] !== 'string') p[s].component_slots[ci] = null;
            }
        });

        // [v3.0] 存档校验层 — 关键数值字段防 NaN/非法值崩溃
        p.hp = validateNum(p.hp, 100);
        p.hp_max = validateNum(p.hp_max, 100);
        p.atk = validateNum(p.atk, 12);
        p.atk_base = validateNum(p.atk_base, 12);
        p.def = validateNum(p.def, 5);
        p.def_base = validateNum(p.def_base, 5);
        p.toxicity = validateNum(p.toxicity, 0);
        p.toxicity_max = validateNum(p.toxicity_max, 50);
        p.bossFailCount = validateNum(p.bossFailCount, 0);

        // 专精数组校验
        if (!Array.isArray(p.masteries)) p.masteries = [null, null];
        for (var mi = 0; mi < p.masteries.length; mi++) {
            if (p.masteries[mi] !== null && typeof p.masteries[mi] !== 'string') p.masteries[mi] = null;
        }

        // 涂层校验
        if (p.activeCoating !== null && typeof p.activeCoating !== 'string') p.activeCoating = null;
        p.coatingTurnsLeft = validateNum(p.coatingTurnsLeft, 0);

        // 数组字段防篡改
        if (!Array.isArray(p.claimedTaskRewards)) p.claimedTaskRewards = [];
        if (!Array.isArray(p._potionHistory)) p._potionHistory = [];

        // masteryPoints 逐个校验
        ['mutant', 'swarm', 'ember'].forEach(function(r) {
            p.masteryPoints[r] = validateNum(p.masteryPoints[r], 0);
        });
    }

    function init() {
        var state = load();
        if (!state) { state = createNewGame(); } else { _migrateOldSave(state); }
        window._activeGameState = state;
        recalcPlayerStats();
        return state;
    }

    function buyComponent(componentId) {
        var gs = getState(); if (!gs) return { success: false, error: '未初始化' };
        var cost = 150;
        if (gs.player.bp < cost) return { success: false, error: 'BP不足(需' + cost + ')' };
        gs.player.bp -= cost;
        gs.inventory.components[componentId] = (gs.inventory.components[componentId] || 0) + 1;
        save();
        return { success: true, component: componentId, cost: cost };
    }

    function upgradeOrganTierWithBP(slot) {
        var gs = getState(); if (!gs || !gs.player[slot]) return { success: false, error: '无效' };
        var cost = Math.ceil(5 * Math.pow(1.6, gs.player[slot].tier));
        var inv = gs.inventory.components;
        var getWeight = function(cid) { if (cid.endsWith('Ⅲ')) return 4; if (cid.endsWith('Ⅱ')) return 3; if (cid.endsWith('Ⅰ')) return 2; return 1; };
        var totalFrags = 0;
        Object.keys(inv).forEach(function (k) { totalFrags += (inv[k] || 0) * getWeight(k); });
        if (totalFrags + gs.player.bp < cost) return { success: false, error: '资源不足，需' + cost + '(碎片+' + totalFrags + ' BP' + gs.player.bp + ')' };
        var remaining = cost;
        Object.keys(inv).sort(function(a,b){ return getWeight(b) - getWeight(a); }).forEach(function (k) {
            if (remaining <= 0) return;
            while (inv[k] > 0 && remaining > 0) { inv[k] -= 1; remaining -= getWeight(k); }
        });
        if (remaining > 0) { gs.player.bp -= remaining; }
        gs.player[slot].tier += 1; recalcPlayerStats(); save();
        return { success: true, slot: slot, newTier: gs.player[slot].tier, bpCost: Math.max(0, cost - totalFrags) };
    }

    function clearToxicity() {
        var gs = getState(); if (!gs) return { success: false };
        var cost = 50;
        if (gs.player.bp < cost) return { success: false, error: 'BP不足(需' + cost + ')' };
        gs.player.bp -= cost;
        gs.player.toxicity = 0;
        save();
        return { success: true, cost: cost };
    }

    function mutateStat(statType) {
        var gs = getState(); if (!gs) return { success: false };
        var costs = { atk: 800, def: 600, hp: 500 };
        var cost = costs[statType] || 1500;
        if (gs.player.bp < cost) return { success: false, error: 'BP不足(需' + cost + ')' };
        gs.player.bp -= cost;
        // 大幅提升单次突变收益
        if (statType === 'atk') { gs.player.atk += 5; gs.player.atk_base += 5; }
        else if (statType === 'def') { gs.player.def += 5; gs.player.def_base += 5; }
        else if (statType === 'hp') { gs.player.hp_max += 25; gs.player.hp += 25; }
        recalcPlayerStats(); save();
        return { success: true, stat: statType, cost: cost };
    }

    function researchMonster(monsterId) {
        var gs = getState(); if (!gs) return { success: false, error: '未初始化' };
        var currentLevel = gs.bestiary.researchLevels[monsterId] || 0;
        if (currentLevel >= 3) return { success: false, error: '已达最高研究等级' };

        var costs = [500, 1500, 3000];
        var cost = costs[currentLevel];
        if (gs.player.bp < cost) return { success: false, error: 'BP 不足，需 ' + cost };

        gs.player.bp -= cost;
        gs.bestiary.researchLevels[monsterId] = currentLevel + 1;
        save();
        return { success: true, monsterId: monsterId, newLevel: currentLevel + 1, cost: cost };
    }

    function syncOrgan(organId) {
        var gs = getState(); if (!gs) return { success: false, error: '未初始化' };
        var inv = gs.inventory;
        var currentSync = inv.organSyncLevels[organId] || 1;
        if (currentSync >= 3) return { success: false, error: '已达最高同调等级' };

        // 检查是否有至少 2 个同名器官（1个装备中+1个在背包，或者2个都在背包）
        var countInInv = inv.organs.filter(function(id) { return id === organId; }).length;
        var isEquipped = [gs.player.predatory_organ.equipped, gs.player.chitin_epidermis.equipped, gs.player.gland_core.equipped].indexOf(organId) !== -1;
        var totalCount = countInInv + (isEquipped ? 1 : 0);

        if (totalCount < 2) return { success: false, error: '同名器官不足 (需2个)' };

        var bpCosts = [0, 2000, 5000]; // 从 Lv.1 升 Lv.2 需 2000，从 Lv.2 升 Lv.3 需 5000
        var cost = bpCosts[currentSync];
        if (gs.player.bp < cost) return { success: false, error: 'BP 不足，需 ' + cost };

        // 消耗掉一个背包中的器官（优先消耗背包，未装备的）
        var idx = inv.organs.indexOf(organId);
        if (idx === -1) return { success: false, error: '背包中未找到该器官' };
        inv.organs.splice(idx, 1);

        gs.player.bp -= cost;
        inv.organSyncLevels[organId] = currentSync + 1;

        recalcPlayerStats();
        save();
        return { success: true, organId: organId, newLevel: currentSync + 1, cost: cost };
    }

    function startNextLoop() {
        var gs = getState(); if (!gs) return;
        // 保留玩家属性 (p)、背包 (inventory)、图鉴 (bestiary)
        // 仅重置地图状态
        var loop = (gs.mapState.loop || 1) + 1;
        gs.mapState = {
            currentRoom: { type: 'camp', label: '源初母巢', desc: '你在更深层的震动中睁开双眼。原体感官已完全不同。' },
            currentFloor: 1,
            floorNodePool: [],
            bossDefeated: false,
            portalUnlocked: false,
            stepsTaken: 0,
            introSeen: true,
            completedTasks: [],
            mapLevel: 1,
            loop: loop
        };
        gs.mapState.floorNodePool = _genFloorNodePool(1, gs);
        gs.mapState.discoveryPaths = _genDiscoveryPaths(gs);
        save();
        return gs;
    }

    return {
        init: init, save: save, reset: reset, startNextLoop: startNextLoop,
        getState: getState, calcDamageReduction: calcDamageReduction,
        recalcPlayerStats: recalcPlayerStats, equipOrgan: equipOrgan, upgradeOrganTier: upgradeOrganTier,
        upgradeOrganTierWithSelection: upgradeOrganTierWithSelection,
        socketComponent: socketComponent, unloadComponent: unloadComponent,
        gainXp: gainXp, learnMastery: learnMastery, resetMastery: resetMastery,
        craftPotion: craftPotion, craftPotionWithSelection: craftPotionWithSelection,
        applyCoating: applyCoating, applyCoatingWithSelection: applyCoatingWithSelection,
        exportSaveText: exportSaveText, importSaveText: importSaveText,
        saveToSlot: saveToSlot, loadFromSlot: loadFromSlot, deleteSlot: deleteSlot, listSlots: listSlots,
        getMapLevelScaling: getMapLevelScaling,
        buyComponent: buyComponent, upgradeOrganTierWithBP: upgradeOrganTierWithBP,
        clearToxicity: clearToxicity, mutateStat: mutateStat,
        researchMonster: researchMonster, syncOrgan: syncOrgan,
        _genDiscoveryPaths: _genDiscoveryPaths,
        _genFloorNodePool: _genFloorNodePool
    };
})();
