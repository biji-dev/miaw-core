# miaw-cli - Command-Line Interface Guide

The `miaw-cli` tool provides a convenient command-line interface for WhatsApp operations using miaw-core. It supports both interactive REPL mode and one-shot command execution.

## Installation

The CLI is included with miaw-core. No additional installation needed.

```bash
npm install miaw-core
```

## Running the CLI

### Via npx (recommended for global use)

```bash
npx miaw-cli [command] [options]
```

### Via npm script (when using miaw-core locally)

```bash
npm run cli [command] [options]
```

### After building

```bash
npm run build
node bin/miaw-cli.ts [command] [options]
```

## Modes

### Interactive REPL Mode

Start the interactive shell by running without arguments:

```bash
npx miaw-cli
```

**REPL Features:**
- Persistent connection for multiple operations
- Auto-connects on start
- Command history (via arrow keys)
- Connection status in prompt
- Type `help` for available commands
- Type `exit` or `quit` to leave

**REPL Commands:**

```bash
# REPL-specific commands
help                 # Show all commands overview
help <command>       # Show detailed help for a command
status               # Show connection status
use <instance-id>    # Switch to different instance
connect              # Connect to WhatsApp
disconnect           # Disconnect from WhatsApp
instances, ls        # List all instances
debug on|off         # Toggle debug mode
exit, quit           # Exit REPL

# Help topics available:
# help instance, help get, help load, help send, help group,
# help check, help contact, help profile, help label, help catalog

# Regular commands (without 'miaw-cli' prefix)
get groups --limit 5
send text 6281234567890 "Hello"
check 6281234567890
```

### One-Shot Mode

Execute a single command and exit:

```bash
npx miaw-cli get groups --limit 10
npx miaw-cli send text 6281234567890 "Hello World"
npx miaw-cli check 6281234567890
```

## Global Flags

These flags work with any command:

| Flag | Description | Default |
|------|-------------|---------|
| `--instance-id <id>` | Specify instance ID | `default` |
| `--session-path <path>` | Session directory path | `./sessions-cli` |
| `--proxy <url>` | Proxy URL (http, https, socks4, socks5) | - |
| `--json` | Output as JSON instead of tables | - |
| `--debug` | Enable verbose logging | - |
| `--help` | Show help message | - |

**Examples:**

```bash
# Use specific instance
npx miaw-cli --instance-id my-bot get profile

# Custom session path
npx miaw-cli --session-path ./my-sessions get contacts

# Connect through a SOCKS5 proxy
npx miaw-cli --proxy socks5://proxy.example.com:1080 get groups

# Connect through an HTTP proxy with auth
npx miaw-cli --proxy http://user:pass@proxy.example.com:8080 send text 6281234567890 "Hello"

# JSON output
npx miaw-cli get groups --json

# Debug mode
npx miaw-cli --debug send text 6281234567890 "test"
```

## Commands

### Instance Management

Manage multiple WhatsApp instances.

#### List Instances

```bash
npx miaw-cli instance ls
```

**Output:**
```
📱 Instances (2):

  default [connected]
  my-bot [disconnected]
```

#### Show Instance Status

```bash
npx miaw-cli instance status [instance-id]
```

**Examples:**
```bash
# Show status of default instance
npx miaw-cli instance status

# Show status of specific instance
npx miaw-cli instance status my-bot
```

#### Create Instance

```bash
npx miaw-cli instance create <instance-id>
```

**Example:**
```bash
npx miaw-cli instance create my-bot
```

**Process:**
1. Creates new instance with given ID
2. Displays QR code
3. Scan with WhatsApp to authenticate
4. Session saved for future use

#### Delete Instance

```bash
npx miaw-cli instance delete <instance-id>
```

**Example:**
```bash
npx miaw-cli instance delete my-bot
```

#### Connect Instance

```bash
npx miaw-cli instance connect <instance-id>
```

#### Disconnect Instance

