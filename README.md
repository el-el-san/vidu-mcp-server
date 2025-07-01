[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/el-el-san-vidu-mcp-server-badge.png)](https://mseep.ai/app/el-el-san-vidu-mcp-server)

# Vidu MCP Server
[![smithery badge](https://smithery.ai/badge/@el-el-san/vidu-mcp-server)](https://smithery.ai/server/@el-el-san/vidu-mcp-server)

Vidu動画生成APIと連携するためのModel Context Protocol (MCP) サーバーです。Viduの強力なAIモデルを使用して、画像から動画を生成するツールを提供します。

## 機能

- **画像から動画への変換**: カスタマイズ可能な設定で静止画から動画を生成
  - 複数モデル対応: viduq1、vidu1.5、vidu2.0
  - モデル固有の時間・解像度制約
  - 4秒動画向けのBGM対応
  - 非同期通知用のコールバックURL対応
- **生成状況の確認**: クレジット使用量情報付きで動画生成タスクの進捗を監視
- **画像アップロード**: Vidu APIで使用する画像を簡単にアップロード（最大10MB）

## 前提条件

- Node.js (v14以上)
- Vidu APIキー（[Viduウェブサイト](https://vidu.com)から取得可能）
- TypeScript（開発用）

## インストール

### Smithery経由でのインストール

[Smithery](https://smithery.ai/server/@el-el-san/vidu-mcp-server)を使用してClaude Desktop用のVidu Video Generation Serverを自動インストール:

```bash
npx -y @smithery/cli install @el-el-san/vidu-mcp-server --client claude
```

### Gemini CLI設定

Gemini CLIで使用するには、`~/.gemini/settings.json`にサーバー設定を追加してください:

```json
{
  "mcpServers": {
    "vidu": {
      "command": "node",
      "args": [
        "your_path/vidu-mcp-server/build/index.js"
      ],
      "env": {
        "VIDU_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**注意**: `your_path`を実際のインストールディレクトリのパスに、`your_api_key_here`をあなたのVidu APIキーに置き換えてください。

### 手動インストール
1. このリポジトリをクローン:
```bash
git clone https://github.com/el-el-san/vidu-mcp-server.git
cd vidu-mcp-server
```

2. 依存関係をインストール:
```bash
npm install
```

3. `.env.template`を基に`.env`ファイルを作成し、Vidu APIキーを追加:
```
VIDU_API_KEY=your_api_key_here
```

## 使用方法

### Gemini CLI用

1. TypeScriptコードをビルド:
```bash
npm run build
```

2. Gemini CLI設定で設定（上記のGemini CLI設定セクションを参照）

3. Gemini CLIを再起動してMCPを読み込み

## ツール

### 1. 画像から動画への変換

カスタマイズ可能なパラメータで静止画を動画に変換します。

パラメータ:
- `image_url` (必須): 動画に変換する画像のURL
- `prompt` (オプション): 動画生成用のテキストプロンプト（最大1500文字）
- `duration` (オプション): 出力動画の時間（秒）（モデル固有）
  - **viduq1**: 5秒のみ
  - **vidu1.5/vidu2.0**: 4秒または8秒（デフォルト4秒）
- `model` (オプション): 生成用モデル名（"viduq1", "vidu1.5", "vidu2.0", デフォルト "vidu2.0"）
- `resolution` (オプション): 出力動画の解像度（モデル/時間固有）
  - **viduq1 (5s)**: 1080pのみ
  - **vidu1.5/vidu2.0 (4s)**: "360p", "720p", "1080p"（デフォルト "360p"）
  - **vidu1.5/vidu2.0 (8s)**: "720p"のみ
- `movement_amplitude` (オプション): フレーム内オブジェクトの動きの振幅（"auto", "small", "medium", "large", デフォルト "auto"）
- `seed` (オプション): 再現性のためのランダムシード
- `bgm` (オプション): 動画にBGMを追加（boolean, デフォルト false, 4秒動画のみ）
- `callback_url` (オプション): 生成状況変更時の非同期通知用URL

リクエスト例:
```json
{
  "image_url": "https://example.com/image.jpg",
  "prompt": "山を背景にした静かな湖",
  "duration": 8,
  "model": "vidu2.0",
  "resolution": "720p",
  "movement_amplitude": "medium",
  "seed": 12345,
  "bgm": false
}
```

### 2. 生成状況の確認

実行中の動画生成タスクの状況を確認します。

パラメータ:
- `task_id` (必須): 画像から動画への変換ツールで返されたタスクID

リクエスト例:
```json
{
  "task_id": "12345abcde"
}
```

### 3. 画像アップロード

Vidu APIで使用する画像をアップロードします。

パラメータ:
- `image_path` (必須): 画像ファイルのローカルパス
- `image_type` (必須): 画像ファイルタイプ（"png", "webp", "jpeg", "jpg"）

リクエスト例:
```json
{
  "image_path": "/path/to/your/image.jpg",
  "image_type": "jpg"
}
```

## トラブルシューティング

- **APIキーの問題**: Vidu APIキーが`.env`ファイル（手動設定の場合）またはGemini CLI設定（Gemini CLI設定の場合）で正しく設定されていることを確認してください
- **ファイルアップロードエラー**: 画像ファイルが有効で、サイズ制限内（upload-imageツールは10MB、直接URL画像は最大50MB）であることを確認してください
- **接続問題**: インターネットアクセスがあり、Vidu APIサーバーに到達できることを確認してください
- **Gemini CLIの問題**: 
  - Gemini CLIで設定する前にサーバーがビルドされている（`npm run build`）ことを確認してください
  - settings.jsonのパスが正しい`build/index.js`ファイルを指していることを確認してください
  - 設定変更後にGemini CLIを再起動してください
  - サーバー設定で`"disabled": false`に設定してください



