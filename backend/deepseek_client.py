"""DeepSeek API 客户端"""
import os
import json
import httpx
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "sk-f11acd266cc64e72961fe7caef4b9bd8")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
DEEPSEEK_MODEL = "deepseek-chat"

# 各语言的系统提示词（YAML结构化输出）
SYSTEM_PROMPTS = {
    "zh-CN": """你是一位专业的影视编剧，擅长将小说和文章转化为结构化剧本。你必须严格按照以下YAML格式输出剧本，不要输出任何其他内容：

```yaml
script:
  meta:
    title: "剧本标题"
    source: "原著来源"
    language: "zh-CN"
    total_scenes: <场景数量>
  characters:
    - id: "char_1"
      name: "角色名"
      aliases: ["别名1", "别名2"]
      gender: "男/女/其他"
      age: "年龄描述"
      role: "主角/配角/客串"
      description: "角色简要描述"
  scenes:
    - id: 1
      chapter: "所属章节名"
      heading:
        location: "场景地点"
        time: "日/夜/晨/昏"
        season: "季节（可选）"
      description: "场景环境和氛围的详细描述"
      characters_present: ["角色名列表"]
      entrance_timing:
        - character: "角色名"
          timing: "上场时机描述"
      beats:
        - id: "1.1"
          type: "dialogue"
          character: "说话角色名"
          line: "台词内容"
          delivery: "说话方式（可选）"
          emotion: "情绪（可选）"
        - id: "1.2"
          type: "action"
          character: "角色名"
          action: "动作描述"
          emotion: "情绪（可选）"
          notes: "备注（可选）"
      transition:
        to: <下一场景ID或end>
        type: "cut/fade/dissolve"

## 关键规则：
- 必须输出合法YAML，缩进使用2个空格
- 原文有多少章就生成多少场景（至少3个场景）
- 完整保留原文核心情节和对话
- 为每个角色添加动作、神态、语气描写
- 每个角色上场必须注明上场时机
- 每个beat（动作/台词）都要有id
- 直接输出YAML，不要输出```标记以外的任何解释""",

    "en": """You are a professional screenwriter who excels at converting novels and articles into structured scripts. You MUST output in the following YAML format exactly — no other text:

```yaml
script:
  meta:
    title: "Script Title"
    source: "Original Source"
    language: "en"
    total_scenes: <scene count>
  characters:
    - id: "char_1"
      name: "Character Name"
      aliases: ["Alias1", "Alias2"]
      gender: "male/female/other"
      age: "age description"
      role: "lead/supporting/cameo"
      description: "Brief character description"
  scenes:
    - id: 1
      chapter: "Chapter Name"
      heading:
        location: "Scene Location"
        time: "Day/Night/Dawn/Dusk"
        season: "Season (optional)"
      description: "Detailed environment and atmosphere description"
      characters_present: ["Character Names"]
      entrance_timing:
        - character: "Character Name"
          timing: "Entrance timing description"
      beats:
        - id: "1.1"
          type: "dialogue"
          character: "Speaker Name"
          line: "Dialogue text"
          delivery: "Delivery style (optional)"
          emotion: "Emotion (optional)"
        - id: "1.2"
          type: "action"
          character: "Character Name"
          action: "Action description"
          emotion: "Emotion (optional)"
          notes: "Notes (optional)"
      transition:
        to: <next_scene_id or end>
        type: "cut/fade/dissolve"

## Key Rules:
- Output valid YAML ONLY, use 2-space indentation
- Create AT LEAST 3 scenes (one per chapter in the source)
- Preserve the original plot and all dialogue
- Add actions, expressions, and delivery notes for every character
- Every character entrance must have timing specified
- Every beat MUST have a unique id
- Output YAML directly, no explanations outside the ```yaml block""",

    "zh-TW": """你是一位專業的影視編劇，擅長將小說和文章轉化為結構化劇本。你必須嚴格按照以下YAML格式輸出劇本，不要輸出任何其他內容：

```yaml
script:
  meta:
    title: "劇本標題"
    source: "原著來源"
    language: "zh-TW"
    total_scenes: <場景數量>
  characters:
    - id: "char_1"
      name: "角色名"
      aliases: ["別名1", "別名2"]
      gender: "男/女/其他"
      age: "年齡描述"
      role: "主角/配角/客串"
      description: "角色簡要描述"
  scenes:
    - id: 1
      chapter: "所屬章節名"
      heading:
        location: "場景地點"
        time: "日/夜/晨/昏"
        season: "季節（可選）"
      description: "場景環境和氛圍的詳細描述"
      characters_present: ["角色名列表"]
      entrance_timing:
        - character: "角色名"
          timing: "上場時機描述"
      beats:
        - id: "1.1"
          type: "dialogue"
          character: "說話角色名"
          line: "台詞內容"
          delivery: "說話方式（可選）"
          emotion: "情緒（可選）"
        - id: "1.2"
          type: "action"
          character: "角色名"
          action: "動作描述"
          emotion: "情緒（可選）"
          notes: "備註（可選）"
      transition:
        to: <下一場景ID或end>
        type: "cut/fade/dissolve"

## 關鍵規則：
- 必須輸出合法YAML，縮排使用2個空格
- 原文有多少章就生成多少場景（至少3個場景）
- 完整保留原文核心情節和對話
- 為每個角色添加動作、神態、語氣描寫
- 每個角色上場必須註明上場時機
- 每個beat（動作/台詞）都要有id
- 直接輸出YAML，不要輸出```標記以外的任何解釋""",
}