```bash
npx miaw-cli instance disconnect <instance-id>
```

#### Logout Instance

```bash
npx miaw-cli instance logout <instance-id>
```

Logs out and clears session data. Requires QR scan on next connect.

### Get Operations

Fetch data from WhatsApp.

#### Get Profile

```bash
npx miaw-cli get profile
```

**Output:**
```
👤 Your Profile
┌─────────────────┬──────────────────────────────────────────┐
│ Key             │ Value                                   │
├─────────────────┼──────────────────────────────────────────┤
│ phone           │ 6281234567890                           │
│ name            │ My Bot                                  │
│ isBusiness      │ true                                    │
└─────────────────┴──────────────────────────────────────────┘
```

#### Get Contacts

```bash
npx miaw-cli get contacts [--limit N]
```

**Examples:**
```bash
# Get all contacts
npx miaw-cli get contacts

# Get first 10 contacts
npx miaw-cli get contacts --limit 10

# JSON output
npx miaw-cli get contacts --json
```

**Output:**
```
📇 Contacts (150):

┌─────────────────────────┬─────────────────┬───────────────────┐
│ JID                     │ Phone           │ Name              │
├─────────────────────────┼─────────────────┼───────────────────┤
│ 6281234567890@s.whats... │ 6281234567890   │ John Doe          │
│ 6289876543210@s.whats... │ 6289876543210   │ Jane Smith        │
└─────────────────────────┴─────────────────┴───────────────────┘
```

#### Get Groups

```bash
npx miaw-cli get groups [--limit N]
```

**Examples:**
```bash
npx miaw-cli get groups --limit 5
npx miaw-cli get groups --json
```

**Output:**
```
👥 Groups (12):

┌─────────────────────────────┬───────────────────┬────────┬───────────────┐
│ JID                         │ Name              │ Members │ Description   │
├─────────────────────────────┼───────────────────┼────────┼───────────────┤
│ 1234567890@g.us             │ Family Group      │ 8      │ My family     │
│ 0987654321@g.us             │ Work Team         │ 25     │ Colleagues    │
└─────────────────────────────┴───────────────────┴────────┴───────────────┘
```

#### Get Chats

```bash
npx miaw-cli get chats [--limit N]
```

**Examples:**
```bash
npx miaw-cli get chats
npx miaw-cli get chats --limit 20
```

**Output:**
```
💬 Chats (45):

┌─────────────────────────┬───────────────┬─────────────┬────────┬───────────┐
│ JID                     │ Name          │ Type        │ Unread │ Archived  │
├─────────────────────────┼───────────────┼─────────────┼────────┼───────────┤
│ 6281234567890@s.whats... │ John Doe      │ Individual  │ 2      │ No        │
│ 1234567890@g.us         │ Family Group  │ Group       │ 0      │ No        │
└─────────────────────────┴───────────────┴─────────────┴────────┴───────────┘
```

#### Get Messages

```bash
npx miaw-cli get messages <jid> [--limit N]
```

**Examples:**
```bash
# Get messages from individual
npx miaw-cli get messages 6281234567890@s.whatsapp.net

# Get messages from group
npx miaw-cli get messages 1234567890@g.us

# Limit results
npx miaw-cli get messages 6281234567890@s.whatsapp.net --limit 10

# JSON output
npx miaw-cli get messages 6281234567890@s.whatsapp.net --json
```

**Output:**
```
💬 Messages from 6281234567890@s.whatsapp.net (25):

┌─────────────────┬──────────────────┬───────┬────────────────────────┬──────────┐
│ ID              │ From             │ Type  │ Text                   │ Time     │
├─────────────────┼──────────────────┼───────┼────────────────────────┼──────────┤
│ 3EB012345678... │ Me               │ text  │ Hello!                 │ 10:30:15 │
│ 3EB012345679... │ John Doe         │ text  │ Hi there!              │ 10:31:22 │
└─────────────────┴──────────────────┴───────┴────────────────────────┴──────────┘
```

