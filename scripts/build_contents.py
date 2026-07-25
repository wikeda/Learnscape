"""Excel(問題集) -> コンテンツJSON 変換（開発用ツール）。
本番ビルドは生成済みJSONのみ使用するため、このスクリプトは実行時依存ではない。
使い方: python scripts/build_contents.py
"""
import json, math, os
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'src', 'data', 'contents')
DL = r'C:/Users/500886/Downloads'

JOBS = [
    # 日本史は解答修正済みの「修正版」を最新として使用する
    dict(xlsx=f'{DL}/大学入試_日本史_時代別問題集_1500問_修正版.xlsx', id='japanese-history', title='日本史'),
    dict(xlsx=f'{DL}/大学入試_世界史_時代別問題集_2100問.xlsx', id='world-history', title='世界史'),
]

def clean(v):
    if v is None: return None
    if isinstance(v, float) and math.isnan(v): return None
    s = str(v).strip()
    return s if s else None

def build(job):
    q = pd.read_excel(job['xlsx'], sheet_name='問題', header=0)
    a = pd.read_excel(job['xlsx'], sheet_name='解答・解説', header=0)
    ans = {r['問題ID']: r for _, r in a.iterrows()}
    questions = []
    for _, r in q.iterrows():
        qid = clean(r['問題ID'])
        if not qid: continue
        ar = ans.get(r['問題ID'], {})
        questions.append({
            'id': qid,
            'section': clean(r['時代区分']),
            'chapter': clean(r['章名']),
            'chapterNo': int(r['章番号']),
            'difficulty': clean(r['難度']),
            'format': clean(r['形式']),
            'question': clean(r['問題文']),
            'choices': clean(r['選択肢']),
            'answer': clean(ar.get('正解')),
            'explanation': clean(ar.get('解説')),
            'point': clean(ar.get('学習ポイント')),
        })
    questions.sort(key=lambda x: (x['chapterNo'], x['id']))
    return {'schemaVersion': 1, 'id': job['id'], 'title': job['title'], 'questions': questions}

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for job in JOBS:
        content = build(job)
        path = os.path.join(OUT_DIR, f"{job['id']}.json")
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        print(f"{job['title']}: {len(content['questions'])}問 -> {path}")

if __name__ == '__main__':
    main()
