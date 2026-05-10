A new deposit request has been submitted.

User: {{ $user->name }}
Email: {{ $user->email }}
User ID: {{ $user->getKey() }}
Requested Amount: ${{ number_format($amount, 2) }}
Wallet: {{ $walletName }}
Network: {{ $walletNetwork }}
Wallet Address: {{ $walletAddress }}
Transaction Reference: {{ $transactionReference ?: 'N/A' }}
Notes: {{ $notes ?: 'N/A' }}
Current Cash Balance: ${{ number_format($currentCashBalance, 2) }}