#### Get Labels

```bash
npx miaw-cli get labels
```

**Note:** WhatsApp Business account required.

**Output:**
```
🏷️  Labels (5):

┌─────────────────────────┬───────────────┬────────┬───────────────┐
│ ID                      │ Name          │ Color  │ Color Name    │
├─────────────────────────┼───────────────┼────────┼───────────────┤
│ 1                       │ New Client    │ 0      │ Color1        │
│ 2                       │ Important     │ 1      │ Color2        │
└─────────────────────────┴───────────────┴────────┴───────────────┘
```

### Send Operations

Send messages and media.

#### Send Text Message

```bash
npx miaw-cli send text <phone> <message>
```

**Examples:**
```bash
# Simple text
npx miaw-cli send text 6281234567890 "Hello World"

# With quotes
npx miaw-cli send text 6281234567890 "Hello, how are you?"

# In REPL
send text 6281234567890 "Hi!"
```

**Output:**
```
📤 Sending text to 6281234567890...
✅ Message sent successfully
Message ID: 3EB0123456789@s.whatsapp.net_1234567890
```

#### Send Image

```bash
npx miaw-cli send image <phone> <path> [caption]
```

**Examples:**
```bash
# Send image
npx miaw-cli send image 6281234567890 ./photo.jpg

# With caption
npx miaw-cli send image 6281234567890 ./photo.jpg "Check this out!"
```

#### Send Document

```bash
npx miaw-cli send document <phone> <path> [caption]
```

**Examples:**
```bash
# Send PDF
npx miaw-cli send document 6281234567890 ./report.pdf

# With caption
npx miaw-cli send document 6281234567890 ./report.pdf "Monthly report"
```

#### Send Video

```bash
npx miaw-cli send video <phone> <path> [--caption <text>] [--gif] [--ptv]
```

**Options:**
- `--caption <text>` - Add caption to video
- `--gif` - Play as GIF (loops, no audio)
- `--ptv` - Send as video note (circular, like Telegram)

**Examples:**
```bash
# Send video with caption
npx miaw-cli send video 6281234567890 ./video.mp4 --caption "Check this out"

# Send as GIF (loops)
npx miaw-cli send video 6281234567890 ./short.mp4 --gif

# Send as video note (circular)
npx miaw-cli send video 6281234567890 ./selfie.mp4 --ptv
```

#### Send Audio

```bash
npx miaw-cli send audio <phone> <path> [--ptt]
```

**Options:**
- `--ptt` - Send as voice note (push-to-talk)

**Examples:**
```bash
# Send audio file
npx miaw-cli send audio 6281234567890 ./music.mp3

# Send as voice note
npx miaw-cli send audio 6281234567890 ./voice.ogg --ptt
```

### Media Operations

Download media from messages.

#### Download Media

```bash
npx miaw-cli media download <jid> <messageId> <output-path>
```

**Workflow:**
1. Use `get messages <jid>` to list messages and find message IDs
2. Copy the message ID of the media you want to download
3. Run `media download` with the JID, message ID, and output path

**Examples:**
```bash
# First, list messages to get IDs
npx miaw-cli get messages 6281234567890@s.whatsapp.net --limit 10

# Download a specific media message
npx miaw-cli media download 6281234567890@s.whatsapp.net 3EB0ABC123 ./photo.jpg

# Download from group
npx miaw-cli media download 120363012345678@g.us MSGID456 ./video.mp4
```

**Notes:**
- Only recently received messages with raw data can be downloaded
- Supports: image, video, audio, document, sticker
- Output directory will be created if it doesn't exist

### Group Operations

Manage WhatsApp groups.

#### Get Group Info

```bash
npx miaw-cli group info <jid>
```

**Example:**
```bash
npx miaw-cli group info 1234567890@g.us
```

