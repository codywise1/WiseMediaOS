/**
 * Format a phone number to +1 (000) 000-0000 format
 * @param phone - The phone number string to format
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
    if (!phone) return '';

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Handle different digit lengths
    if (digits.length === 10) {
        // 10 digits: assume US number, add +1
        return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
        // 11 digits starting with 1: format as +1 (xxx) xxx-xxxx
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length > 11) {
        // More than 11 digits: assume it has country code
        const countryCode = digits.slice(0, digits.length - 10);
        const areaCode = digits.slice(digits.length - 10, digits.length - 7);
        const firstPart = digits.slice(digits.length - 7, digits.length - 4);
        const secondPart = digits.slice(digits.length - 4);
        return `+${countryCode} (${areaCode}) ${firstPart}-${secondPart}`;
    }

    // If it doesn't match expected patterns, return original
    return phone;
}
