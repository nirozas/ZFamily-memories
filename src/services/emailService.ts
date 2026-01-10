export const emailService = {
    /**
     * Generates and opens a pre-filled invitation email using the system's mail client.
     */
    sendInviteEmail: (email: string, inviteCode: string, familyName: string = 'Our Family') => {
        const subject = encodeURIComponent(`You're invited to join the ${familyName} Heritage Catalog`);
        const body = encodeURIComponent(
            `Hello!\n\n` +
            `You have been invited to join our family's digital heritage catalog on Zoabi Family Records.\n\n` +
            `Your Invitation Code: ${inviteCode}\n\n` +
            `How to join:\n` +
            `1. Visit our website.\n` +
            `2. Go to the Sign Up page.\n` +
            `3. Enter your details and paste the invitation code above.\n\n` +
            `We can't wait to share our family stories with you!\n\n` +
            `Best regards,\n` +
            `${familyName} Team`
        );

        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    }
};