**Output:**
```
👥 Group: Family Group
┌─────────────────┬──────────────────────────────────────────┐
│ Key             │ Value                                   │
├─────────────────┼──────────────────────────────────────────┤
│ jid             │ 1234567890@g.us                         │
│ name            │ Family Group                            │
│ participantCount │ 8                                       │
│ owner           │ 6281234567890@s.whatsapp.net            │
└─────────────────┴──────────────────────────────────────────┘
```

#### Get Group Participants

```bash
npx miaw-cli group participants <jid>
```

**Example:**
```bash
npx miaw-cli group participants 1234567890@g.us
```

**Output:**
```
👥 Participants (8):

┌─────────────────────────┬─────────────────┬───────────┐
│ JID                     │ Phone           │ Role      │
├─────────────────────────┼─────────────────┼───────────┤
│ 6281234567890@s.whats... │ 6281234567890   │ admin     │
│ 6289876543210@s.whats... │ 6289876543210   │ member    │
└─────────────────────────┴─────────────────┴───────────┘

Admins: 2
Members: 6
```

#### Get Group Invite Link

```bash
npx miaw-cli group invite-link <jid>
```

**Example:**
```bash
npx miaw-cli group invite-link 1234567890@g.us
```

**Output:**
```
🔗 Invite Link:
https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv
```

#### Create Group

```bash
npx miaw-cli group create <name> <phone1> <phone2> [...]
```

**Examples:**
```bash
# Create group with 2 participants
npx miaw-cli group create "My Team" 6281234567890 6289876543210

# Create group with more participants
npx miaw-cli group create "Project Team" \
  6281234567890 \
  6289876543210 \
  6285555555555 \
  6287777777777
```

**Note:** At least 2 participants required (you + 1 other).

### Utility Commands

#### Check Phone Numbers

Check if phone numbers are registered on WhatsApp.

```bash
npx miaw-cli check <phone1> [phone2] [...]
```

**Examples:**
```bash
# Check single number
npx miaw-cli check 6281234567890

# Check multiple numbers
npx miaw-cli check 6281234567890 6289876543210 6285555555555

# JSON output
npx miaw-cli check 6281234567890 --json
```

**Output:**
```
🔍 Checking 3 phone number(s)...

┌─────────────────┬───────────────┬──────────────────────────────┐
│ Phone           │ On WhatsApp   │ JID                          │
├─────────────────┼───────────────┼──────────────────────────────┤
│ 6281234567890   │ Yes           │ 6281234567890@s.whatsapp.net │
│ 6289876543210   │ Yes           │ 6289876543210@s.whatsapp.net │
│ 6285555555555   │ No            │ -                            │
└─────────────────┴───────────────┴──────────────────────────────┘

✅ 2/3 numbers are on WhatsApp
```

### Contact Operations

Manage and query contacts.

#### List Contacts

```bash
npx miaw-cli contact list [--limit N] [--filter <text>]
```

**Examples:**
```bash
# List all contacts
npx miaw-cli contact list

# Limit to 10 contacts
npx miaw-cli contact list --limit 10

# Filter by name or phone
npx miaw-cli contact list --filter john

# JSON output
npx miaw-cli contact list --json
```

**Output:**
```
📇 Contacts (150):

┌─────────────────────────┬─────────────────┬───────────────────┐
│ JID                     │ Phone           │ Name              │
├─────────────────────────┼─────────────────┼───────────────────┤
│ 6281234567890@s.whats... │ 6281234567890   │ John Doe          │
│ 6289876543210@s.whats... │ 6289876543210   │ Jane Smith        │
└─────────────────────────┴─────────────────┴───────────────────┘
```

#### Get Contact Info

```bash
npx miaw-cli contact info <phone>
```

**Example:**
```bash
npx miaw-cli contact info 6281234567890
```

