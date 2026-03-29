

## Customizing OAuth Sign-In Page Branding

The Google/Apple sign-in pages currently show Lovable branding because they use Lovable's **managed OAuth credentials**. To display "Barakaz" branding on those pages, you need to use your **own OAuth credentials**.

### Steps

1. **Google OAuth** — Create your own OAuth Client ID in the [Google Cloud Console](https://console.cloud.google.com/):
   - Set up a consent screen with "Barakaz" as the app name and your logo
   - Add authorized redirect URL from Lovable Cloud's Auth Settings
   - Enter your Client ID and Secret in **Cloud → Users → Auth Settings → Google**

2. **Apple OAuth** — Register your own Services ID in the [Apple Developer Portal](https://developer.apple.com/):
   - Configure the service with "Barakaz" branding
   - Enter credentials in **Cloud → Users → Auth Settings → Apple**

Once your own credentials are configured, the OAuth consent screens will show "Barakaz" instead of "Lovable".

No code changes are needed — the `lovable.auth.signInWithOAuth()` calls will automatically use your custom credentials once configured in Cloud settings.

<lov-actions>
  <lov-open-backend>Open Cloud Auth Settings</lov-open-backend>
  <lov-suggestion message="I've set up my own Google OAuth credentials in Cloud Auth Settings. Please verify the Google sign-in flow works correctly.">Test Google sign-in after setup</lov-suggestion>
  <lov-suggestion message="I've set up my own Apple OAuth credentials in Cloud Auth Settings. Please verify the Apple sign-in flow works correctly.">Test Apple sign-in after setup</lov-suggestion>
</lov-actions>

