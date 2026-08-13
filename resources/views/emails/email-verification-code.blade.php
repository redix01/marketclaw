<p>Hello {{ $user->name }},</p>

<p>Your MarketClaw verification code is:</p>

<p style="font-size: 28px; font-weight: 700; letter-spacing: 0.24em; margin: 16px 0;">
    {{ $code }}
</p>

<p>This code expires in {{ $expiresInMinutes }} minutes.</p>

<p>If you did not create this account, you can ignore this email.</p>