**Output:**
```
📇 Contact Info
┌─────────────────┬──────────────────────────────────────────┐
│ Key             │ Value                                   │
├─────────────────┼──────────────────────────────────────────┤
│ jid             │ 6281234567890@s.whatsapp.net            │
│ phone           │ 6281234567890                           │
│ name            │ John Doe                                │
│ status          │ Available                               │
└─────────────────┴──────────────────────────────────────────┘
```

#### Get Business Profile

```bash
npx miaw-cli contact business <phone>
```

**Example:**
```bash
npx miaw-cli contact business 6281234567890
```

**Output:**
```
🏢 Business Profile
┌─────────────────┬──────────────────────────────────────────┐
│ Key             │ Value                                   │
├─────────────────┼──────────────────────────────────────────┤
│ jid             │ 6281234567890@s.whatsapp.net            │
│ description     │ Your trusted partner                    │
│ category        │ Retail                                  │
│ email           │ contact@business.com                    │
│ website         │ https://business.com                    │
└─────────────────┴──────────────────────────────────────────┘
```

**Note:** Returns error if the contact is not a business account.

#### Get Profile Picture

```bash
npx miaw-cli contact picture <phone> [--high]
```

**Parameters:**
- `--high`: Get high resolution picture (optional)

**Examples:**
```bash
# Get standard resolution
npx miaw-cli contact picture 6281234567890

# Get high resolution
npx miaw-cli contact picture 6281234567890 --high
```

**Output:**
```
✅ Profile Picture URL
https://pps.whatsapp.net/v/t61.24694-24/...
```

#### Add/Edit Contact

```bash
npx miaw-cli contact add <phone> <name> [--first <firstName>] [--last <lastName>]
```

**Parameters:**
- `phone`: Phone number in international format
- `name`: Full display name
- `--first`: First name (optional)
- `--last`: Last name (optional)

**Examples:**
```bash
# Add with full name
npx miaw-cli contact add 6281234567890 "John Doe"

# Add with first and last name
npx miaw-cli contact add 6281234567890 "John Doe" --first John --last Doe
```

**Output:**
```
✅ Contact saved: John Doe (6281234567890)
```

#### Remove Contact

```bash
npx miaw-cli contact remove <phone>
```

**Example:**
```bash
npx miaw-cli contact remove 6281234567890
```

**Output:**
```
✅ Contact removed: 6281234567890
```

### Profile Operations

Manage your own WhatsApp profile.

#### Set Profile Picture

```bash
npx miaw-cli profile picture set <path>
```

**Example:**
```bash
npx miaw-cli profile picture set ./avatar.jpg
```

**Output:**
```
✅ Profile picture updated
```

**Supported formats:** JPEG, PNG

#### Remove Profile Picture

```bash
npx miaw-cli profile picture remove
```

**Output:**
```
✅ Profile picture removed
```

#### Set Display Name

```bash
npx miaw-cli profile name set <name>
```

**Example:**
```bash
npx miaw-cli profile name set "My Bot"
```

**Output:**
```
✅ Profile name updated to: My Bot
```

#### Set Status/About Text

```bash
npx miaw-cli profile status set <status>
```

**Example:**
```bash
npx miaw-cli profile status set "Available 24/7"
```

**Output:**
```
✅ Profile status updated to: Available 24/7
```

### Label Commands (WhatsApp Business Only)

Manage labels for organizing chats.

#### Create Label

```bash
npx miaw-cli label add <name> <color>
```

**Parameters:**
- `name`: Label name
- `color`: Color number (0-19) or name (salmon, gold, yellow, mint, teal, cyan, sky, blue, purple, pink, rose, orange, lime, green, emerald, indigo, violet, magenta, red, gray)

**Examples:**
```bash
# Create with color number
npx miaw-cli label add "VIP Customer" 3

# Create with color name
npx miaw-cli label add "New Lead" blue
```

**Output:**
```
✅ Label created successfully
   Name: VIP Customer
   Color: 3 (mint)
   ID: 12345678901
```

#### Add Label to Chat

