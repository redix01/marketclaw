<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DepositProofSubmitted extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public float $amount,
        public string $walletName,
        public string $walletNetwork,
        public string $walletAddress,
        public ?string $transactionReference,
        public ?string $notes,
        public float $currentCashBalance,
        public string $proofPath,
        public string $proofOriginalName,
        public string $proofMimeType,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New deposit proof submitted by '.$this->user->email,
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'emails.deposit-proof-submitted',
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromPath($this->proofPath)
                ->as($this->proofOriginalName)
                ->withMime($this->proofMimeType),
        ];
    }
}
