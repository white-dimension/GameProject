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

    const RACE_LORE = {
        mutant: '由「原生质分裂计划」导致的血肉失控产物。它们通过疯狂的细胞增殖来抵御严寒，每一个褶皱里都流淌着渴望同化的贪婪。在终端记录中，异变者被标记为最原始的威胁，其物理撕裂能力能轻易粉碎防护服。',
        swarm: '这些被称为「毒蛾」的寄生生物并非自然演化，而是实验室废弃培养皿中的二次寄生。它们散播致幻的孢子与酸性毒素，能直接渗透进原体的神经突触。由于其极小的个体体积，机械防御对其收效甚微。',
        ember: 'Rogue AI「余烬」在闸门锁死后，通过纳米真菌接管了所有的安保无人机与清理机器人。它们执行着逻辑冰冷的「格式化」程序，试图用高能电弧清理实验室内的一切有机残留。由于其金属构造，传统的物理打击极难穿透。'
    };

    // =========================================================================
    // 2. 怪物图鉴数据库
    // =========================================================================
    const MONSTERS = {
        // —— 🧬 异变者生态群 ——
        MON_CH1_ZOMBIE: {
            id: 'MON_CH1_ZOMBIE',
                        icon: 'mon_ch1_zombie',
            image: '../Assets/Monsters/实验室废弃体.png',
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
                        icon: 'mon_ch1_riot',
            image: '../Assets/Monsters/暴动实验体.png',
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
            drop: { type: 'component', id: '肾上腺素晶体', chance: 0.5 },
            bpReward: [2, 5]
        },
        MON_CH1_CLEANER: {
            id: 'MON_CH1_CLEANER',
                        icon: 'mon_ch1_cleaner',
            image: '../Assets/Monsters/异化保洁员.png',
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
                        icon: 'mon_ch1_guard',
            image: '../Assets/Monsters/受损生化卫兵.png',
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
            drop: { type: 'component', id: '不死细胞核', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_TYRANT: {
            id: 'MON_CH1_TYRANT',
                        icon: 'mon_ch1_tyrant',
            name: '一号实验体：暴君',
            race: RACE.MUTANT,
            tier: 'world_boss',
            image: '../Assets/Monsters/暴君（一号实验体）.png',
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
            drop: { type: 'organ', pool: 'MON_CH1_TYRANT', chance: 1.0 },
            bpReward: [100, 100]
        },

        // —— 🦟 寄生群落生态群 ——
        MON_CH1_RAT: {
            id: 'MON_CH1_RAT',
                        icon: 'mon_ch1_rat',
            image: '../Assets/Monsters/变异实验鼠.png',
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
                        icon: 'mon_ch1_larva',
            image: '../Assets/Monsters/实验舱幼体.png',
            name: '实验舱幼体',
            race: RACE.SWARM,
            tier: 'common',
            level: 2,
            hp: 35,
            atk: 14,
            def: 2,
            intents: [
                { type: 'toxin', label: '<span class="icon icon-poison-gas"></span> 毒素侵蚀', value: 14, desc: '喷射酸液，造成 14 点持续毒素伤害' }
            ],
            weakness: '免疫毒素，但外壳薄弱。使用纯物理攻击可轻松击破。',
            drop: { type: 'component', id: '毒囊材料', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH1_SPORE: {
            id: 'MON_CH1_SPORE',
                        icon: 'mon_ch1_spore',
            image: '../Assets/Monsters/孢子蔓延者.png',
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
                        icon: 'mon_ch1_hive',
            image: '../Assets/Monsters/母体蜂群.png',
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
            drop: { type: 'component', id: '几丁质装甲', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_QUEEN: {
            id: 'MON_CH1_QUEEN',
                        icon: 'mon_ch1_queen',
            name: '畸变蜂后',
            race: RACE.SWARM,
            tier: 'world_boss',
            image: '../Assets/Monsters/蜂后（畸变蜂后）.png',
            level: 15,
            hp: 380,
            atk: 30,
            def: 15,
            intents: [
                { type: 'spawn', label: '<span class="icon icon-egg-clutch"></span> 产卵孵化', value: 0, desc: '每 3 回合产卵孵化一波怪潮，蜂后自身获得 100% 闪避', spawnInterval: 3, dodgeRate: 1.0, defenseZero: true }
            ],
            weakness: '产卵期间防御力归零，必须在其产卵意图亮起时，用腺体脉冲打出基因融毁爆破以终止其孵化。',
            drop: { type: 'organ', pool: 'MON_CH1_QUEEN', chance: 1.0 },
            bpReward: [100, 100]
        },

        // —— 🤖 机械余烬生态群 ——
        MON_CH1_CLEANER_ROBOT: {
            id: 'MON_CH1_CLEANER_ROBOT',
                        icon: 'mon_ch1_cleaner_robot',
            image: '../Assets/Monsters/报废清理机.png',
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
            weakness: '物理装甲极厚，捕食打击几乎刮痧。先用捕食打击挂毒，再用腺体脉冲触发毒素发作，无视防御。',
            drop: { type: 'component', id: '纳米破片', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH1_WATCHER: {
            id: 'MON_CH1_WATCHER',
                        icon: 'mon_ch1_watcher',
            image: '../Assets/Monsters/监控者幼体.png',
            name: '监控者幼体',
            race: RACE.EMBER,
            tier: 'common',
            level: 2,
            hp: 30,
            atk: 4,
            def: 3,
            bleedImmune: true,
            intents: [
                { type: 'scan', label: '进程干扰', value: 1, desc: '扫描原体，使其下一回合的器官卡牌费用（进程）全部+1', ramPenalty: 1 }
            ],
            weakness: '优先击杀目标。建议在第一回合保留 3 点进程直接用卡牌将其秒杀。',
            drop: { type: 'component', id: '纳米破片', chance: 0.6 },
            bpReward: [2, 5]
        },

        // —— v3.7 新增变异体 ——
        MON_CH1_AMALGAM: {
            id: 'MON_CH1_AMALGAM',
                        icon: 'mon_ch1_amalgam',
            image: '../Assets/Monsters/变异融合体.png',
            name: '变异融合体',
            race: RACE.MUTANT,
            tier: 'common',
            level: 3,
            hp: 45,
            atk: 14,
            def: 3,
            intents: [
                { type: 'physical', label: '<span class="icon icon-sword-clash"></span> 多重撕裂', value: 14, desc: '造成 14 点物理撕裂伤害' }
            ],
            weakness: '多肢体攻击速度快，但个体脆弱。高攻击可快速秒杀。',
            drop: { type: 'component', id: '变异组织', chance: 0.6 },
            bpReward: [3, 6]
        },
        MON_CH1_MOTH: {
            id: 'MON_CH1_MOTH',
                        icon: 'mon_ch1_moth',
            image: '../Assets/Monsters/毒素飞蛾.png',
            name: '毒素飞蛾',
            race: RACE.SWARM,
            tier: 'common',
            level: 3,
            hp: 32,
            atk: 12,
            def: 2,
            intents: [
                { type: 'toxin', label: '<span class="icon icon-poison-gas"></span> 毒粉播撒', value: 12, desc: '播撒毒粉，造成 12 点毒素伤害' }
            ],
            weakness: '极度脆弱，物理攻击一击即可粉碎。',
            drop: { type: 'component', id: '解毒酶结晶', chance: 0.6 },
            bpReward: [3, 6]
        },
        MON_CH1_DRONE: {
            id: 'MON_CH1_DRONE',
                        icon: 'mon_ch1_drone',
            image: '../Assets/Monsters/电弧无人机.png',
            name: '电弧无人机',
            race: RACE.EMBER,
            tier: 'common',
            level: 3,
            hp: 33,
            atk: 8,
            def: 5,
            bleedImmune: true,
            recoilDamage: 5,
            intents: [
                { type: 'electric', label: '<span class="icon icon-lightning-arc"></span> 电击脉冲', value: 8, desc: '释放 8 点电击脉冲伤害' }
            ],
            weakness: '机械外壳薄弱，毒素攻击无视其防御。',
            drop: { type: 'component', id: '纳米破片', chance: 0.6 },
            bpReward: [3, 6]
        },

        MON_CH1_BEE: {
            id: 'MON_CH1_BEE',
                        icon: 'mon_ch1_bee',
            image: '../Assets/Monsters/失控巡逻蜂.png',
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
            weakness: '电磁过载。玩家释放任何消耗进程的技能时，其生物外壳都会受到 5 点反噬伤害。',
            drop: { type: 'component', id: '高压电缆碎片', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_SENTINEL: {
            id: 'MON_CH1_SENTINEL',
                        icon: 'mon_ch1_sentinel',
            image: '../Assets/Monsters/组装哨兵.png',
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
            weakness: '蓄力期间免疫一切物理控制。唯一的解法是使用寄生群落的毒素挂毒，利用毒素发作在蓄力期强行削减其血线。',
            drop: { type: 'component', id: '电磁催化剂', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_CORE: {
            id: 'MON_CH1_CORE',
                        icon: 'mon_ch1_core',
            name: '安保系统核心',
            race: RACE.EMBER,
            tier: 'world_boss',
            image: '../Assets/Monsters/安保核心（高能电泳核）.png',
            level: 15,
            hp: 400,
            atk: 25,
            def: 40,
            bleedImmune: true,
            shieldPerTurn: 80,
            intents: [
                { type: 'shield', label: '<span class="icon icon-magic-shield"></span> 高能真菌护盾', value: 200, desc: '每回合开始时获得 200 点高能真菌护盾（最大 HP 的 50%）' }
            ],
            weakness: '机械终极体。护盾未破时一切物理和反伤对其无效。战前装配双专精【电子真菌】触发电荷偏转免进程，囤积上限进程后连续打出腺体脉冲爆破撕裂护盾，方可融毁核心。',
            drop: { type: 'organ', pool: 'MON_CH1_CORE', chance: 1.0 },
            bpReward: [100, 100]
        },
        TRAINING_DUMMY_MUTANT: {
            id: 'TRAINING_DUMMY_MUTANT',
            name: '训练人偶·异变',
            hp: 9999, atk: 0, def: 1,
            race: 'mutant', tier: 'common',
            trainingOnly: true,
            intents: [{ type: 'dummy', label: '待命中...' }]
        },
        TRAINING_DUMMY_SWARM: {
            id: 'TRAINING_DUMMY_SWARM',
            name: '训练人偶·寄生',
            hp: 9999, atk: 0, def: 1,
            race: 'swarm', tier: 'common',
            trainingOnly: true,
            intents: [{ type: 'dummy', label: '待命中...' }]
        },
        TRAINING_DUMMY_EMBER: {
            id: 'TRAINING_DUMMY_EMBER',
            name: '训练人偶·机械',
            hp: 9999, atk: 0, def: 1,
            race: 'ember', tier: 'common',
            trainingOnly: true,
            intents: [{ type: 'dummy', label: '待命中...' }]
        },
        // —— v2.1 新怪 ——
        MON_CH2_WORM: {
            id: 'MON_CH2_WORM', name: '腐肉蠕虫',
                        icon: 'mon_ch2_worm',
            image: '../Assets/Monsters/腐肉蠕虫.png',
            race: RACE.SWARM, tier: 'common', level: 2,
            hp: 35, atk: 6, def: 1,
            intents: [
                { type: 'physical', label: '<span class="icon icon-leeching-worm"></span> 酸液喷射', value: 6, desc: '酸液腐蚀，造成 6 点伤害并附带 2 回合中毒', poison: { duration: 2, damage: 3 } }
            ],
            weakness: '攻低血薄，中毒可被 POT_ANTIDOTE 解除。',
            drop: { type: 'component', id: '毒囊材料', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH2_CAMERA: {
            id: 'MON_CH2_CAMERA', name: '监控摄像头',
                        icon: 'mon_ch2_camera',
            image: '../Assets/Monsters/监控摄像头.png',
            race: RACE.EMBER, tier: 'common', level: 2,
            hp: 28, atk: 7, def: 3,
            intents: [
                { type: 'scan', label: '<span class="icon icon-radar-sweep"></span> 扫描标记', value: 0, desc: '扫描玩家弱点，下回合敌人伤害 +30%', ramPenalty: 1 }
            ],
            weakness: '优先秒掉，避免它给其他怪物增益。涂电磁短路涂层克机械。',
            drop: { type: 'component', id: '纳米破片', chance: 0.5 },
            bpReward: [2, 5]
        },
        MON_CH2_GROWTH: {
            id: 'MON_CH2_GROWTH', name: '骨骼增生体',
                        icon: 'mon_ch2_growth',
            image: '../Assets/Monsters/骨骼增生体.png',
            race: RACE.MUTANT, tier: 'common', level: 3,
            hp: 60, atk: 10, def: 8,
            intents: [
                { type: 'shield', label: '<span class="icon icon-magic-shield"></span> 骨甲再生', value: 8, desc: '增生骨板，获得 8 点额外防御' }
            ],
            weakness: '高防低攻，腺体脉冲连招可无视其护甲。',
            drop: { type: 'component', id: '变异组织', chance: 0.5 },
            bpReward: [3, 6]
        },
        MON_CH2_PARASITE: {
            id: 'MON_CH2_PARASITE', name: '神经寄生虫',
                        icon: 'mon_ch2_parasite',
            image: '../Assets/Monsters/神经寄生虫.png',
            race: RACE.SWARM, tier: 'common', level: 3,
            hp: 40, atk: 9, def: 2,
            intents: [
                { type: 'physical', label: '<span class="icon icon-leeching-worm"></span> 神经穿刺', value: 9, desc: '精准穿刺神经节点，造成 9 点伤害', bleed: { duration: 3, damage: 3 } },
                { type: 'stun', label: '<span class="icon icon-time-trap"></span> 神经麻痹', value: 0, desc: '注入神经毒素，玩家下回合技能消耗 +2' }
            ],
            weakness: '攻速快但血薄，生物表皮护盾可有效格挡。',
            drop: { type: 'component', id: '毒囊材料', chance: 0.5 },
            bpReward: [3, 8]
        },
        MON_CH2_VULTURE: {
            id: 'MON_CH2_VULTURE', name: '数据秃鹫',
                        icon: 'mon_ch2_vulture',
            image: '../Assets/Monsters/数据秃鹫.png',
            race: RACE.EMBER, tier: 'common', level: 4,
            hp: 45, atk: 11, def: 4,
            intents: [
                { type: 'physical', label: '<span class="icon icon-targeting"></span> 精确狙击', value: 11, desc: '高精度电磁脉冲，造成 11 点穿甲伤害', armorPen: 0.3 }
            ],
            weakness: '穿甲攻击无视部分防御，需堆高生命上限硬接。',
            drop: { type: 'component', id: '高压电缆碎片', chance: 0.4 },
            bpReward: [5, 10]
        },
        MON_CH2_GHOST: {
            id: 'MON_CH2_GHOST', name: '数据幽灵',
                        icon: 'mon_ch2_ghost',
            image: '../Assets/Monsters/数据幽灵.png',
            race: RACE.EMBER, tier: 'elite', level: 6,
            hp: 110, atk: 18, def: 6,
            dodgeChance: 0.3,
            intents: [
                { type: 'electric', label: '<span class="icon icon-lightning-arc"></span> 电弧冲击', value: 18, desc: '化成电弧穿透防御，造成 18 点电离伤害', ignoreDef: true },
                { type: 'stun', label: '<span class="icon icon-time-trap"></span> 相位干扰', value: 0, desc: '短暂进入亚空间，完全闪避下次攻击', dodge: true }
            ],
            weakness: '闪避高但血少，终焉母核被动可清除闪避。腺体脉冲崩解连招对其极其有效。',
            drop: { type: 'component', id: '神经突触结', chance: 0.5 },
            bpReward: [20, 30]
        },
        MON_CH2_BEAST: {
            id: 'MON_CH2_BEAST', name: '毒雾巨兽',
                        icon: 'mon_ch2_beast',
            image: '../Assets/Monsters/毒雾巨兽.png',
            race: RACE.MUTANT, tier: 'elite', level: 7,
            hp: 180, atk: 22, def: 12,
            intents: [
                { type: 'physical', label: '<span class="icon icon-fanged-skull"></span> 剧毒撕咬', value: 22, desc: '注入高浓度毒液，造成 22 点伤害 + 3 回合猛毒', poison: { duration: 3, damage: 6 } },
                { type: 'physical', label: '<span class="icon icon-hazard-sign"></span> 毒雾喷吐', value: 14, desc: '全场 AOE，对所有目标造成 14 点毒素伤害', aoe: true }
            ],
            weakness: '体型巨大但出招极慢，可在蓄力期间用神经阻断打断。涂细胞壁溶解酶涂层收益极高。',
            drop: { type: 'component', id: '异变肌肉束', chance: 0.5 },
            bpReward: [25, 35]
        },
        MON_CH2_BROODMOTHER: {
            id: 'MON_CH2_BROODMOTHER', name: '腐化母体',
                        icon: 'mon_ch2_broodmother',
            image: '../Assets/Monsters/腐化母体.png',
            race: RACE.SWARM, tier: 'elite', level: 7,
            hp: 150, atk: 16, def: 10,
            intents: [
                { type: 'physical', label: '<span class="icon icon-egg-clutch"></span> 孵化突袭', value: 20, desc: '释放体内寄生幼虫，造成 20 点伤害', spawn: { count: 1, id: 'MON_CH1_LARVA' } },
                { type: 'shield', label: '<span class="icon icon-magic-shield"></span> 茧壳防御', value: 15, desc: '分泌生物质获得 15 点护盾' }
            ],
            weakness: '会召唤幼虫群，优先使用腺体脉冲 AOE 清理。涂生物自溶催化剂免疫毒素反噬。',
            drop: { type: 'component', id: '活性孢子', chance: 0.5 },
            bpReward: [25, 40]
        },
        MON_CH2_CANNON: {
            id: 'MON_CH2_CANNON', name: '脉冲炮台',
                        icon: 'mon_ch2_cannon',
            image: '../Assets/Monsters/脉冲炮台.png',
            race: RACE.EMBER, tier: 'elite', level: 8,
            hp: 130, atk: 26, def: 15,
            intents: [
                { type: 'charge', label: '<span class="icon icon-targeting"></span> 充能锁定', value: 35, desc: '蓄力充能 1 回合后释放高能脉冲，造成 35 点真实伤害', chargeTurns: 1 }
            ],
            weakness: '蓄力期间静止不动，防御力翻倍但可用腺体脉冲崩解连招破甲。逃命吧。',
            drop: { type: 'component', id: '纳米破片', chance: 0.6 },
            bpReward: [30, 45]
        },
        MON_CH2_ABOMINATION: {
            id: 'MON_CH2_ABOMINATION', name: '变异憎恶',
                        icon: 'mon_ch2_abomination',
            image: '../Assets/Monsters/终焉母核.png',
            race: RACE.MUTANT, tier: 'elite', level: 8,
            hp: 240, atk: 30, def: 18,
            thornsPercent: 0.15,
            bleedImmune: true,
            intents: [
                { type: 'physical', label: '<span class="icon icon-spiked-mace"></span> 毁灭重击', value: 30, desc: '造成 30 点物理伤害，附带 15% 反伤' },
                { type: 'enrage', label: '<span class="icon icon-enrage"></span> 基因狂暴', value: 30, desc: 'HP 低于 50% 时触发狂怒，攻击力翻倍' }
            ],
            weakness: '反伤极高，建议挂毒后用腺体脉冲远程引爆吸血对抗。忌用捕食打击正面硬刚。',
            drop: { type: 'component', id: '变异组织', chance: 0.7 },
            bpReward: [35, 50]
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
                bonusVsSwarm: 0.20
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
        },
        // —— v2.1 新词条组件 ——
        '肾上腺素晶体': {
            id: '肾上腺素晶体',
            allowedSlots: ['predatory_organ'],
            affixes: {
                atkBonus: 3,
                killHeal: 8
            }
        },
        '不死细胞核': {
            id: '不死细胞核',
            allowedSlots: ['chitin_epidermis'],
            affixes: {
                shieldBonus: 10,
                deathDefy: true
            }
        },
        '神经突触结': {
            id: '神经突触结',
            allowedSlots: ['gland_core'],
            affixes: {
                processOnHit: 2
            }
        },
        '电磁催化剂': {
            id: '电磁催化剂',
            allowedSlots: ['predatory_organ', 'gland_core'],
            affixes: {
                critChance: 0.15,
                critMultiplier: 1.5
            }
        },
        '解毒酶结晶': {
            id: '解毒酶结晶',
            allowedSlots: ['chitin_epidermis'],
            affixes: {
                defBonus: 2,
                poisonImmune: true
            }
        },
        '原始基因': {
            id: '原始基因',
            allowedSlots: ['predatory_organ', 'chitin_epidermis', 'gland_core'],
            affixes: {
                atkBonus: 3,
                defBonus: 3,
                shieldBonus: 20
            }
        }
    };

    // =========================================================================
    // 4. Boss 独占突变体器官
    // =========================================================================
    const BOSS_ORGANS = {
        // --- 暴君（巨兽/物理撕裂）---
        '暴君核心': {
            id: '暴君核心', slotType: 'predatory_organ', tier: 3, bossSource: 'MON_CH1_TYRANT',
            skillName: '暴君撕裂', skillCost: 4,
            skillEffect: { type: 'physical', baseMultiplier: 2.5, armorPenetration: 0.3, desc: '重型物理撕裂，2.5×倍率，无视30%防御' }
        },
        '暴君甲壳': {
            id: '暴君甲壳', slotType: 'chitin_epidermis', tier: 3, bossSource: 'MON_CH1_TYRANT',
            skillName: '骨板硬化', skillCost: 3,
            skillEffect: { type: 'shield', shieldMultiplier: 1.2, thornsReflect: 0.15, desc: '生成攻击力×1.2护盾，受击反弹15%伤害' }
        },
        '暴君腺体': {
            id: '暴君腺体', slotType: 'gland_core', tier: 3, bossSource: 'MON_CH1_TYRANT',
            skillName: '震波咆哮', skillCost: 5,
            skillEffect: { type: 'physical', baseMultiplier: 2.0, stunChance: 0.4, desc: '2.0×倍率，40%概率使目标跳过下回合' }
        },
        // --- 蜂后（虫群/寄生召唤）---
        '蜂后毒牙': {
            id: '蜂后毒牙', slotType: 'predatory_organ', tier: 3, bossSource: 'MON_CH1_QUEEN',
            skillName: '毒液注射', skillCost: 3,
            skillEffect: { type: 'toxin', baseMultiplier: 1.5, poisonDuration: 5, poisonDamage: 3, desc: '1.5×倍率，施加5回合猛毒（每回合3点）' }
        },
        '蜂后甲壳': {
            id: '蜂后甲壳', slotType: 'chitin_epidermis', tier: 3, bossSource: 'MON_CH1_QUEEN',
            skillName: '幼虫护盾', skillCost: 2,
            skillEffect: { type: 'shield', shieldMultiplier: 0.8, healOnShield: 0.1, desc: '生成攻击力×0.8护盾，护盾存在时每回合回复10%最大HP' }
        },
        '蜂后髓核': {
            id: '蜂后髓核', slotType: 'gland_core', tier: 3, bossSource: 'MON_CH1_QUEEN',
            skillName: '畸变群落母体孵化', skillCost: 4,
            skillEffect: { type: 'summon', baseMultiplier: 3.0, summonCount: 3, desc: '3.0×倍率召唤集群突袭，伤害全额吸血' }
        },
        // --- 安保核心（机械/电弧）---
        '核心钻头': {
            id: '核心钻头', slotType: 'predatory_organ', tier: 3, bossSource: 'MON_CH1_CORE',
            skillName: '超频贯穿', skillCost: 4,
            skillEffect: { type: 'physical', baseMultiplier: 2.0, armorPenetration: 0.5, critChance: 0.2, desc: '2.0×倍率+50%破甲，20%概率暴击（×2伤害）' }
        },
        '核心护盾': {
            id: '核心护盾', slotType: 'chitin_epidermis', tier: 3, bossSource: 'MON_CH1_CORE',
            skillName: '纳米修复场', skillCost: 3,
            skillEffect: { type: 'shield', shieldMultiplier: 0.6, regenPerTurn: 0.05, desc: '生成攻击力×0.6护盾，每回合自动回复5%进程' }
        },
        '高能电泳核': {
            id: '高能电泳核', slotType: 'gland_core', tier: 3, bossSource: 'MON_CH1_CORE',
            skillName: '电弧过载风暴', skillCost: 5,
            skillEffect: { type: 'electric', baseMultiplier: 2.0, chainTargets: 3, desc: '2.0×倍率高压电弧，连锁3个目标' }
        }
    };

    // Boss器官掉落池（每Boss三个槽位各一，随机掉落其一）
    var _bossOrganPools = {
        MON_CH1_TYRANT: ['暴君核心','暴君甲壳','暴君腺体'],
        MON_CH1_QUEEN: ['蜂后毒牙','蜂后甲壳','蜂后髓核'],
        MON_CH1_CORE: ['核心钻头','核心护盾','高能电泳核']
    };
    var _getRandomBossOrgan = function(bossId) {
        var pool = _bossOrganPools[bossId]; if (!pool) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    };

    // =========================================================================
    // 5. 魔药数据库
    // =========================================================================
    const POTIONS = {
        POT_BERSERK: {
            id: 'POT_BERSERK',
            name: '野性狂暴血清',
            toxicity: 25,
            effect: { type: 'atkBoost', value: 0.50, desc: '攻击力暴增 50%' },
            sideEffect: { type: 'hpDrain', value: 0.005, desc: '每回合扣除 0.5% 最大生命值' }
        },
        POT_ANTIDOTE: {
            id: 'POT_ANTIDOTE',
            name: '神经阻断减速剂',
            toxicity: 18,
            effect: { type: 'delayIntent', value: 1, desc: '强制延后怪物行动意图 1 回合（Boss 60% 成功率）' },
            sideEffect: { type: 'ramBlock', desc: '释放回合无法获得进程恢复' }
        },
        POT_SHIELD_CORE: {
            id: 'POT_SHIELD_CORE',
            name: '离子过载充能液',
            toxicity: 20,
            effect: { type: 'shield', value: 0.40, desc: '获得相当于最大生命值 40% 的科技护盾' },
            sideEffect: { type: 'toxResistDebuff', desc: '护盾存在期间，毒素抗性降低 20%' }
        },
        POT_HEAL: {
            id: 'POT_HEAL',
            name: '凝血再生剂',
            toxicity: 18,
            effect: { type: 'heal', value: 0.40, desc: '瞬间恢复最大生命值的 40%' },
            sideEffect: { type: 'defDebuff', value: 0.20, desc: '防御力下降 20%（3回合）' }
        },
        POT_DEFENSE: {
            id: 'POT_DEFENSE',
            name: '角质硬化素',
            toxicity: 22,
            effect: { type: 'defBoost', value: 0.50, desc: '防御力提升 50%' },
            sideEffect: { type: 'atkDebuff', value: 0.20, desc: '攻击力下降 20%（3回合）' }
        },
        POT_RAM: {
            id: 'POT_RAM',
            name: '神经突触催化剂',
            toxicity: 12,
            effect: { type: 'ramRecover', value: 8, desc: '立即回复 8 点进程' },
            sideEffect: { type: 'toxinBurst', value: 5, desc: '额外增加 5 点毒性' }
        }
    };

    // =========================================================================
    // 6. 基因涂层数据库
    // =========================================================================
    const COATINGS = {
        COAT_ANTI_MUTANT: {
            id: 'COAT_ANTI_MUTANT',
            name: '细胞壁溶解酶涂层',
            cost: { '变异组织': 2 },
            targetRace: RACE.MUTANT,
            effect: { damageBonus: 0.50, ignoreDefense: true },
            duration: 100
        },
        COAT_ANTI_SWARM: {
            id: 'COAT_ANTI_SWARM',
            name: '生物自溶催化剂',
            cost: { '毒囊材料': 2 },
            targetRace: RACE.SWARM,
            effect: { toxinBonus: 0.40, toxinImmune: true, damageBonus: 0.20 },
            duration: 100
        },
        COAT_ANTI_EMBER: {
            id: 'COAT_ANTI_EMBER',
            name: '电磁短路脉冲液',
            cost: { '纳米破片': 2 },
            targetRace: RACE.EMBER,
            effect: { shieldStrip: 100, stripChance: 1.0, damageBonus: 0.30 },
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
        processRecoveryPerTurn: 3,
        processMax: 10,
        encounterChance: 0.03,
        counterBonus: 0.5
    };

    // =========================================================================
    // 10. 引导与教学内容
    // =========================================================================
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

    // =========================================================================
    // 11. 局内随机突发事件库 (Random Events)
    // =========================================================================
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
                        // 这里可以设置一个临时标记，由 Combat.js 读取
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
        // —— v2.1 新事件 ——
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

    // =========================================================================
    // 12. 状态效果模板
    // =========================================================================
    var STATUS_TEMPLATES = {
        poison: { id:'poison',name:'毒素发作',icon:'icon-poison-gas',color:'var(--accent-purple)',maxStacks:9,stackable:true,tooltip:'每回合损失5%最大生命值（瘟疫主宰10%）',hooks:{onTurnStart:{type:'dot',formula:'ceil(hpMax*dotPct)+dotBonus+statusDamage'},onExpire:{msg:'毒素已自行分解。'}}},
        bleed: { id:'bleed',name:'流血',icon:'icon-dripping-blade',color:'var(--accent-red)',maxStacks:9,stackable:true,tooltip:'每回合损失固定伤害值',hooks:{onTurnStart:{type:'dot',formula:'bleedDmg'},onExpire:{msg:'流血已止住。'}}},
        compromised: { id:'compromised',name:'生物崩解',icon:'icon-hazard-sign',color:'var(--accent-yellow)',maxStacks:1,stackable:false,tooltip:'防御归零+闪避无效。被腺体脉冲引爆后陷入易伤',hooks:{onApply:{effects:[{type:'setFlag',flag:'_dodging',value:false},{type:'setFlag',flag:'_compDefZero',value:true}]},onExpire:{effects:[{type:'setFlag',flag:'_compDefZero',value:false}]}}},
        ionized: { id:'ionized',name:'电离标记',icon:'icon-lightning-arc',color:'var(--accent-blue)',maxStacks:1,stackable:false,tooltip:'下次捕食打击引爆：剥离护盾+全场溅射',hooks:{}},
        stunned: { id:'stunned',name:'眩晕',icon:'icon-time-trap',color:'var(--accent-yellow)',maxStacks:1,stackable:false,tooltip:'跳过本回合行动',hooks:{onExpire:{msg:'眩晕已解除。'}}}
    };

    // =========================================================================
    // 13. 被动效果模板
    // =========================================================================
    var PASSIVE_TEMPLATES = {
        'dual_mutant+mutant': { id:'dual_mutant+mutant',name:'超量撕裂',color:'var(--accent-red)',passiveDesc:'所有攻击物理伤害x1.4，无视30%防御',triggers:[{on:'onBeforeDamage',condition:'slot==="predatory_organ"',effects:[{type:'multiplyDamage',value:1.4},{type:'setFlag',flag:'dualIgnoreDef',value:true}]}]},
        'dual_mutant+swarm': { id:'dual_mutant+swarm',name:'骨疽自溶',color:'var(--accent-purple)',passiveDesc:'受击时55%概率毒雾反击',triggers:[{on:'onDamaged',condition:'Math.random()<0.55',effects:[{type:'applyStatus',status:'poison',target:'attacker',params:{duration:3}}]}]},
        'dual_ember+mutant': { id:'dual_ember+mutant',name:'动能回馈',color:'var(--accent-blue)',passiveDesc:'防御转护盾，受击+1进程，流血免疫',triggers:[{on:'onBattleStart',effects:[{type:'gainShield',formula:'player.def'}]},{on:'onDamaged',effects:[{type:'gainShield',formula:'ceil(player.def*0.3)'},{type:'gainProcess',formula:'1'}]}]},
        'dual_swarm+swarm': { id:'dual_swarm+swarm',name:'瘟疫主宰',color:'var(--accent-purple)',passiveDesc:'毒素发作5%->10%，无视护盾',triggers:[]},
        'dual_ember+swarm': { id:'dual_ember+swarm',name:'电子真菌',color:'var(--accent-yellow)',passiveDesc:'毒技能35%概率不消耗进程',triggers:[{on:'onSkillUse',condition:'slot==="gland_core"&&Math.random()<0.35',effects:[{type:'setFlag',flag:'_freeSkill',value:true}]}]},
        'dual_ember+ember': { id:'dual_ember+ember',name:'终焉母核',color:'var(--accent-blue)',passiveDesc:'每回合连锁闪电x2，防御x1.2伤害，清除闪避',triggers:[{on:'onTurnStart',effects:[{type:'setFlag',target:'allEnemies',flag:'_dodging',value:false},{type:'chainLightning',formula:'ceil(player.def*1.2)',count:2}]}]}
    };

    // =========================================================================
    // 14. 魔药执行模板 (Potion Execution Templates)
    // =========================================================================
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

    // =========================================================================
    // 15. 维度词缀模板 (Dimension Affix Templates) — Loop 2+
    // =========================================================================
    var AFFIX_TEMPLATES = [
        { id:'thorns',name:'反馈',desc:'反弹 10% 伤害',color:'var(--accent-red)',onApply:function(mon){}},
        { id:'regen',name:'再生',desc:'每回合恢复 5% HP',color:'var(--accent-green)',onApply:function(mon){}},
        { id:'berserk',name:'死誓',desc:'伤害+50%，每回合扣 5% HP',color:'var(--accent-orange)',onApply:function(mon){ mon._atkMult=(mon._atkMult||1)*1.5; }},
        { id:'jammer',name:'扰频',desc:'玩家每回合进程回复 -1',color:'var(--accent-blue)',onApply:function(mon){}}
    ];

    // =========================================================================
    // 16. 路径词缀模板 (Path Synapse Affix Templates)
    // =========================================================================
    var PATH_AFFIX_TEMPLATES = [
        { id:'high_process',name:'高能反应',desc:'开局额外获得 2 点进程',color:'var(--accent-green)',onBattleStart:function(bs,gs){ bs.playerProcess=Math.min(gs.player.process_max,bs.playerProcess+2); }},
        { id:'weak_bio',name:'生物辐射',desc:'全场敌人初始降低 20% HP',color:'var(--accent-red)',onBattleStart:function(bs,gs){ bs.monsters.forEach(function(m){ var loss=Math.ceil(m.hp*0.2); m.hp-=loss; }); }},
        { id:'data_rich',name:'信号富集',desc:'击败后获得的经验提升 50%',color:'var(--accent-blue)',onBattleStart:function(){}, xpMult:1.5 },
        { id:'scrap_rich',name:'金属堆积',desc:'击败后额外获得 1 个组件碎片',color:'var(--accent-yellow)',onBattleStart:function(){}, extraDrop:1 },
        { id:'corrosive',name:'酸蚀环境',desc:'进入后敌人获得 3 层中毒',color:'var(--accent-purple)',onBattleStart:function(bs){ bs.monsters.forEach(function(m){ m.status['poison']=3; }); }}
    ];

    // =========================================================================
    // 17. 研究等级增益配置 (Research Perks)
    // =========================================================================
    var RESEARCH_PERKS = {
        1: { showExactHP: true, desc: '显示精确HP' },
        2: { damageBonus: 0.1, desc: '伤害永久+10%' },
        3: { dropRateBonus: 0.25, desc: '组件掉落率+25%' }
    };

    // =========================================================================
    // 18. 难度缩放配置 (Difficulty Scaling Config)
    // =========================================================================
    var DIFFICULTY_CONFIG = {
        loopScale: { hpMul: 1.5, atkMul: 1.5, defMul: 1.0, bpMul: 1.2, xpMul: 1.0 },
        dungeonFloors: { bossFloor: 3, monsterPool: ['MON_CH1_CLEANER','MON_CH1_GUARD','MON_CH1_SPORE','MON_CH1_HIVE','MON_CH1_BEE','MON_CH1_SENTINEL'], bossPool: ['MON_CH1_TYRANT','MON_CH1_QUEEN','MON_CH1_CORE'], monstersPerFloor: 2 },
        floorNames: ['','地下一层','地下二层','地下三层','地下四层','地下五层','地下六层','地下七层','地下八层','地下九层','地下十层']
    };

    // =========================================================================
    // 公开 API
    // =========================================================================
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
