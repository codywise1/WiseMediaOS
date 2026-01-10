export const parseMarkdown = (text: string) => {
    if (!text) return '';
    return text
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-white mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-6 mb-3">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>')
        .replace(/^\- (.*$)/gim, '<li class="ml-4 text-gray-300">$1</li>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic text-gray-200">$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#3aa3eb] border-b border-[#3aa3eb]/30 hover:border-[#3aa3eb] transition-all">$1</a>')
        .replace(/^\-\-\-$/gm, '<hr class="my-6 border-white/10" />')
        .replace(/\n\n/g, '<br /><br />');
};
