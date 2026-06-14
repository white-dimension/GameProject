/**
 * Data.js — v2.0 全量静态数据库
 * 怪物图鉴 / 器官 / Component碎片 / 魔药 / 涂层 / 专精
 */

window.GameData = (function () {
    'use strict';

    // =========================================================================
    // 1. 种族枚举
    // =========================================================================
    const RACE = {
        MUTANT: 'mutant',
        SWARM: 'swarm',
        EMBER: 'ember'
    };

    // =========================================================================
    // 2. 怪物图鉴数据库（15种，3族 × 5）
    // =========================================================================
    const MONSTERS = {
        // —— <span class="icon icon-dna"></span> 异变者生态群 ——
        MON_CH1_ZOMBIE: {
            id: 'MON_CH1_ZOMBIE',
            name: '实验室废弃体',
            race: RACE.MUTANT,
            tier: 'common',
            level: 1,
            hp: 30,
            atk: 8,
            def: 2,
            intents: [
                { type: 'physical', label: '<span class="icon icon-sword-clash"></span> 物理撕裂', value: 8, desc: '造成 8 点物理撕裂' }
            ],
            weakness: '基础肉体，无特殊抗性。',
            drop: { type: 'component', id: '变异组织', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH1_RIOT: {
            id: 'MON_CH1_RIOT',
            name: '暴动实验体',
            race: RACE.MUTANT,
            tier: 'common',
            level: 3,
            hp: 55,
            atk: 12,
            def: 4,
            intents: [
                { type: 'physical', label: '<span class="icon icon-dripping-blade"></span> 物理+流血', value: 12, desc: '造成 12 点物理伤害并施加 3 回合流血', bleed: { duration: 3, damage: 4 } }
            ],
            weakness: '建议使用毒素攻击无视其流血抗性。装配生物表皮护盾可有效防御。',
            drop: { type: 'component', id: '变异组织', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH1_CLEANER: {
            id: 'MON_CH1_CLEANER',
            name: '异化保洁员',
            race: RACE.MUTANT,
            tier: 'elite',
            level: 5,
            hp: 90,
            atk: 24,
            def: 8,
            intents: [
                { type: 'charge', label: '<span class="icon icon-flanged-mace"></span> 蓄力横扫', value: 24, desc: '蓄力横扫，下回合造成 24 点物理重砸', chargeTurns: 1 }
            ],
            weakness: '动作极其缓慢，可在其蓄力回合使用【神经阻断减速剂】进行打断。',
            drop: { type: 'component', id: '异变肌肉束', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_GUARD: {
            id: 'MON_CH1_GUARD',
            name: '受损生化卫兵',
            race: RACE.MUTANT,
            tier: 'elite',
            level: 8,
            hp: 140,
            atk: 16,
            def: 20,
            intents: [
                { type: 'shield', label: '<span class="icon icon-energy-shield"></span> 生物硬壳护盾', value: 20, desc: '自身获得 20 点生物硬壳护盾' }
            ],
            weakness: '高防御低攻击。涂抹【细胞壁溶解酶涂层】或使用毒素攻击可迅速击破。',
            drop: { type: 'component', id: '异变肌肉束', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_TYRANT: {
            id: 'MON_CH1_TYRANT',
            name: '一号实验体：暴君',
            race: RACE.MUTANT,
            tier: 'world_boss',
            level: 15,
            hp: 400,
            atk: 45,
            def: 30,
            physicalResist: 0.5,
            intents: [
                { type: 'physical', label: '<span class="icon icon-sword-clash"></span> 物理重击', value: 45, desc: '造成 45 点物理伤害' },
                { type: 'enrage', label: '<span class="icon icon-enrage"></span> 狂怒', value: 2.0, desc: '第 30 回合强制触发狂怒，攻击力永久提升至 2.0 倍', triggerTurn: 30 }
            ],
            weakness: '极度危险。皮肤免疫 50% 物理伤害。战前必须前往生物炼金釜配置【野性狂暴血清】进行速杀；战斗中先用捕食打击挂毒，再用腺体脉冲打出基因融毁爆破。',
            drop: { type: 'organ', id: '暴君核心', chance: 1.0 },
            bpReward: [100, 100]
        },

        // —— 🦟 寄生群落生态群 ——
        MON_CH1_RAT: {
            id: 'MON_CH1_RAT',
            name: '变异实验鼠',
            race: RACE.SWARM,
            tier: 'common',
            level: 1,
            hp: 25,
            atk: 10,
            def: 1,
            intents: [
                { type: 'physical', label: '<span class="icon icon-spiked-mace"></span> 穿透物理', value: 10, desc: '造成 10 点穿透物理伤害' }
            ],
            weakness: '外壳薄弱，防御器官的电磁反伤可瞬间将其震碎。',
            drop: { type: 'component', id: '毒囊材料', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH1_LARVA: {
            id: 'MON_CH1_LARVA',
            name: '实验舱幼体',
            race: RACE.SWARM,
            tier: 'common',
            level: 2,
            hp: 35,
            atk: 14,
            def: 2,
            intents: [
                { type: 'toxin', label: '<span class="icon icon-poison-gas"></span> 神经毒素', value: 14, desc: '喷射酸液，造成 14 点持续神经毒素' }
            ],
            weakness: '免疫毒素，但外壳薄弱。使用纯物理攻击可轻松击破。',
            drop: { type: 'component', id: '毒囊材料', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH1_SPORE: {
            id: 'MON_CH1_SPORE',
            name: '孢子蔓延者',
            race: RACE.SWARM,
            tier: 'elite',
            level: 6,
            hp: 100,
            atk: 6,
            def: 6,
            drugResist: 0.5,
            intents: [
                { type: 'drain', label: '<span class="icon icon-leeching-worm"></span> 寄生吸取', value: 6, desc: '播撒寄生菌，每回合吸取原体 6 点生命值' }
            ],
            weakness: '具有极高的耐药性，药剂对其效果递减 50%。必须依赖防御器官的电磁反伤造成基因融毁。',
            drop: { type: 'component', id: '活性孢子', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_HIVE: {
            id: 'MON_CH1_HIVE',
            name: '母体蜂群',
            race: RACE.SWARM,
            tier: 'elite',
            level: 7,
            hp: 120,
            atk: 5,
            def: 4,
            intents: [
                { type: 'summon', label: '<span class="icon icon-alien-bug"></span> 召唤工蜂', value: 3, desc: '召唤 3 只工蜂协助攻击，每只提供 5 点连击伤害', summonCount: 3, summonDamage: 5 }
            ],
            weakness: '外壳薄弱，极度惧怕异变者的捕食打击。建议装配【源初毁灭者】进行碾压。',
            drop: { type: 'component', id: '活性孢子', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_QUEEN: {
            id: 'MON_CH1_QUEEN',
            name: '畸变蜂后',
            race: RACE.SWARM,
            tier: 'world_boss',
            level: 15,
            hp: 380,
            atk: 30,
            def: 15,
            intents: [
                { type: 'spawn', label: '<span class="icon icon-egg-clutch"></span> 产卵孵化', value: 0, desc: '每 3 回合产卵孵化一波怪潮，蜂后自身获得 100% 闪避', spawnInterval: 3, dodgeRate: 1.0, defenseZero: true }
            ],
            weakness: '产卵期间防御力归零，必须在其产卵意图亮起时，用腺体脉冲打出基因融毁爆破以终止其孵化。',
            drop: { type: 'organ', id: '蜂后髓核', chance: 1.0 },
            bpReward: [100, 100]
        },

        // —— 🤖 机械余烬生态群 ——
        MON_CH1_CLEANER_ROBOT: {
            id: 'MON_CH1_CLEANER_ROBOT',
            name: '报废清理机',
            race: RACE.EMBER,
            tier: 'common',
            level: 1,
            hp: 35,
            atk: 6,
            def: 6,
            bleedImmune: true,
            intents: [
                { type: 'physical', label: '<span class="icon icon-cog"></span> 物理+防御', value: 6, desc: '造成 6 点物理伤害，且自身防御力+6', selfDefBuff: 6 }
            ],
            weakness: '物理装甲极厚，捕食打击几乎刮痧。先用捕食打击挂毒，再用腺体脉冲触发毒素自溶，无视防御。',
            drop: { type: 'component', id: '纳米破片', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH1_WATCHER: {
            id: 'MON_CH1_WATCHER',
            name: '监控者幼体',
            race: RACE.EMBER,
            tier: 'common',
            level: 2,
            hp: 30,
            atk: 4,
            def: 3,
            bleedImmune: true,
            intents: [
                { type: 'scan', label: '<span class="icon icon-radar-sweep"></span> 进程干扰', value: 1, desc: '扫描原体，使其下一回合的器官卡牌费用（RAM）全部+1', ramPenalty: 1 }
            ],
            weakness: '优先击杀目标。建议在第一回合保留 3 点 RAM 直接用卡牌将其秒杀。',
            drop: { type: 'component', id: '纳米破片', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH1_BEE: {
            id: 'MON_CH1_BEE',
            name: '失控巡逻蜂',
            race: RACE.EMBER,
            tier: 'elite',
            level: 6,
            hp: 95,
            atk: 14,
            def: 10,
            bleedImmune: true,
            recoilDamage: 5,
            intents: [
                { type: 'electric', label: '<span class="icon icon-lightning-arc"></span> 高压电弧', value: 14, desc: '释放 14 点高压电弧伤害' }
            ],
            weakness: '电磁过载。玩家释放任何消耗 RAM 的技能时，其生物外壳都会受到 5 点反噬伤害。',
            drop: { type: 'component', id: '高压电缆碎片', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_SENTINEL: {
            id: 'MON_CH1_SENTINEL',
            name: '组装哨兵',
            race: RACE.EMBER,
            tier: 'elite',
            level: 9,
            hp: 160,
            atk: 32,
            def: 18,
            bleedImmune: true,
            intents: [
                { type: 'charge', label: '<span class="icon icon-targeting"></span> 锁定发射', value: 32, desc: '锁定发射：下回合造成 32 点巨额能量冲击', chargeTurns: 1, immuneToPhysicalCC: true }
            ],
            weakness: '蓄力期间免疫一切物理控制。唯一的解法是使用寄生群落的毒素挂毒，利用毒素自溶在蓄力期强行削减其血线。',
            drop: { type: 'component', id: '高压电缆碎片', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_CORE: {
            id: 'MON_CH1_CORE',
            name: '安保系统核心',
            race: RACE.EMBER,
            tier: 'world_boss',
            level: 15,
            hp: 400,
            atk: 25,
            def: 40,
            bleedImmune: true,
            shieldPerTurn: 200,
            intents: [
                { type: 'shield', label: '<span class="icon icon-magic-shield"></span> 高能真菌护盾', value: 200, desc: '每回合开始时获得 200 点高能真菌护盾（最大 HP 的 50%）' }
            ],
            weakness: '机械终极体。护盾未破时一切物理和反伤对其无效。战前装配双专精【电子真菌】触发电荷偏转免 RAM，囤积上限 RAM 后连续打出腺体脉冲爆破撕裂护盾，方可融毁核心。',
            drop: { type: 'organ', id: '高能电泳核', chance: 1.0 },
            bpReward: [100, 100]
        }
    };

    // =========================================================================
    // 3. Component 碎片数据库
    // =========================================================================
    const COMPONENTS = {
        '变异组织': {
            id: '变异组织',
            allowedSlots: ['predatory_organ'],
            affixes: {
                atkBonus: 3,
                bonusVsSwarm: 0.10
            }
        },
        '异变肌肉束': {
            id: '异变肌肉束',
            allowedSlots: ['predatory_organ'],
            affixes: {
                armorPenetration: 0.15,
                physMultiplier: 1.20
            }
        },
        '毒囊材料': {
            id: '毒囊材料',
            allowedSlots: ['predatory_organ', 'gland_core'],
            affixes: {
                toxinConversion: 0.10,
                dotBonus: 2
            }
        },
        '活性孢子': {
            id: '活性孢子',
            allowedSlots: ['gland_core'],
            affixes: {
                lifeDrainChance: 0.25,
                lifeDrainAmount: 5
            }
        },
        '纳米破片': {
            id: '纳米破片',
            allowedSlots: ['chitin_epidermis'],
            affixes: {
                flatDefBonus: 2,
                shieldBonus: 15
            }
        },
        '高压电缆碎片': {
            id: '高压电缆碎片',
            allowedSlots: ['chitin_epidermis'],
            affixes: {
                thornsPercent: 0.20,
                thornsType: 'electric'
            }
        }
    };

    // =========================================================================
    // 4. Boss 独占突变体器官
    // =========================================================================
    const BOSS_ORGANS = {
        '暴君核心': {
            id: '暴君核心',
            slotType: 'predatory_organ',
            tier: 3,
            skillName: '暴君撕裂',
            skillCost: 4,
            skillEffect: { type: 'physical', baseMultiplier: 2.5, armorPenetration: 0.3 }
        },
        '蜂后髓核': {
            id: '蜂后髓核',
            slotType: 'gland_core',
            tier: 2,
            skillName: '畸变群落母体孵化',
            skillCost: 4,
            skillEffect: {
                type: 'summon',
                summonCount: 3,
                drones: { attackMultiplier: 0.3, duration: 5 },
                hordeRule: '每只工蜂直接消灭 Math.ceil(p.atk * 0.3) 只小怪，不计算防御力'
            }
        },
        '高能电泳核': {
            id: '高能电泳核',
            slotType: 'gland_core',
            tier: 3,
            skillName: '电弧过载风暴',
            skillCost: 5,
            skillEffect: { type: 'electric', baseMultiplier: 2.0, chainTargets: 3 }
        }
    };

    // =========================================================================
    // 5. 魔药数据库
    // =========================================================================
    const POTIONS = {
        POT_BERSERK: {
            id: 'POT_BERSERK',
            name: '野性狂暴血清',
            toxicity: 35,
            effect: { type: 'atkBoost', value: 0.50, desc: '攻击力暴增 50%' },
            sideEffect: { type: 'hpDrain', value: 0.01, desc: '每回合强制扣除 1% 最大生命值' }
        },
        POT_ANTIDOTE: {
            id: 'POT_ANTIDOTE',
            name: '神经阻断减速剂',
            toxicity: 20,
            effect: { type: 'delayIntent', value: 1, desc: '强制让当前怪物的下一回合行动意图延后 1 个回合' },
            sideEffect: { type: 'ramBlock', desc: '释放回合无法获得 RAM 积累加成' }
        },
        POT_SHIELD_CORE: {
            id: 'POT_SHIELD_CORE',
            name: '离子过载充能液',
            toxicity: 25,
            effect: { type: 'shield', value: 0.30, desc: '获得相当于最大生命值 30% 的科技护盾' },
            sideEffect: { type: 'toxinResistDebuff', value: 0.20, desc: '毒素抗性降低 20%' }
        }
    };

    // =========================================================================
    // 6. 基因涂层数据库
    // =========================================================================
    const COATINGS = {
        COAT_ANTI_MUTANT: {
            id: 'COAT_ANTI_MUTANT',
            name: '细胞壁溶解酶涂层',
            cost: { '变异组织': 3 },
            targetRace: RACE.MUTANT,
            effect: { damageBonus: 0.50, ignoreDefense: true },
            duration: 100
        },
        COAT_ANTI_SWARM: {
            id: 'COAT_ANTI_SWARM',
            name: '生物自溶催化剂',
            cost: { '毒囊材料': 3 },
            targetRace: RACE.SWARM,
            effect: { toxinBonus: 0.40, toxinImmune: true },
            duration: 100
        },
        COAT_ANTI_EMBER: {
            id: 'COAT_ANTI_EMBER',
            name: '电磁短路脉冲液',
            cost: { '纳米破片': 3 },
            targetRace: RACE.EMBER,
            effect: { shieldStrip: 30, stripChance: 1.0 },
            duration: 100
        }
    };

    // =========================================================================
    // 7. 双专精定义
    // =========================================================================
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
            statsPerPoint: { hp_max: 2, def: 1.0, ram_max: 0.5 },
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
            passiveDesc: '受击时 40% 概率大范围毒素播撒',
            color: 'var(--accent-purple)'
        },
        'ember+mutant': {
            name: '钢骨原体',
            passive: '动能回馈',
            passiveDesc: '防御减免值 100% 转化为护盾，免疫一切流血',
            color: 'var(--accent-blue)'
        },
        'swarm+swarm': {
            name: '瘟疫主宰',
            passive: '无限蚀骨',
            passiveDesc: '敌方毒素抗性 -30%，毒素自溶每回合 5%→8%',
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
            passiveDesc: '每回合释放雷电链，随机对 3 只怪物造成 防御×2.0 电离伤害',
            color: 'var(--accent-blue)'
        }
    };

    // =========================================================================
    // 8. 阶位进阶消耗计算
    // =========================================================================
    function calcTierUpgradeCost(currentTier) {
        const baseCost = 5;
        return Math.ceil(baseCost * Math.pow(1.6, currentTier));
    }

    // =========================================================================
    // 9. 流动状态常数
    // =========================================================================
    const STATUS_CONSTANTS = {
        bleed: { damagePerTurn: 4 },
        ramRecoveryPerTurn: 3,
        ramMax: 10,
        encounterChance: 0.03,
        counterBonus: 0.5
    };

    // =========================================================================
    // 10. 新手引导内容
    // =========================================================================
    const TUTORIALS = {
        fight: {
            title: '战斗协议引导',
            sections: [
                { key: '1', label: '捕食打击', desc: '消耗 2 进程，造成 ATK 点物理伤害，30% 概率施加毒素标记', color: 'var(--accent-red)' },
                { key: '2', label: '生物防御', desc: '消耗 3 进程，获得 ATK×0.6 点科技护盾吸收伤害', color: 'var(--accent-green)' },
                { key: '3', label: '腺体脉冲', desc: '消耗 3 进程，中毒目标 ATK×3 爆破 + 100% 吸血；无中毒则仅轻微酸蚀', color: 'var(--accent-yellow)' },
                { key: '4~6', label: '魔药', desc: '快捷键使用携带的炼金魔药（野性狂暴/神经阻断/离子过载），不消耗进程', color: 'var(--accent-purple)' },
                { key: 'Tab', label: '切换目标', desc: '在多怪物战斗中按 Tab 切换攻击目标，也可鼠标点击怪物卡片', color: 'var(--accent-blue)' },
                { key: 'Space', label: '结束回合', desc: '回复 3 进程，观看怪物行动。战斗胜利后按此键退出战场', color: 'var(--accent-orange)' },
                { key: 'E', label: '紧急切断', desc: '消耗 4 进程脱离战斗，精英 75%/Boss 40% 成功率，无战利品', color: 'var(--accent-red)' }
            ],
            tip: '核心连招：先用 [1] 捕食打击给怪物上毒，再用 [3] 腺体脉冲引爆造成 3 倍伤害并吸血。'
        },
        lab: {
            title: '基因重组实验室引导',
            sections: [
                { label: '器官进阶', desc: '消耗任意组件提升器官阶位（5×1.6^阶），无关组件类型，总数够即可', color: 'var(--accent-green)' },
                { label: '组件镶嵌', desc: '击败怪物掉落组件，点击空槽旁 + 装备。卸载花费 10 基因点数', color: 'var(--accent-green)' },
                { label: '合成', desc: '3 个任意组件 → 1 个随机新组件，废品回收利用', color: 'var(--accent-yellow)' },
                { label: '魔药炼制', desc: '消耗组件炼制战斗药剂（最多 3 瓶），注意毒性累积。连用同种药效递减', color: 'var(--accent-purple)' },
                { label: '涂层涂抹', desc: '消耗特定组件为捕食器官涂抹基因涂层，100 回合内针对特定种族造成额外伤害', color: 'var(--accent-yellow)' }
            ],
            tip: '优先进阶捕食器官提升攻击力。多余组件可在库存区合成升级（3个相同=词条翻倍版）。'
        },
        stats: {
            title: '核心机制说明',
            sections: [
                { key: '<span class="icon icon-health"></span>', label: '生命', desc: '基础 100。器官阶位、组件词条、专精流派均可提升上限。战斗中归零即死亡，回到母巢重组。营地可回满。', color: 'var(--accent-red)' },
                { key: '<span class="icon icon-lightning-arc"></span>', label: '进程', desc: '基础 10，上限可扩至 15。每回合回复 3 点，未用完的积攒到下一回合。技能卡牌消耗 2~5 点，不足则灰色不可用。', color: 'var(--accent-green)' },
                { key: '<span class="icon icon-biohazard"></span>', label: '毒性', desc: '使用魔药会积累毒性。超过 50 时每步/每回合扣 2% 最大生命。营地和遗物节点可清零。毒性条在 HUD 顶部显示。', color: 'var(--accent-purple)' },
                { key: '<span class="icon icon-energy-shield"></span>', label: '护盾', desc: '战斗中临时吸收伤害。使用 [生物防御] 技能获得。护盾耗尽后才扣生命。组件词条"生命+X"提升的是永久生命，非临时护盾。', color: 'var(--accent-blue)' },
                { key: '<span class="icon icon-dna"></span>', label: '基因点数', desc: '击败怪物获得。用途：卸载组件(10点)、重置专精(50点)、死亡惩罚(扣20%)。', color: 'var(--accent-yellow)' },
                { key: '<span class="icon icon-upgrade"></span>', label: '专精系统', desc: '升级获得专精点，投入三大种族之一。每点提供属性加成，选两个种族组成双专精可激活强力全局被动。', color: 'var(--accent-yellow)' },
                { key: '<span class="icon icon-crossed-swords"></span>', label: '种族克制', desc: '异变者克寄生、寄生克机械、机械克异变者。选择专精后自动激活克制：对被克种族 +50% 伤害且无视防御。', color: 'var(--accent-yellow)' },
                { key: '<span class="icon icon-dungeon-light"></span>', label: '楼层进度', desc: '每层有固定数量的探索节点。底部信息条显示当前楼层(B1~B4)和已探索进度。清掉 ≥60% 节点后领主出现，击败领主解锁传送门进入下一层。', color: 'var(--accent-blue)' },
                { key: '<span class="icon icon-archive"></span>', label: '界面布局', desc: 'HUD 顶部显示生命/进程/毒性/等阶四条。右上角「?」打开本手册。底部操作栏：实验室、档案、图鉴、存档。', color: 'var(--accent-blue)' }
            ],
            tip: '底部信息条显示当前楼层和探索进度。清掉大部分节点后领主出现，击败即可推进。'
        },
        craft: {
            title: '合成配方表',
            sections: [
                { label: '合成规则', desc: '选择任意 3 个组件。3 个相同 → 升级（Ⅰ→Ⅱ→Ⅲ，词条倍增）。3 个不同 → 随机新组件。', color: 'var(--accent-yellow)' },
                { label: '变异组织 ×3', desc: '→ 变异组织Ⅰ  【攻击+6 · 对寄生+20%】', color: 'var(--accent-red)' },
                { label: '异变肌肉束 ×3', desc: '→ 异变肌肉束Ⅰ  【破甲30% · 物理×1.4】', color: 'var(--accent-red)' },
                { label: '毒囊材料 ×3', desc: '→ 毒囊材料Ⅰ  【毒素转化20% · 毒伤+4】', color: 'var(--accent-purple)' },
                { label: '活性孢子 ×3', desc: '→ 活性孢子Ⅰ  【吸血50% · 每次吸10HP】', color: 'var(--accent-green)' },
                { label: '纳米破片 ×3', desc: '→ 纳米破片Ⅰ  【防御+4 · 生命+30】', color: 'var(--accent-blue)' },
                { label: '高压电缆碎片 ×3', desc: '→ 高压电缆碎片Ⅰ  【反伤40% · 电磁】', color: 'var(--accent-blue)' },
                { label: '涂层配方', desc: '变异组织×3 → 细胞壁溶解酶 | 毒囊材料×3 → 生物自溶催化剂 | 纳米破片×3 → 电磁短路脉冲液', color: 'var(--accent-yellow)' }
            ],
            tip: '3 个相同 = 升级版（词条×2），3 个不同 = 随机新组件。合成在实验室页面的组件库存区操作。'
        }
    };

    // =========================================================================
    // 公开 API
    // =========================================================================
    return {
        RACE: RACE,
        MONSTERS: MONSTERS,
        COMPONENTS: COMPONENTS,
        BOSS_ORGANS: BOSS_ORGANS,
        POTIONS: POTIONS,
        COATINGS: COATINGS,
        MASTERIES: MASTERIES,
        DUAL_CLASSES: DUAL_CLASSES,
        STATUS_CONSTANTS: STATUS_CONSTANTS,
        TUTORIALS: TUTORIALS
    };
})();