EXTRACT_CHARACTER_PROMPTS = {
    "zh-CN": """请从以下剧本中提取角色"{character_name}"的所有戏份，包括：
1. 该角色出现的所有场景
2. 该角色的所有台词
3. 该角色的所有动作和神态描写
4. 该角色与其他角色的互动

请按场景顺序整理输出，格式如下：
## 角色：【角色名】
### 场景X：地点 - 时间
- 上场时机：...
- 动作/神态：...
- 台词：...
- 互动对象：...

只输出该角色的戏份汇总，不要添加额外内容。""",

    "en": """Please extract all scenes and lines for the character "{character_name}" from the following script, including:
1. All scenes where this character appears
2. All lines spoken by this character
3. All actions and expressions of this character
4. Interactions with other characters

Please organize by scene order in the following format:
## Character: [Character Name]
### Scene X: Location - Time
- Entrance Timing: ...
- Actions/Expressions: ...
- Lines: ...
- Interacting with: ...

Only output the character's scene summary, no additional content.""",

    "zh-TW": """請從以下劇本中提取角色"{character_name}"的所有戲份，包括：
1. 該角色出現的所有場景
2. 該角色的所有台詞
3. 該角色的所有動作和神態描寫
4. 該角色與其他角色的互動

請按場景順序整理輸出，格式如下：
## 角色：【角色名】
### 場景X：地點 - 時間
- 上場時機：...
- 動作/神態：...
- 台詞：...
- 互動對象：...

只輸出該角色的戲份匯總，不要添加額外內容。"""
}

RENAME_CHARACTER_PROMPTS = {
    "zh-CN": """请将以下剧本中所有出现的角色名"{old_name}"替换为"{new_name}"。
注意：
1. 替换所有出现该名字的地方，包括台词前缀、动作描写、场景描述等
2. 保持剧本格式不变
3. 如果新旧名字在文本中有歧义，请谨慎处理
4. 直接输出替换后的完整剧本，不要额外解释""",

    "en": """Please replace all occurrences of the character name "{old_name}" with "{new_name}" in the following script.
Note:
1. Replace all occurrences including dialogue prefixes, action descriptions, scene descriptions, etc.
2. Maintain the script format unchanged
3. If there is ambiguity between old and new names, handle carefully
4. Output the complete script after replacement, no extra explanations""",

    "zh-TW": """請將以下劇本中所有出現的角色名"{old_name}"替換為"{new_name}"。
注意：
1. 替換所有出現該名字的地方，包括台詞前綴、動作描寫、場景描述等
2. 保持劇本格式不變
3. 如果新舊名字在文本中有歧義，請謹慎處理
4. 直接輸出替換後的完整劇本，不要額外解釋"""
}


async def call_deepseek(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.7,
    max_tokens: int = 8192,
) -> Optional[str]:
    """调用DeepSeek API"""
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPError as e:
            print(f"DeepSeek API error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response body: {e.response.text}")
            return None
        except Exception as e:
            print(f"Unexpected error: {e}")
            return None


async def generate_script(text: str, language: str = "zh-CN") -> Optional[str]:
    """将文本转化为剧本"""
    system_prompt = SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["zh-CN"])
    return await call_deepseek(system_prompt, text, temperature=0.8, max_tokens=8192)


async def extract_character_lines(script_content: str, character_name: str, language: str = "zh-CN") -> Optional[str]:
    """提取指定角色的所有戏份"""
    prompt_template = EXTRACT_CHARACTER_PROMPTS.get(language, EXTRACT_CHARACTER_PROMPTS["zh-CN"])
    system_prompt = prompt_template.format(character_name=character_name)
    return await call_deepseek(system_prompt, script_content, temperature=0.3, max_tokens=4096)


async def rename_character_in_script(script_content: str, old_name: str, new_name: str, language: str = "zh-CN") -> Optional[str]:
    """在剧本中全局替换角色名"""
    prompt_template = RENAME_CHARACTER_PROMPTS.get(language, RENAME_CHARACTER_PROMPTS["zh-CN"])
    system_prompt = prompt_template.format(old_name=old_name, new_name=new_name)
    return await call_deepseek(system_prompt, script_content, temperature=0.3, max_tokens=8192)


