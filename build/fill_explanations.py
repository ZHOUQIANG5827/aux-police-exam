#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量补「解析(explanation)」脚本 —— 针对广东省标辅警真题母库。

特性：
- OpenAI 兼容接口（OpenAI / DeepSeek / SiliconFlow / 通义 等任意 chat/completions 端点）
- 分批调用，减少请求数；每批写回文件，断点续跑（已填的跳过）
- 自动重试 + 指数退避，应对限流
- 仅填充 explanation 字段，不动题目/答案

用法（在你本机，配好 API key 后）：
  python build/fill_explanations.py \
      --input hz/data-written.json \
      --api-key sk-xxxx \
      --base-url https://api.deepseek.com/v1 \
      --model deepseek-chat

说明：
- 默认只处理 explanation 为空/缺失的题；已填的自动跳过（可反复重跑补残）。
- 处理完 <city>/data-written.json 后，运行 python build/sync_station.py <city>
  重建 src/<city>/station-data.js 与 <city>/index.html 即可生效（hz 等站需先有对应 data-written.js）。
"""
import argparse, json, os, sys, time, urllib.request, urllib.error

PROMPT_TMPL = """你是资深辅警考试辅导专家。下面是 {n} 道「广东省公安机关警务辅助人员招聘考试」真题（题型含单选/多选/判断）。
请为每道题写一段简明解析，要求：
1. 点明考点（涉及的法律/条例/常识）；
2. 说明为什么该答案是正确的（多选说明关键选项）；
3. 语言精炼，每题 30~80 字，不讲废话。
严格只输出一个 JSON 数组，元素顺序与输入题号一一对应，每项为字符串解析文本。不要任何额外说明、不要 markdown 代码块。

输入题目（JSON，含 num/type/stem/options/answer）：
{questions}
"""


def call_llm(base_url, api_key, model, prompt, timeout=120):
    url = base_url.rstrip("/") + "/chat/completions"
    data = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 2000,
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + api_key,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return body["choices"][0]["message"]["content"]


def parse_explanations(raw, expected_n):
    # 去掉可能的 ```json ``` 包裹
    s = raw.strip()
    if s.startswith("```"):
        s = s.split("```", 2)[1]
        if s.lower().startswith("json"):
            s = s[4:]
    arr = json.loads(s)
    if not isinstance(arr, list):
        raise ValueError("返回不是数组")
    if len(arr) != expected_n:
        raise ValueError(f"返回数量 {len(arr)} != 期望 {expected_n}")
    return [str(x).strip() for x in arr]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="hz/data-written.json")
    ap.add_argument("--output", default=None, help="默认覆盖 input")
    ap.add_argument("--api-key", required=True)
    ap.add_argument("--base-url", default="https://api.openai.com/v1")
    ap.add_argument("--model", default="gpt-4o-mini")
    ap.add_argument("--batch-size", type=int, default=8)
    ap.add_argument("--delay", type=float, default=0.5, help="批次间秒数")
    ap.add_argument("--max-retry", type=int, default=4)
    args = ap.parse_args()

    out_path = args.output or args.input
    with open(args.input, encoding="utf-8") as f:
        questions = json.load(f)
    print(f"载入 {len(questions)} 题，目标文件 {out_path}")

    # 待处理索引
    todo = [i for i, q in enumerate(questions)
            if not (q.get("explanation") and str(q["explanation"]).strip())]
    print(f"需补解析: {len(todo)} 题")

    done = 0
    i = 0
    while i < len(todo):
        batch_idx = todo[i:i + args.batch_size]
        batch = [questions[j] for j in batch_idx]
        # 构造精简输入
        slim = []
        for q in batch:
            slim.append({
                "num": q.get("num"),
                "type": q.get("type"),
                "stem": q.get("stem"),
                "options": [o.get("text", "") for o in q.get("options", [])],
                "answer": q.get("answer"),
            })
        prompt = PROMPT_TMPL.format(n=len(batch), questions=json.dumps(slim, ensure_ascii=False))

        ok = False
        for attempt in range(args.max_retry):
            try:
                raw = call_llm(args.base_url, args.api_key, args.model, prompt)
                exps = parse_explanations(raw, len(batch))
                for j, exp in zip(batch_idx, exps):
                    questions[j]["explanation"] = exp
                ok = True
                break
            except Exception as e:
                wait = 2 ** attempt
                print(f"  ⚠ 批次 {i} 第{attempt+1}次失败: {e}，{wait}s 后重试")
                time.sleep(wait)
        if not ok:
            print(f"  ✗ 批次 {i} 最终失败，跳过（可重跑续补）")
            i += len(batch_idx)
            continue

        done += len(batch_idx)
        i += len(batch_idx)
        # 断点续跑：每批写回
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(questions, f, ensure_ascii=False, indent=1)
        print(f"  ✓ 已补 {done}/{len(todo)}  | 进度已保存")
        time.sleep(args.delay)

    print(f"完成。共补 {done} 题解析，结果写入 {out_path}")


if __name__ == "__main__":
    main()
