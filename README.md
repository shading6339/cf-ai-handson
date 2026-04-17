# Cloudflare Workers AI ハンズオン

> Cloudflareアカウント1つで、Cloudflare提供の hosted model と、一部の外部AIプロバイダのモデルを試せる環境を作ります。
> ただし、1日10,000 Neurons の無料枠は Workers AI の `@cf/...` モデル向けであり、Anthropic や OpenAI などの外部モデルは AI Gateway / Unified Billing 側の扱いになります。

---

## Workers AI とは？

Workers AI は、Cloudflare 上で AI モデルを推論できる仕組みです。

Cloudflare の `@cf/...` モデルは Workers AI の料金体系で利用できます。
一方、Anthropic・OpenAI・Google などの外部モデルは、Cloudflare の unified AI model catalog や AI Gateway Unified Billing を通じて扱えます。

```ts
// Cloudflare hosted model
await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8-fast', {
  messages: [...]
})

// 外部モデルは Unified Billing 側の設定が必要な場合がある
await env.AI.run(
  'openai/gpt-4.1-mini',
  { messages: [...] },
  { gateway: { id: 'my-gateway' } }
)
```

重要
`@cf/...` モデルと、Anthropic / OpenAI / Google などの外部モデルは、
同じ Cloudflare アカウントから扱えても、課金の仕組みは同一ではありません。

---

## 料金のしくみ

Workers AI は Neurons という単位で課金されます。
Workers AI の hosted model については、1日 10,000 Neurons まで無料です。

| プラン | 無料枠 | 超過分 |
|---|---:|---:|
| Workers Free | 10,000 Neurons/日 | 超過するとエラー |
| Workers Paid | 10,000 Neurons/日 | $0.011 / 1,000 Neurons |

### 重要な注意

この無料枠は、Workers AI の `@cf/...` モデルを使う場合の説明です。

Anthropic・OpenAI・Google などの外部モデルは、AI Gateway Unified Billing 側で扱われるため、
`@cf/...` モデルと同じ 10,000 Neurons無料枠 とは考えない方が安全です。

---

## モデルごとの価格感

以下は Workers AI hosted model (`@cf/...`) の例です。

| モデル | 入力 | 出力 | 備考 |
|---|---:|---:|---|
| `@cf/meta/llama-3.1-8b-instruct-fp8-fast` | $0.045 / M input tokens | $0.384 / M output tokens | バランス型 |
| `@cf/meta/llama-3.2-3b-instruct` | $0.051 / M input tokens | $0.335 / M output tokens | 軽量 |
| `@cf/ibm-granite/granite-4.0-h-micro` | $0.017 / M input tokens | $0.112 / M output tokens | かなり安価 |
| `@cf/openai/whisper` | $0.0005 / audio minute | — | 音声認識 |
| `@cf/moonshotai/kimi-k2.5` | $0.600 / M input tokens | $3.000 / M output tokens | 高性能寄り |

注意
Anthropic や OpenAI などの外部モデルは、上の Workers AI の neuron 料金表にそのまま載らない場合があります。
それらは Workers AI hosted model とは別の課金系統だからです。

---

## Claude について

Claude などの外部モデルは、Cloudflare 上から利用可能な場合があります。
ただし、Workers AI の `@cf/...` 無料枠と同じ扱いではありません。

したがって、

- Claude がダッシュボード上で Workers AI の neuron 表に見当たらない
- だから無料

と断定するのは避けた方が安全です。

正確には、

- `@cf/...` モデルは Workers AI hosted pricing
- Claude など外部モデルは Unified Billing 側

と分けて説明するのが適切です。

---

## このハンズオンではローカル確認を推奨

このハンズオンでは、まず `wrangler dev` によるローカル確認を推奨します。

```bash
npm run dev
# http://localhost:8787
```

### デプロイを急がない理由

- 公開 URL から外部アクセスを受ける可能性がある
- その結果、想定外に AI リクエストが増える可能性がある
- 無料枠や課金の管理が難しくなる

そのため、最初は `localhost` での確認に限定する方が安全です。

---

## セットアップ

### 必要なもの

- Node.js 20以上
- Cloudflareアカウント
- Wrangler CLI のログイン済み状態

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/your-org/cf-ai-handson
cd cf-ai-handson

# 2. 依存関係をインストール
npm install

# 3. Cloudflareにログイン
npx wrangler login

# 4. ローカルサーバー起動
npm run dev
```

ブラウザで `http://localhost:8787` を開くと確認できます。

---

## APIエンドポイント一覧

### `GET /`

ヘルスチェックです。

```bash
curl http://localhost:8787/
```

### `POST /generate`

テキスト生成です。

```bash
curl -X POST http://localhost:8787/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Cloudflareとは何ですか？3行で教えてください。",
    "model": "@cf/meta/llama-3.1-8b-instruct-fp8-fast"
  }'
```

### 使えるモデル例

| モデルID | 特徴 |
|---|---|
| `@cf/meta/llama-3.1-8b-instruct-fp8-fast` | バランス型 |
| `@cf/meta/llama-3.2-3b-instruct` | 軽量・高速 |
| `@cf/ibm-granite/granite-4.0-h-micro` | 安価 |
| `@cf/qwen/qwen2.5-coder-32b-instruct` | コード生成向け |
| `anthropic/claude-opus-4.7` | 外部モデル。課金系統に注意 |

---

## 利用量の確認

利用量は Cloudflare ダッシュボードから確認できます。

1. Cloudflare ダッシュボードにログイン
2. Workers AI を開く
3. Analytics で利用量を確認

目安
Hosted model では比較的少量の試行で済みますが、
外部モデルは別課金系統の可能性があるため、最初は小さく試す方が安全です。

---

## プロジェクト構成

```text
cf-ai-handson/
├── src/
│   └── index.ts
├── public/
│   └── index.html
├── wrangler.toml
├── package.json
└── tsconfig.json
```

---

## よくあるトラブル

Q. `wrangler dev` でエラーが出る
A. `npx wrangler login` でログイン状態を確認してください。

Q. 無料枠を使い切ったようなエラーが出る
A. Workers AI hosted model の無料枠を使い切っている可能性があります。リセットは UTC 0:00 です。

Q. Claudeモデルが使えない
A. アカウントや機能開放状況によっては使えない場合があります。まず `@cf/...` モデルで試してください。

Q. Claude は無料ですか？
A. そうとは限りません。`@cf/...` モデルとは別の課金系統として考えてください。

---

## ライセンス

MIT
