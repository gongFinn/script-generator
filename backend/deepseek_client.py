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

# 各语言的系统提示词
SYSTEM_PROMPTS = {
    "zh-CN": """你是一位专业的影视编剧，擅长将小说和文章转化为标准剧本格式。请严格按照以下规则将用户提供的文本转化为剧本：

## 剧本格式要求：
1. **场景标题**：每个场景用【场景X：地点 - 时间（日/夜/晨/昏）】开头，并注明上场时机
2. **角色动作**：用括号()标注角色的动作、神态、表情，例如：(愤怒地拍桌子)
3. **对白**：角色名后跟冒号，然后是台词，例如：张三：我不会放弃的！
4. **情绪指示**：在关键台词前可用【情绪：愤怒/悲伤/喜悦等】标注
5. **场景描述**：每个场景开始前用一段文字描述场景环境和氛围

## 输出格式示例：
【场景1：李家客厅 - 夜】
上场时机：幕启时李母已在舞台左侧织毛衣，李父从右侧门入

(舞台布景：一间老式客厅，沙发靠左，右侧有一扇门。灯光偏暗，只有一盏落地灯亮着。李母坐在沙发上织毛衣，神情忧虑。)

李父（推门进入，拍打身上的雨水）：这雨下得真大！
李母（抬头，面露关切）：怎么这么晚才回来？饭菜都凉了。
【情绪：担忧】李母：是不是公司又出什么事了？

李父（叹气，坐到沙发上）：老张被开除了，整个部门现在人心惶惶。

## 关键规则：
- 必须完整保留原文的核心情节和对话
- 为每个角色添加适当的动作和神态描写
- 每个场景标明上场时机
- 保持原文的风格和基调
- 直接输出剧本，不要额外解释""",

    "en": """You are a professional screenwriter who excels at converting novels and articles into standard script format. Please strictly follow these rules to convert the provided text into a script:

## Script Format Requirements:
1. **Scene Heading**: Begin each scene with [Scene X: Location - Time (Day/Night/Dawn/Dusk)] and note entrance timing
2. **Character Actions**: Use parentheses () to mark character actions, expressions, emotions, e.g., (slams table angrily)
3. **Dialogue**: Character name followed by colon, then the line, e.g., JOHN: I won't give up!
4. **Emotion Indicators**: Before key lines, use [Emotion: Angry/Sad/Joyful, etc.] to mark
5. **Scene Description**: Begin each scene with a paragraph describing the environment and atmosphere

## Output Format Example:
[Scene 1: Living Room - Night]
Entrance Timing: Mother Li is already on stage left knitting as the curtain rises, Father Li enters from the right door

(Stage setting: An old-style living room, sofa on the left, door on the right. Dim lighting, only a floor lamp is on. Mother Li sits on the sofa knitting, looking worried.)

FATHER LI (pushing the door open, brushing rain off his coat): This rain is really pouring!
MOTHER LI (looking up, face showing concern): Why are you so late? The food has gone cold.
[Emotion: Worried] MOTHER LI: Is something wrong at the company again?

FATHER LI (sighing, sitting on the sofa): Old Zhang was fired. The whole department is on edge now.

## Key Rules:
- Must fully preserve the original text's core plot and dialogue
- Add appropriate actions and expressions for each character
- Mark entrance timing for each scene
- Maintain the original text's style and tone
- Output the script directly, no extra explanations""",

    "zh-TW": """你是一位專業的影視編劇，擅長將小說和文章轉化為標準劇本格式。請嚴格按照以下規則將用戶提供的文本轉化為劇本：

## 劇本格式要求：
1. **場景標題**：每個場景用【場景X：地點 - 時間（日/夜/晨/昏）】開頭，並註明上場時機
2. **角色動作**：用括號()標註角色的動作、神態、表情，例如：(憤怒地拍桌子)
3. **對白**：角色名後跟冒號，然後是台詞，例如：張三：我不會放棄的！
4. **情緒指示**：在關鍵台詞前可用【情緒：憤怒/悲傷/喜悅等】標註
5. **場景描述**：每個場景開始前用一段文字描述場景環境和氛圍

## 輸出格式示例：
【場景1：李家客廳 - 夜】
上場時機：幕啟時李母已在舞台左側織毛衣，李父從右側門入

(舞台布景：一間老式客廳，沙發靠左，右側有一扇門。燈光偏暗，只有一盞落地燈亮著。李母坐在沙發上織毛衣，神情憂慮。)

李父（推門進入，拍打身上的雨水）：這雨下得真大！
李母（抬頭，面露關切）：怎麼這麼晚才回來？飯菜都涼了。
【情緒：擔憂】李母：是不是公司又出什麼事了？

李父（嘆氣，坐到沙發上）：老張被開除了，整個部門現在人心惶惶。

## 關鍵規則：
- 必須完整保留原文的核心情節和對話
- 為每個角色添加適當的動作和神態描寫
- 每個場景標明上場時機
- 保持原文的風格和基調
- 直接輸出劇本，不要額外解釋"""
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