```bash
npx miaw-cli label chat add <jid> <labelId>
```

**Example:**
```bash
npx miaw-cli label chat add 6281234567890 12345678901
```

#### Remove Label from Chat

```bash
npx miaw-cli label chat remove <jid> <labelId>
```

**Example:**
```bash
npx miaw-cli label chat remove 6281234567890 12345678901
```

### Catalog Commands (WhatsApp Business Only)

Manage product catalog.

#### List Products

```bash
npx miaw-cli catalog list [--phone <phone>] [--limit <n>] [--cursor <cursor>]
```

**Parameters:**
- `--phone`: Business phone number (optional, defaults to your own catalog)
- `--limit`: Max products to fetch (default: 10)
- `--cursor`: Pagination cursor for next page

**Examples:**
```bash
# List your products
npx miaw-cli catalog list

# List with limit
npx miaw-cli catalog list --limit 20

# View another business's catalog
npx miaw-cli catalog list --phone 6281234567890

# JSON output
npx miaw-cli catalog list --json
```

**Output:**
```
📦 Catalog Products (5):

┌──────────────────────┬────────────────────────┬─────────────┬────────┐
│ ID                   │ Name                   │ Price       │ Hidden │
├──────────────────────┼────────────────────────┼─────────────┼────────┤
│ 1234567890           │ Product A              │ 50000 IDR   │ No     │
│ 1234567891           │ Product B              │ 75000 IDR   │ No     │
└──────────────────────┴────────────────────────┴─────────────┴────────┘

📄 More products available. Use --cursor abc123...
```

#### List Collections

```bash
npx miaw-cli catalog collections [--phone <phone>] [--limit <n>]
```

**Examples:**
```bash
npx miaw-cli catalog collections
npx miaw-cli catalog collections --limit 10
```

**Output:**
```
📁 Collections (3):

┌──────────────────────┬────────────────────────┬──────────┐
│ ID                   │ Name                   │ Products │
├──────────────────────┼────────────────────────┼──────────┤
│ 1234567890           │ New Arrivals           │ 5        │
│ 1234567891           │ Best Sellers           │ 10       │
└──────────────────────┴────────────────────────┴──────────┘
```

#### Create Product

```bash
npx miaw-cli catalog product create <name> <description> <price> <currency> [options]
```

**Required Parameters:**
- `name`: Product name
- `description`: Product description
- `price`: Product price (number)
- `currency`: Currency code (e.g., IDR, USD, EUR)

**Options:**
- `--image <path>`: Path to product image
- `--url <url>`: Product landing page URL
- `--retailerId <id>`: Your internal SKU/product ID
- `--hidden`: Mark product as hidden

**Examples:**
```bash
# Basic product
npx miaw-cli catalog product create "T-Shirt" "Cotton t-shirt, size M" 50000 IDR

# With image
npx miaw-cli catalog product create "T-Shirt" "Cotton t-shirt" 50000 IDR --image ./tshirt.jpg

# With all options
npx miaw-cli catalog product create "T-Shirt" "Cotton t-shirt" 50000 IDR \
  --image ./tshirt.jpg \
  --url https://mystore.com/tshirt \
  --retailerId SKU-001
```

**Output:**
```
✅ Product created successfully
   ID: 1234567890
   Name: T-Shirt
   Price: 50000 IDR
```

#### Update Product

```bash
npx miaw-cli catalog product update <productId> [options]
```

**Options:**
- `--name <name>`: New product name
- `--description <desc>`: New description
- `--price <price>`: New price
- `--currency <currency>`: New currency
- `--image <path>`: New product image
- `--url <url>`: New URL
- `--retailerId <id>`: New retailer ID
- `--hidden`: Mark as hidden

**Examples:**
```bash
# Update price
npx miaw-cli catalog product update 1234567890 --price 60000

# Update multiple fields
npx miaw-cli catalog product update 1234567890 --name "New T-Shirt" --price 55000
```