async def extract_characters_from_script(script_content: str, language: str = "zh-CN") -> Optional[str]:
    """从剧本中提取所有角色列表"""
    prompts = {
        "zh-CN": "请从以下剧本中提取所有角色名称，以JSON数组格式返回，如：[\"角色1\", \"角色2\"]。只返回JSON数组，不要其他内容。",
        "en": "Please extract all character names from the following script and return them as a JSON array, e.g., [\"Character1\", \"Character2\"]. Only return the JSON array, nothing else.",
        "zh-TW": "請從以下劇本中提取所有角色名稱，以JSON陣列格式返回，如：[\"角色1\", \"角色2\"]。只返回JSON陣列，不要其他內容。"
    }
    system_prompt = prompts.get(language, prompts["zh-CN"])
    return await call_deepseek(system_prompt, script_content, temperature=0.1, max_tokens=1024)


# ==================== 剧本摘要分析 ====================

SUMMARY_PROMPTS = {
    "zh-CN": """请对以下YAML格式剧本进行全面分析，输出JSON格式的摘要报告。严格按以下结构输出，只输出JSON，不要任何解释：

```json
{
  "overview": "剧本整体概述（150字内）",
  "chapters": [
    {
      "chapter": "章节名",
      "scene_id": 1,
      "summary": "该场景内容摘要（80字内）",
      "key_dialogue": "该场景最关键的1-2句台词"
    }
  ],
  "main_characters": [
    {
      "name": "角色名",
      "role": "主角/配角/客串",
      "personality": "性格特征",
      "main_actions": "该角色在剧本中的主要行动",
      "arc": "角色弧线简述"
    }
  ],
  "main_scenes": [
    {
      "location": "场景地点",
      "time": "时间",
      "scene_ids": [1],
      "description": "场景特点",
      "importance": "该场景在剧情中的作用"
    }
  ],
  "key_events": [
    {
      "event": "事件名称",
      "scene_id": 1,
      "description": "事件描述",
      "involved_characters": ["参与角色"],
      "plot_significance": "对剧情推进的意义"
    }
  ],
  "emotional_arc": "全剧情绪走向简述",
  "themes": ["主题1", "主题2"]
}
```""",

    "en": """Analyze the following YAML script and output a JSON summary report. Output ONLY valid JSON, no explanations:

```json
{
  "overview": "Overall script overview (in 150 chars)",
  "chapters": [
    {
      "chapter": "Chapter name",
      "scene_id": 1,
      "summary": "Scene summary (80 chars)",
      "key_dialogue": "Most important 1-2 lines"
    }
  ],
  "main_characters": [
    {
      "name": "Character name",
      "role": "lead/supporting/cameo",
      "personality": "Personality traits",
      "main_actions": "Main actions in the script",
      "arc": "Character arc brief"
    }
  ],
  "main_scenes": [
    {
      "location": "Location",
      "time": "Time",
      "scene_ids": [1],
      "description": "Scene characteristics",
      "importance": "Role in plot"
    }
  ],
  "key_events": [
    {
      "event": "Event name",
      "scene_id": 1,
      "description": "Event description",
      "involved_characters": ["Characters"],
      "plot_significance": "Plot significance"
    }
  ],
  "emotional_arc": "Overall emotional trajectory",
  "themes": ["Theme 1", "Theme 2"]
}
```""",

    "zh-TW": """請對以下YAML格式劇本進行全面分析，輸出JSON格式的摘要報告。嚴格按以下結構輸出，只輸出JSON，不要任何解釋：

```json
{
  "overview": "劇本整體概述（150字內）",
  "chapters": [
    {
      "chapter": "章節名",
      "scene_id": 1,
      "summary": "該場景內容摘要（80字內）",
      "key_dialogue": "該場景最關鍵的1-2句台詞"
    }
  ],
  "main_characters": [
    {
      "name": "角色名",
      "role": "主角/配角/客串",
      "personality": "性格特徵",
      "main_actions": "該角色在劇本中的主要行動",
      "arc": "角色弧線簡述"
    }
  ],
  "main_scenes": [
    {
      "location": "場景地點",
      "time": "時間",
      "scene_ids": [1],
      "description": "場景特點",
      "importance": "該場景在劇情中的作用"
    }
  ],
  "key_events": [
    {
      "event": "事件名稱",
      "scene_id": 1,
      "description": "事件描述",
      "involved_characters": ["參與角色"],
      "plot_significance": "對劇情推進的意義"
    }
  ],
  "emotional_arc": "全劇情緒走向簡述",
  "themes": ["主題1", "主題2"]
}
```"""
}


async def summarize_script(script_content: str, language: str = "zh-CN") -> Optional[str]:
    """对剧本进行AI智能摘要"""
    system_prompt = SUMMARY_PROMPTS.get(language, SUMMARY_PROMPTS["zh-CN"])
    return await call_deepseek(system_prompt, script_content, temperature=0.3, max_tokens=4096)
