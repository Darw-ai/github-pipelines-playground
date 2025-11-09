# GitHub App Setup Guide

This guide walks you through creating and configuring a GitHub App for the SDLC Platform.

## Why a GitHub App?

GitHub Apps provide:
- ✅ **Fine-grained permissions**: Only request what you need
- ✅ **Installation-based auth**: Works across organizations
- ✅ **Higher rate limits**: 5,000 req/hour per installation
- ✅ **OAuth for users**: Authenticate web UI users
- ✅ **Audit trail**: All actions logged

## Step-by-Step Setup

### Step 1: Create the GitHub App

1. **Go to GitHub Settings**:
   - For personal account: https://github.com/settings/apps/new
   - For organization: https://github.com/organizations/YOUR-ORG/settings/apps/new

2. **Fill in Basic Information**:

   | Field | Value |
   |-------|-------|
   | **GitHub App name** | `My SDLC Platform` (must be unique globally) |
   | **Homepage URL** | `https://github.com/YOUR-ORG/github-pipelines-playground` |
   | **Description** | `AI-powered SDLC automation platform` |

3. **Callback URL** (for OAuth):
   - If deploying Platform Hub: `https://your-hub.vercel.app/api/auth/callback/github`
   - If not using Platform Hub: Leave blank

4. **Setup URL** (optional):
   - Leave blank

5. **Webhook**:
   - ⬜ Uncheck "Active" (webhooks not needed for this platform)

### Step 2: Set Permissions

#### Repository Permissions

Set these permissions (under "Repository permissions"):

| Permission | Access | Why |
|------------|--------|-----|
| **Contents** | Read & Write | Create branches, commit code, push fixes |
| **Issues** | Read & Write | Create tracking issues, update status |
| **Pull requests** | Read & Write | Create PRs for scaffolds and fixes |
| **Workflows** | Read & Write | Dispatch workflows via API |
| **Metadata** | Read-only | (Auto-selected, required) |

#### User Permissions

| Permission | Access | Why |
|------------|--------|-----|
| **Email addresses** | Read-only | Get user email for OAuth |

#### Organization Permissions

None required.

### Step 3: Subscribe to Events

**No events needed** - uncheck all webhook events.

### Step 4: Installation

**Where can this GitHub App be installed?**
- ⚪ Any account (public app - anyone can install)
- 🔘 Only on this account (private app - recommended)

Select **"Only on this account"** for security.

### Step 5: Create the App

Click **"Create GitHub App"**.

### Step 6: Save Credentials

After creation, you'll be redirected to the app settings page. **Save these immediately**:

#### 1. App ID

Found at the top of the page:
```
App ID: 123456
```

Save this as `GITHUB_APP_ID`.

#### 2. Client ID

Found in "OAuth credentials" section:
```
Client ID: Iv1.abc123def456
```

Save this as `GITHUB_CLIENT_ID`.

#### 3. Client Secret

1. Click "Generate a new client secret"
2. **Copy immediately** (shown only once)
3. Save as `GITHUB_CLIENT_SECRET`

#### 4. Private Key

1. Scroll to "Private keys" section
2. Click "Generate a private key"
3. A `.pem` file downloads
4. Open the file and copy contents:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   MIIEpAIBAAKCAQEA...
   ...
   -----END RSA PRIVATE KEY-----
   ```
5. Save as `GITHUB_APP_PRIVATE_KEY`

**⚠️ IMPORTANT**: Keep this private key secure! It's like a password.

### Step 7: Install the App on Your Repository

1. Go to the app page: https://github.com/settings/apps/YOUR-APP
2. Click "Install App" in the left sidebar
3. Click "Install" next to your account/organization
4. Select repository access:
   - ⚪ All repositories (not recommended)
   - 🔘 Only select repositories
     - Select: `github-pipelines-playground` (or your repo)
5. Click "Install"

### Step 8: Verify Installation

```bash
# Using GitHub CLI
gh api /repos/YOUR-ORG/YOUR-REPO/installation

