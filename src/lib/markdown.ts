export const parseMarkdown = (text: string) => {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic text-gray-200">$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#3aa3eb] border-b border-[#3aa3eb]/30 hover:border-[#3aa3eb] transition-all">$1</a>');
};