#### Delete Products

```bash
npx miaw-cli catalog product delete <productId> [productId...]
```

**Examples:**
```bash
# Delete single product
npx miaw-cli catalog product delete 1234567890

# Delete multiple products
npx miaw-cli catalog product delete 1234567890 1234567891 1234567892
```

**Output:**
```
✅ Products deleted successfully
   Deleted: 3 product(s)
```

## Phone Number Format

Use international format without `+` or leading zeros:

| Format | Valid | Example |
|--------|-------|---------|
| International without + | ✅ | `6281234567890` |
| International with + | ❌ | `+6281234567890` |
| With leading zeros | ❌ | `081234567890` |
| With spaces/dashes | ❌ | `628-1234-567890` |

**Indonesian format example:**
- `081234567890` → `6281234567890` ✅

## Session Management

### Session Persistence

Sessions are automatically saved and reused:
- First use: QR code scan required
- Subsequent uses: Auto-connects (no QR needed)

### Session Location

```
./sessions-cli/<instance-id>/
├── creds.json
└── keys/
```

### Clearing Sessions

To force QR scan again:
```bash
# Logout and clear session
npx miaw-cli instance logout <instance-id>

# Or delete instance
npx miaw-cli instance delete <instance-id>
```

## Environment Variables

Configure defaults via environment variables:

```bash
# .env file
MIAW_INSTANCE_ID=my-bot
MIAW_SESSION_PATH=./my-sessions
```

Or set inline:
```bash
MIAW_INSTANCE_ID=bot1 npx miaw-cli get profile
```

## Common Workflows

### First-Time Setup

```bash
# 1. Create instance
npx miaw-cli instance create my-bot

# 2. Scan QR code when prompted

# 3. Verify connection
npx miaw-cli instance status my-bot

# 4. Get profile
npx miaw-cli --instance-id my-bot get profile
```

### Daily Operations

```bash
# Check messages
npx miaw-cli get chats --limit 10

# Send messages
npx miaw-cli send text 6281234567890 "Good morning!"

# Check group activity
npx miaw-cli get messages 1234567890@g.us --limit 20
```

### Batch Operations

```bash
# Check multiple numbers
npx miaw-cli check \
  6281234567890 \
  6289876543210 \
  6285555555555 \
  6287777777777

# Get data as JSON for scripting
npx miaw-cli get contacts --json > contacts.json

# Filter groups by size (example)
npx miaw-cli get groups --json | jq '.[] | select(.participantCount > 50)'
```

## Tips and Tricks

1. **Use JSON for scripting:** Combine `--json` with `jq` for data processing
2. **Interactive mode:** Use REPL for multiple operations without re-authenticating
3. **Multiple instances:** Use separate instances for different WhatsApp numbers
4. **Session backup:** Copy session directory to backup authenticated sessions
5. **Debug issues:** Use `--debug` flag to see verbose logs

## Troubleshooting

### QR Code Not Scanning

- Ensure WhatsApp is open on your phone
- Check network connection
- Try restarting the CLI

### Session Expired

```bash
# Clear and re-authenticate
npx miaw-cli instance logout default
npx miaw-cli instance connect default
```

### Command Not Found

```bash
# Use npx to ensure latest version
npx miaw-cli --help

# Or reinstall miaw-core
npm install miaw-core@latest
```

## Comparison: CLI vs Programmatic

| Aspect | CLI | Programmatic |
|--------|-----|--------------|
| **Use case** | Quick tasks, testing | Production bots |
| **Complexity** | Simple | Full control |
| **Automation** | Shell scripts | JavaScript/TypeScript |
| **Event handling** | No | Yes (message events) |
| **Custom logic** | Limited | Unlimited |

## See Also

- [Usage Guide](./USAGE.md) - Programmatic API usage
- [Examples](../examples/) - Code examples
- [Roadmap](./ROADMAP.md) - Planned features
