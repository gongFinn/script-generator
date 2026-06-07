# 剧本 YAML Schema 定义文档

## 版本：1.0.0 | 语言：zh-CN / en / zh-TW

---

## 目录
1. [概述](#概述)
2. [完整 Schema 定义](#完整-schema-定义)
3. [字段详解](#字段详解)
4. [设计原理](#设计原理)
5. [完整示例](#完整示例)
6. [验证规则](#验证规则)

---

## 概述

本 Schema 定义了将小说/文章转化为结构化剧本的标准 YAML 格式。设计目标是：

- **可读性**：人类可以直接阅读和编辑
- **可解析性**：程序可以精确解析每个元素
- **完整性**：涵盖剧本创作所需的所有要素
- **扩展性**：可以在不破坏现有结构的情况下添加新字段

### 顶层结构

```
script
├── meta          # 元数据
├── characters[]  # 角色列表
└── scenes[]      # 场景列表
    ├── heading        # 场景标题
    ├── description    # 场景描述
    ├── entrance_timing[] # 上场时机
    ├── beats[]        # 动作/台词序列
    └── transition     # 转场
```

---

## 完整 Schema 定义

```yaml
# ==================== 根对象 ====================
script:
  # ---------- 元数据 ----------
  meta:
    title: string              # 剧本标题
    source: string             # 原著来源（书名或文章名）
    language: enum             # 语言: "zh-CN" | "zh-TW" | "en"
    version: string            # Schema版本号
    created_at: datetime       # 生成时间 (ISO 8601)
    total_scenes: integer      # 场景总数
    total_characters: integer  # 角色总数
    genre: string              # 剧本类型（可选）: 悬疑/爱情/科幻/...
    description: string        # 剧本简介（可选）

  # ---------- 角色定义 ----------
  characters:
    - id: string               # 唯一标识，格式: "char_N"
      name: string             # 角色名称
      aliases: [string]        # 别名列表（可选）
      gender: enum             # "男" | "女" | "其他"（可选）
      age: string              # 年龄描述（可选）
      role: enum               # "主角" | "配角" | "客串"
      description: string      # 角色描述
      traits: [string]         # 性格特征（可选）
      motivation: string       # 角色动机（可选）
      arc: string              # 角色发展弧线（可选）

  # ---------- 场景列表 ----------
  scenes:
    - id: integer              # 场景序号，从1开始递增
      chapter: string          # 所属原文章节名

      # 场景标题
      heading:
        location: string       # 场景地点，如 "林家客厅"
        time: enum             # "日" | "夜" | "晨" | "昏" | "凌晨" | "傍晚"
        season: string         # 季节（可选）: "春" | "夏" | "秋" | "冬"
        weather: string        # 天气（可选）: "雨" | "晴" | "雪" | ...
        year: string           # 年代（可选）: "现代" | "古代" | "2024年"

      # 场景描述
      description: string      # 舞台布景、环境、氛围的详细描述

      # 在场角色
      characters_present: [string]  # 本场景出现的角色名列表

      # 上场时机
      entrance_timing:
        - character: string    # 角色名
          timing: string       # 具体上场时机，如 "幕启时已在舞台"
          position: string     # 上场位置（可选）: "左侧" | "右侧" | "中央"
          notes: string        # 备注（可选）

      # 节拍序列（剧本最小执行单元）
      beats:
        - id: string           # 唯一标识，格式: "场景ID.序号"，如 "1.3"
          type: enum           # 类型: "dialogue" | "action" | "transition" | "emotion" | "note"

          # --- dialogue 类型 ---
          character: string    # 说话角色名
          line: string         # 台词内容
          delivery: string     # 说话方式（可选）: "急促" | "低声" | "大喊" | ...
          emotion: string      # 情绪（可选）: "愤怒" | "悲伤" | "喜悦" | ...

          # --- action 类型 ---
          # character: string  # 执行动作的角色
          action: string       # 动作描述
          # emotion: string    # 伴随情绪（可选）
          notes: string        # 导演备注（可选）

      # 转场
      transition:
        to: integer|string     # 下一场景ID，或 "end" 表示剧终
        type: enum             # "cut" | "fade" | "dissolve" | "wipe"
        duration: string       # 转场时长（可选）: "1s" | "2s" | ...
        notes: string          # 转场说明（可选）
```

---

## 字段详解

### script.meta — 元数据

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 剧本标题，通常取自原文前30字或用户指定 |
| `source` | string | ✅ | 原著名称，用于追溯来源 |
| `language` | enum | ✅ | 剧本语言，影响所有文本 |
| `total_scenes` | integer | ✅ | 场景总数，用于快速了解剧本规模 |
| `version` | string | | Schema版本，便于后续升级兼容 |
| `genre` | string | | 剧本类型标签，便于分类检索 |
| `description` | string | | 剧本简介，100字以内 |

### script.characters[] — 角色

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 全局唯一标识，`char_` 前缀 |
| `name` | string | ✅ | 角色正名 |
| `aliases` | [string] | | 别名/化名，用于全局替换功能 |
| `gender` | enum | | 性别 |
| `age` | string | | 年龄描述（非数值，允许 "中年""二十出头"） |
| `role` | enum | ✅ | "主角"/"配角"/"客串" |
| `description` | string | ✅ | 角色描述 |
| `traits` | [string] | | 性格标签 |
| `motivation` | string | | 角色动机，帮助理解行为 |
| `arc` | string | | 角色弧线，描述从始至终的变化 |

**设计原因**：角色是最核心的查询维度。用户需要按角色提取戏份、替换名称。
独立的 `characters` 数组（而非散落在场景中）使得角色操作只需扫描一处。
`aliases` 字段直接服务于系统的"全局替换角色名"功能。

### script.scenes[] — 场景

#### heading（场景标题）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `location` | string | ✅ | 场景地点 |
| `time` | enum | ✅ | 时间段，影响灯光和氛围 |
| `season` | string | | 季节 |
| `weather` | string | | 天气 |
| `year` | string | | 年代 |

**设计原因**：heading 是场景的"身份证"，所有字段独立而非合并为一个字符串，
方便程序按时间/地点/天气筛选场景。

#### beats[] — 节拍（Beat）

Beat 是剧本的**最小执行单元**。每一个动作、每一句台词都是一个 Beat。

| 字段 | 适用的 type | 说明 |
|------|------------|------|
| `id` | 全部 | 唯一标识 `场景ID.序号`，如 `1.3` |
| `type` | 全部 | `dialogue`/`action`/`transition`/`emotion`/`note` |
| `character` | dialogue, action | 关联角色 |
| `line` | dialogue | 台词文本 |
| `delivery` | dialogue | 说话方式 |
| `emotion` | dialogue, action | 情绪标签 |
| `action` | action | 动作描述 |
| `notes` | action | 导演备注 |

**设计原因**：Beat 是结构化剧本区别于纯文本剧本的关键。
传统剧本中"角色名（动作）：台词"是混合在一行的，无法程序化解析。
将每个 Beat 独立为结构化对象后：
- 可以精确提取某个角色的所有台词（按 `type=dialogue` + `character` 过滤）
- 可以统计每个场景的情绪流
- 可以生成分镜脚本（每个 beat 对应一个镜头）
- `delivery` 和 `emotion` 分离：delivery 是"怎么说的"，emotion 是"什么心情"

#### transition（转场）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `to` | int/string | ✅ | 下一场景ID，`end` 表示剧终 |
| `type` | enum | ✅ | 转场类型 |
| `duration` | string | | 转场时长 |
| `notes` | string | | 转场说明 |

**设计原因**：转场信息独立存储，便于后期制作时生成时间线。

---

## 设计原理

### 1. 为什么选择 YAML 而不是 JSON 或纯文本？

| 对比维度 | YAML | JSON | 纯文本 |
|---------|------|------|--------|
| 人类可读性 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 程序可解析 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| AI 生成准确度 | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 支持多行文本 | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| 编辑友好度 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

YAML 在**结构化**和**可读性**之间取得最佳平衡。剧本包含大量多行描述和台词，YAML 的多行字符串语法（`|`）天然适合。相比 JSON 不需要处理转义引号，相比纯文本又有明确的 schema 约束。

### 2. 为什么用 Beat 而不是连续文本？

传统剧本格式是连续的：
```
林小雨（猛地站起身）：终于来了！她快步走向门口。
```

Beat 结构将其拆解为：
```yaml
- id: "1.1"
  type: "action"
  character: "林小雨"
  action: "猛地站起身"
  emotion: "紧张"
- id: "1.2"
  type: "dialogue"
  character: "林小雨"
  line: "终于来了！"
  delivery: "急促"
  emotion: "激动"
- id: "1.3"
  type: "action"
  character: "林小雨"
  action: "快步走向门口"
```

这种拆分使得系统可以：
- **按角色过滤**：一键提取某角色的所有戏份
- **按类型统计**：分析对话/动作比例
- **情绪追踪**：追踪角色情绪变化曲线
- **多语言翻译**：精确翻译每条台词而不影响结构
- **后期编辑**：修改单条台词不影响上下文

### 3. 为什么角色定义独立于场景？

如果角色只在场景中出现时才定义，会导致：
- 同一角色在不同场景被识别为不同角色
- 无法获取剧本的完整角色列表
- 全局重命名时需要遍历所有场景

独立的 `characters` 数组使得这些操作都是 O(1) 或 O(n) 复杂度。

### 4. 为什么 entrance_timing 是独立字段？

上场时机是舞台剧本的关键要素，但容易被遗忘。将其作为独立必填字段可以：
- 确保 AI 不会遗漏
- 方便场务人员按时间线准备
- 支持生成"角色登场顺序表"

### 5. 为什么 transition 指向下一场景？

使用 `to: <next_id>` 而不是隐含"场景N的下一场景是N+1"，因为实际剧本中：
- 存在场景复用（同一场景出现多次）
- 可能存在分支剧情或多结局
- 非线性叙事需要明确转场关系

### 6. 扩展性设计

Schema 设计遵循以下原则确保向前兼容：
- 所有可选字段标注为"可选"
- 新字段添加到结构末尾，不改变已有字段顺序
- `type` 枚举可扩展（新增 beat 类型）
- `meta` 中的 `version` 字段用于识别 Schema 版本

---

## 完整示例

以下是将《雨夜来客》第一章转化为 YAML 剧本的完整示例：

```yaml
script:
  meta:
    title: "雨夜来客"
    source: "雨夜来客 第一章"
    language: "zh-CN"
    version: "1.0.0"
    created_at: "2026-06-07T12:00:00Z"
    total_scenes: 3
    total_characters: 2
    genre: "悬疑"
    description: "一个雨夜，陌生男子来访，带来已故父亲的消息"

  characters:
    - id: "char_1"
      name: "林小雨"
      aliases: ["小雨", "林小姐"]
      gender: "女"
      age: "28岁"
      role: "主角"
      description: "一位敏感而坚韧的年轻女性，父亲三年前去世"
      traits: ["敏感", "坚韧", "谨慎", "重感情"]
      motivation: "查明父亲去世的真相"
      arc: "从逃避过去到勇敢面对"

    - id: "char_2"
      name: "陈默"
      aliases: ["陌生男子"]
      gender: "男"
      age: "45岁左右"
      role: "配角"
      description: "自称是林小雨父亲的朋友，身上带着秘密"
      traits: ["沉稳", "神秘", "锐利"]
      motivation: "完成林父的嘱托"
      arc: "从神秘到真相揭露"

  scenes:
    - id: 1
      chapter: "第一章"
      heading:
        location: "林家客厅"
        time: "夜"
        season: "秋"
        weather: "雨"
        year: "现代"
      description: |
        一间老式客厅，约30平方米。沙发靠左墙，茶几上放着一盏落地灯，
        灯光昏暗偏黄。右侧有一扇通向走廊的木门。
        窗外传来持续的雨声，窗玻璃上有雨水流淌的痕迹。
        整体氛围压抑而安静，只有雨声和偶尔的雷声打破沉寂。
      characters_present: ["林小雨"]
      entrance_timing:
        - character: "林小雨"
          timing: "幕启时已坐在舞台左侧的藤椅上"
          position: "左侧"
          notes: "她手中的茶杯已无热气，表明等待已久"
      beats:
        - id: "1.1"
          type: "action"
          character: "林小雨"
          action: "坐在藤椅上，低头看着手中已凉透的茶杯，手指轻轻摩挲杯沿"
          emotion: "焦虑"
          notes: "保持静止约5秒，营造等待的压抑感"
        - id: "1.2"
          type: "note"
          notes: "雨声持续3秒，雷声隐约"
        - id: "1.3"
          type: "action"
          character: "林小雨"
          action: "抬头看向墙上的钟，叹气，将茶杯放在茶几上"
          emotion: "失望"
        - id: "1.4"
          type: "dialogue"
          character: "林小雨"
          line: "已经三小时了..."
          delivery: "轻声自语，带着倦意"
          emotion: "失落"
      transition:
        to: 2
        type: "cut"
        duration: "0.5s"
        notes: "雷声渐大，灯光略微闪烁"

    - id: 2
      chapter: "第一章"
      heading:
        location: "林家客厅"
        time: "夜"
        season: "秋"
        weather: "雨"
      description: |
        同一客厅。雨势加大，窗外偶尔有闪电。
        灯光比上一场更暗，营造紧张感。
      characters_present: ["林小雨", "陈默"]
      entrance_timing:
        - character: "林小雨"
          timing: "场景开始时仍在藤椅旁"
        - character: "陈默"
          timing: "门铃响起后，林小雨开门，陈默从右侧门进入"
          position: "右侧门"
      beats:
        - id: "2.1"
          type: "action"
          character: "林小雨"
          action: "被突然响起的门铃声惊到，猛地站起身"
          emotion: "惊讶"
        - id: "2.2"
          type: "dialogue"
          character: "林小雨"
          line: "终于来了！"
          delivery: "急促，带着期待和一丝紧张"
          emotion: "激动"
        - id: "2.3"
          type: "action"
          character: "林小雨"
          action: "快步走向门口，手在门把上停了一下，深呼吸"
          emotion: "紧张"
          notes: "停顿约1秒，体现内心犹豫"
        - id: "2.4"
          type: "action"
          character: "林小雨"
          action: "拉开门"
          emotion: "期待"
        - id: "2.5"
          type: "action"
          character: "陈默"
          action: "站在门外，浑身湿透，雨水从黑色风衣滴落。缓缓抬起头"
          emotion: "疲惫但锐利"
          notes: "门外应有灯光打到陈默身上，形成剪影效果"
        - id: "2.6"
          type: "dialogue"
          character: "陈默"
          line: "林小姐，久等了。我叫陈默，是你父亲的朋友。"
          delivery: "平静，声音低沉但清晰"
          emotion: "镇定"
        - id: "2.7"
          type: "action"
          character: "林小雨"
          action: "后退半步，上下打量对方"
          emotion: "警惕"
        - id: "2.8"
          type: "dialogue"
          character: "林小雨"
          line: "我父亲已经去世三年了，你现在来，有什么事？"
          delivery: "声音微颤，强作镇定"
          emotion: "防备"
        - id: "2.9"
          type: "action"
          character: "陈默"
          action: "从怀中掏出一个用防水布包裹的信封，信封上红色印章清晰可见"
          emotion: "郑重"
          notes: "信封是重要道具，需要特写"
        - id: "2.10"
          type: "dialogue"
          character: "陈默"
          line: "他留了一样东西给你。但我必须先确认你的身份。"
          delivery: "郑重，目光直视林小雨"
          emotion: "严肃"
      transition:
        to: 3
        type: "fade"
        duration: "1s"
        notes: "聚焦于林小雨的表情变化，灯光渐暗"

    - id: 3
      chapter: "第一章"
      heading:
        location: "林家客厅"
        time: "夜"
        season: "秋"
        weather: "雨"
      description: |
        场景同前。门已关上，陈默站在客厅中央，林小雨站在门边。
        两人之间的张力明显。
      characters_present: ["林小雨", "陈默"]
      entrance_timing:
        - character: "林小雨"
          timing: "场景开始时站在门边"
        - character: "陈默"
          timing: "场景开始时站在客厅中央"
          notes: "他的黑色风衣仍在滴水，在地板上形成水渍"
      beats:
        - id: "3.1"
          type: "action"
          character: "林小雨"
          action: "目光落在信封的红色印章上，表情从警惕变为震惊"
          emotion: "震惊"
          notes: "印章图案与她父亲的私人印章一致，特写印章"
        - id: "3.2"
          type: "dialogue"
          character: "林小雨"
          line: "进来吧。"
          delivery: "声音发颤，几乎听不见"
          emotion: "颤抖"
        - id: "3.3"
          type: "action"
          character: "林小雨"
          action: "缓缓关上门，手在发抖"
          emotion: "紧张"
          notes: "关门声与外面的雷声重叠"
      transition:
        to: "end"
        type: "fade"
        duration: "2s"
        notes: "灯光完全熄灭，雷声持续，过渡到下一章"
```

---

## 验证规则

解析 YAML 时应检查以下规则：

| 规则 | 说明 |
|------|------|
| `script` 必须为根键 | 顶层只能有一个 `script` 对象 |
| `meta.total_scenes` == len(`scenes`) | 元数据中的场景数必须与实际一致 |
| `meta.total_characters` == len(`characters`) | 元数据中的角色数必须与实际一致 |
| `characters[].id` 全局唯一 | 每个角色 ID 不能重复 |
| `scenes[].id` 全局唯一 | 每个场景 ID 不能重复 |
| `beats[].id` 在场景内唯一 | 同一场景内 beat ID 不能重复 |
| `characters_present` ⊆ 角色名列表 | 场景中出现的角色必须在角色列表中定义 |
| dialogue beat 必须有 `line` | 台词类型必须包含 `line` 字段 |
| action beat 必须有 `action` | 动作类型必须包含 `action` 字段 |
| `entrance_timing` 覆盖所有 `characters_present` | 每个在场角色都应有上场时机 |
| 场景 ID 从 1 递增 | 场景编号必须连续从 1 开始 |
| transition.to 指向存在的场景或 "end" | 转场目标必须有效 |

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-06-07 | 初始版本，定义完整 Schema |