# You should see:
# {
#   "id": 12345678,
#   "app_id": 123456,
#   ...
# }
```

## Configuration for Platform Hub

Create `.env.local` in `platform-hub/`:

```env
# From Step 6
GITHUB_APP_ID=123456
GITHUB_CLIENT_ID=Iv1.abc123def456
GITHUB_CLIENT_SECRET=your_client_secret_here

# Private key (escape newlines)
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n...\n-----END RSA PRIVATE KEY-----"

# For NextAuth
NEXTAUTH_URL=http://localhost:3000  # Change for production
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

**Tip for GITHUB_APP_PRIVATE_KEY**:
```bash
# Convert multiline key to single line with \n
cat downloaded-key.pem | awk '{printf "%s\\n", $0}'
```

## Configuration for Vercel

If deploying Platform Hub to Vercel:

```bash
vercel env add GITHUB_APP_ID
# Paste: 123456

vercel env add GITHUB_CLIENT_ID
# Paste: Iv1.abc123def456

vercel env add GITHUB_CLIENT_SECRET
# Paste: your_secret

vercel env add GITHUB_APP_PRIVATE_KEY
# Paste the entire private key (with \n escapes)

vercel env add NEXTAUTH_SECRET
# Paste: $(openssl rand -base64 32)
```

## Testing the GitHub App

### Test 1: Authentication

```bash
cd platform-hub
npm install
npm run dev

# Open http://localhost:3000
# Click "Sign in with GitHub"
# Authorize the app
# You should be redirected back
```

### Test 2: API Access

```bash
# Test creating an issue via the app
node test-github-app.js
```

Create `test-github-app.js`:
```javascript
const { App } = require('@octokit/app');

const app = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
});

async function test() {
  const octokit = await app.getInstallationOctokit(INSTALLATION_ID);

  const issue = await octokit.rest.issues.create({
    owner: 'YOUR-ORG',
    repo: 'YOUR-REPO',
    title: 'Test from GitHub App',
    body: 'This is a test issue created by the GitHub App',
  });

  console.log('Created issue:', issue.data.html_url);
}

test();
```

## Troubleshooting

### Error: "App not installed"

**Solution**: Install the app on your repository (Step 7).

### Error: "Bad credentials"

**Possible causes**:
1. Wrong App ID
2. Wrong private key
3. Private key formatting (must have `\n` escaped)

**Fix**: Double-check `.env.local` values.

### Error: "Resource not accessible by integration"

**Solution**: Check app permissions (Step 2). You may need to:
1. Go to app settings
2. Update permissions
3. Accept new permissions in the repository

### Callback URL mismatch

**Error**: `redirect_uri_mismatch`

**Fix**:
1. Go to app settings
2. Update "Callback URL" to match your deployment URL
3. Format: `https://your-hub.vercel.app/api/auth/callback/github`

### Private key format issues

The private key must be:
- A single string
- Newlines escaped as `\n`
- Wrapped in quotes

**Correct**:
```env
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n...\n-----END RSA PRIVATE KEY-----"
```

**Incorrect**:
```env
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIE...
...
-----END RSA PRIVATE KEY-----"
```

## Security Best Practices

### Private Key Security

✅ **DO**:
- Store in encrypted secrets (GitHub Secrets, Vercel Env Vars)
- Rotate regularly (generate new key every 6-12 months)
- Restrict access (only necessary services)
- Use environment variables (never commit)

❌ **DON'T**:
- Commit to Git
- Share in Slack/email
- Store in plain text files
- Use in client-side code

### Permissions

✅ **Principle of Least Privilege**:
- Only request permissions you need
- Review periodically
- Remove unused permissions

### Monitoring

Set up alerts for:
- Failed authentication attempts
- Unusual API usage
- Permission changes

## Next Steps

✅ [Continue with SETUP.md](SETUP.md) - Complete platform setup

✅ [Configure OIDC](OIDC_SETUP.md) - Set up cloud access

✅ [Deploy Platform Hub](../platform-hub/README.md) - Deploy the web UI

---

**Questions?** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or open an issue.
